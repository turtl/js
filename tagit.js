// MT1.11 Compat - who the fuck would remove these??
//
// $(this.main_container_selector).set('html', '');
var $E = function(selector, filter){ return ($(filter) || document).getElement(selector); };
var $ES = function(selector, filter){ return ($(filter) || document).getElements(selector); };

var tagit	=	{
	site_url: null,

	// base window title
	base_window_title: 'tag.it',

	// holds the user model
	user: null,

	// holds the DOM object that tagit does all of its operations within
	main_container_selector: '#main',

	// a place to reference composer controllers by name
	controllers: {},

	// global key handler for attaching keyboard events to the app
	keyboard: null,

	loaded: false,
	router: false,

	// holds the last url we routed to
	last_url: null,

	// tells the pages controller whether or not to scroll to the top of the
	// window after a page load
	scroll_to_top: true,

	init: function()
	{
		this.initial_load();
	},

	initial_load: function()
	{
		if(this.loaded)
		{
			return false;
		}

		// just clear everything out to get rid of scraped content (we don't
		// really care about it once the JS loads).
		var _main = $E(this.main_container_selector);
		if(_main) _main.set('html', '');

		// create the user model
		this.user || (this.user = new User());

		// update the user_profiles collection on login
		this.user.bind('login', function() {
			// if the user is logged in, we'll put their auth info into the api object
			this.user.bind('change', this.user.write_cookie.bind(this.user), 'user:write_changes_to_cookie');
			this.api.set_auth(this.user.get_auth());
		}.bind(this));
		this.user.bind('logout', function() {
			this.user.unbind('change', 'user:write_changes_to_cookie');
			modal.close();
		}.bind(this));

		// if a user exists, log them in
		this.user.login_from_cookie();

		// load the global keyboard handler
		this.keyboard	=	new Composer.Keyboard({meta_bind: true});

		this.load_controller('HeaderBar', HeaderBarController, {}, {});

		this.loaded	=	true;
		if(History.enabled)
		{
			var initial_route	=	window.location.pathname+window.location.search;
			if(initial_route == '/' && window.location.hash.match(/^#!\//))
			{
				initial_route	=	new String(window.location.hash).replace(/^[#!]+/, '');
			}
		}
		else
		{
			var initial_route	=	window.location.hash != '' ? window.location.hash : window.location.pathname;
		}
		this.route(initial_route);
	},

	load_controller: function(name, controller, params, options)
	{
		options || (options = {});

		if(this.controllers[name]) return this.controllers[name];

		// lol this is my comment.
		this.controllers[name]	=	new controller(params, options);
		return this.controllers[name];
	},

	loading: function(show)
	{
		var show = show ? true : false;
		var fn = show ? 'addClass' : 'removeClass';
		$E('html')[fn]('loading');
		$$('img.loading').each(function(el) {
			if(show)	el.setStyle('visibility', 'visible');
			else		el.setStyle('visibility', '');
		});
	},

	unload: function()
	{
		this.loaded			=	false;
		Object.each(this.controllers, function(controller) {
			controller.release();
		});
		this.controllers	=	{};
	},

	setup_router: function(options)
	{
		options || (options = {});

		if(!this.router)
		{
			options	=	Object.merge({
				// we'll process our own QS, THXLOLOLOLOLOLOLOLOLOLOLOLOLOLOL!!!
				process_querystring: false,

				// we'll do our own first route
				suppress_initial_route: true,

				enable_cb: function(url)
				{
					// make sure if we are going from PAGE + MODAL -> PAGE, we dont reload PAGE's controller
					var url	=	url + window.location.search;
					var last_base_url	=	tagit.last_url ? tagit.last_url.replace(/\-\-.*/) : null;
					return this.loaded && last_base_url != url;
				}.bind(this),
				on_failure: function(obj)
				{
					console.log('route failed:', obj);
				}.bind(this)
			}, options);
			this.router	=	new Composer.Router(config.routes, options);
			this.router.bind_links({
				filter_trailing_slash: true,
				do_state_change: function(a_tag)
				{
					path			=	new String(a_tag.get('href'));
					path.rewrite	=	function(str) {
						this._string_value	=	str;
					}.bind(path);
					path.rewrite(null);
					tagit.controllers.pages.trigger('onroute', path);
					//tagit.controllers.pages.on_route(path);
					//if(path._string_value) a_tag.set('href', path._string_value);
					return true;
				}
			});
			this.router.register_callback(this.route_callback.bind(this));
			this.router.bind('preroute', function(url) {
				this.controllers.pages.trigger('preroute', url);
			}.bind(this));
		}
	},

	route: function(url, options)
	{
		options || (options = {});
		this.setup_router(options);
		if(
			!this.user.logged_in &&
			!url.match(/\/users\/login/) &&
			!url.match(/\/users\/join/) &&
			!url.match(/\/bookmark/)
		)
		{
			url = '/users/login';
		}
		this.router.route(url, options);
	},

	route_callback: function(url)
	{
		this.last_url	=	url + window.location.search;
		this.controllers.pages.trigger('route', url);
	},

	set_title: function(title)
	{
		title	=	title.clean().replace(eval('/(\\s*\\|\\s*'+(tagit.base_window_title).escapeRegExp()+')*(\\s*\\|)?$/g'), '');
		if(title == '') title = this.base_window_title;
		else title = title + ' | ' + this.base_window_title;
		document.title	=	title;
	},

	prepend_title: function(prepend)
	{
		prepend	=	prepend.clean();
		if(prepend == '') return false;
		title	=	document.title;
		document.title	=	prepend + ' | ' + title;
	}
};

var modal		=	null;
var barfr		=	null;
var markdown	=	null;

window.addEvent('domready', function() {
	window._header_tags		=	[];
	tagit.main_container	=	$E(tagit.main_container_selector);
	tagit.site_url			=	__site_url;
	tagit.base_window_title	=	document.title.replace(/.*\|\s*/, '');
	tagit.api				=	new Api(
		__api_url,
		__api_key,
		function(cb_success, cb_fail) {
			return function(data)
			{
				if(typeof(data) == 'string')
				{
					data	=	JSON.decode(data);
				}
				if(data.__error) cb_fail(data.__error);
				else cb_success(data);
			};
		}
	);

	// make sure inline templates are loaded
	Template.initialize();

	// create the modal object
	modal	=	new modal_interface({
		width: 750,
		// stick it in #wrap instead of body, which fixes various problems with
		// controllers expecting wrap to be there (for instance, the Likes
		// controller).
		entry_element: '#wrap',
		overlay: true,
		load_icon: img('/images/site/icons/load_42x11.gif')	// not that it's needed anymore...
	});
	modal.addEvent('complete', function() {
		var footer = $E('#footer');
		if(footer) footer.setStyle('visibility', 'hidden');
	});
	modal.addEvent('close', function () {
		var footer = $E('#footer');
		if(footer) footer.setStyle('visibility', '');
	});

	// create the barfr
	barfr	=	new Barfr('barfr', {});

	// create markdown converter
	markdown = new Markdown.Converter();
	markdown.toHTML = markdown.makeHtml;
	
	tagit.load_controller('pages', PagesController);

	// fucking load, tagit
	tagit.init.delay(50, tagit);
});

// couldn't be simpler
Composer.sync	=	function(method, model, options)
{
	options || (options = {});
	if(options.skip_sync) return;
	switch(method)
	{
	case 'create':
		var method	=	'post'; break;
	case 'read':
		var method	=	'get'; break;
	case 'update':
		var method	=	'put'; break;
	case 'delete':
		var method	=	'_delete'; break;
	default:
		console.log('Bad method passed to Composer.sync: '+ method);
		return false;
	}

	var data	=	model.toJSON();
	if(options.subset)
	{
		var newdata	=	{};
		for(x in data)
		{
			if(!options.subset.contains(x)) continue;
			newdata[x]	=	data[x];
		}
		data	=	newdata;
	}
	tagit.api[method](model.get_url(), {data: data}, {
		success: options.success,
		error: options.error
	});
};


