var Api	=	new Class({
	// the base url all resources are pulled from (NEVER a trailing slash!)
	// NOTE: this must be set by the app
	api_url:		null,
	api_key:		null,

	user:			false,

	// override this function to determine which callback gets called on a JSONP
	// return. normall this is done by analyzing the response. the default is to
	// always run "success" since nothing EVER goes wrong anyway, ever (at least
	// not when WE program it).
	cb_wrap:	function(cb_success, cb_fail)
	{
		return function(data)
		{
			cb_success(data);
		};
	},

	initialize: function(url, key, cb_wrap)
	{
		this.api_url		=	url;
		this.api_key		=	key;
		this.cb_wrap		=	cb_wrap;
		// JS hax LAWL omgawrsh gawrsh shhwarshhrwsh
		this['delete']		=	function()
		{
			alert('api.delete() is deprecated and broken in MANY browsers ("delete" is a reserved word in JS). Please use api._delete() instead.');
		};
	},

	set_api_key: function(key)
	{
		this.api_key	=	key;
	},

	set_auth: function(auth_key)
	{
		if(!auth_key) return false;

		this.user = {
			auth_key: auth_key
		};
	},

	clear_auth: function()
	{
		this.user	=	false;
	},

	// HTTP status after a call is made
	status:		null,

	// error object populated when there is an error
	error: 		{
		code:	null,
		msg:	null,
		field:	null
	},

	// set to true to get debug info
	debug:		false,

	// request id counter
	requests:	0,

	get: function(resource, data, params) { return this._call(this.api_url, 'GET', resource, data, params); },
	post: function(resource, data, params) { return this._call(this.api_url, 'POST', resource, data, params); },
	put: function(resource, data, params) { return this._call(this.api_url, 'PUT', resource, data, params); },
	_delete: function(resource, data, params) { return this._call(this.api_url, 'DELETE', resource, data, params); },	// BAH JS-annoyingness

	_call: function(api_url, method, resource, data, params)
	{
		data || (data = {});
		params || (params = {});

		var cb_success	=	typeof(params['success']) == 'undefined' ? function() {} : params['success'];
		var cb_fail		=	typeof(params['error']) == 'undefined' ? function() {} : params['error'];

		// should we auth to the server? we don't want to unless we have to
		var send_auth	=	this.test_auth_needed(method, resource);

		var url	=	api_url + '/' + resource.replace(/^\//, '');

		if(!['post', 'get'].contains(method.toLowerCase()))
		{
			// add method GET var (MUST be GET (Wookie restriction))
			if(url.match(/\?/))
				url += '&_method='+method;
			else
				url += '?_method='+method;
		}

		var request	=	{
			url: url,
			method: (method.toLowerCase() == 'get' ? 'GET' : 'POST'),
			emulation: false,
			headers: {},
			data: data,
			onSuccess: function(res)
			{
				var data	=	JSON.decode(res);
				cb_success(data);
			},
			onFailure: function(xhr)
			{
				var err	=	JSON.decode(xhr.responseText);
				cb_fail(err);
			},
			evalScripts: false,
			evalResponse: false
		};

		if(this.user && send_auth)
		{
			request.headers['X-Auth-Api-Key']	=	this.api_key;

			//request.user		=	this.user.email;
			//request.password	=	this.user.password;
			request.headers['Authorization']	=	'Basic ' + Base64.encode('user:' + this.user.auth_key);
		}

		//var user_cookie	=	Cookie.read(config.user_cookie);
		//Cookie.dispose(config.user_cookie);
		new Request(request).send();
		//if(user_cookie) Cookie.write(config.user_cookie, user_cookie);

		return url;
	},

	// NOTE: deprecated in favor of _call() which uses real ajax
	//
	// TODO: whether using JSONP or regular AJAX requests, this still deals only
	// with the api wrapper in the api side. for a small performance/operations
	// boost, it may be benefitial to rewrite non-JSONP calls to use the actual API
	// instead.
	__call: function(api_url, method, resource, data, params)
	{
		data || (data = {});
		params || (params = {});
		var cb_success	=	typeof(params['success']) == 'undefined' ? function() {} : params['success'];
		var cb_fail		=	typeof(params['error']) == 'undefined' ? function() {} : params['error'];

		var send_auth	=	this.test_auth_needed(method, resource);
		if(send_auth && !this.user)
		{
			// TODO: should we stop the request and send the error or not let 
			// the frontend make decisions like this? for now, we make the
			// request and let the api tell us it's bad (ie do nothing here).
		}

		var request	=	{
			key:		this.api_key,
			resource:	resource,
			method:		method,
			data:		JSON.encode(data)
		};

		if(this.user && send_auth)
		{
			request['user']	=	this.user.email;
			if(this.user.auth_key)
			{
				request['auth_key']	=	this.user.auth_key;
			}
			else
			{
				request['pass']	=	this.user.password;
			}
		}

		// if the api URL is non-local, send via JSONP
		var use_jsonp	=	this.api_url.match(/^https?:\/\//) ? true : false;

		// debugging stuff
		var url	=	api_url + '?' + this.qs_serialize(request);
		console.log((use_jsonp ? 'JSONP' : 'AJAX')+' call: ' + url.replace(/pass=[^&]+/, 'pass=****'));

		var cb_wrap	=	this.cb_wrap(cb_success, cb_fail);

		// return the request
		var options	=	{
			url: api_url,
			callbackKey: 'callback',
			data: request,
			onComplete: cb_wrap
		};

		if(use_jsonp)
		{
			var request	=	new Request.JSONP(options).send();
		}
		else
		{
			options.method	=	method.toLowerCase() == 'get' ? 'get' : 'post';
			var request		=	new Request(options).send();
		}

		return request;
	},

	// given a method and resource (and also config.auth in /config/auth.js),
	// determine if authentication is needed to access this resource
	test_auth_needed: function(method, resource)
	{
		if(['POST', 'PUT', 'DELETE'].contains(method))
		{
			var auth	=	true;
		}
		else
		{
			var auth	=	false;
		}

		for(var i = 0; i < config.auth.length; i++)
		{
			var entry	=	config.auth[i];
			var regex	=	'/^' + entry.resource.replace(/\//g, '\\\/') + '$/';
			match		=	eval(regex).exec(resource);
			if(match && entry.method.toUpperCase() == method)
			{
				if(!auth && entry.auth) auth = true;
				else if(auth && !entry.auth) auth = false;
				// first match wins
				break;
			}
		};
		//if (auth) console.log('auth needed: '+method+' '+resource);
		return auth;
	},

	// given a response from the api, process it and run any callbacks
	is_error: function(data)
	{
		if(typeof(data.status) != 'undefined')
		{
			return true;
		}
		return false;
	},

	qs_serialize: function(obj, prefix)
	{
		var str = [];
		for(var p in obj)
		{
			var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
			str.push(typeof v == "object" ? 
			this.qs_serialize(v, k) :
			encodeURIComponent(k) + "=" + encodeURIComponent(v));
		}
		return str.join("&");
	}
});

