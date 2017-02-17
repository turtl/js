"use strict";
(function() {
	this.Sexhr = function(options)
	{
		options || (options = {});

		return new Promise(function(resolve, reject) {
			var url = options.url;
			var method = (options.method || 'get').toUpperCase();
			var emulate = options.emulate || true;

			if(!options.url) throw new Error('no url given');

			url = url.replace(/#.*$/, '');
			var qs = [];
			if(options.querydata)
			{
				qs = Object.keys(options.querydata)
					.map(function(key) {
						return key + '=' + encodeURIComponent(options.querydata[key]);
					});
			}
			if(emulate && ['GET', 'POST'].indexOf(method) < 0)
			{
				qs.push('_method='+method);
				method = 'POST';
			}
			if(qs.length)
			{
				var querystring = qs.join('&');
				if(url.match(/\?/))
				{
					url = url.replace(/&$/) + '&' + querystring;
				}
				else
				{
					url += '?' + querystring;
				}
			}

			var xhr = new XMLHttpRequest();
			xhr.open(method, url, true);
			xhr.responseType = options.response_type || '';
			if(options.timeout) xhr.timeout = options.timeout;

			Object.keys(options.headers || {}).forEach(function(k) {
				xhr.setRequestHeader(k, options.headers[k]);
			});
			xhr.onload = function(e)
			{
				if(xhr.status >= 200 && xhr.status < 300)
				{
					var value = xhr.response;
					return resolve([value, xhr]);
				}
				else if(xhr.status >= 400)
				{
					reject({xhr: xhr, code: xhr.status, msg: xhr.response});
				}
			};
			xhr.onabort = function(e)
			{
				reject({xhr: xhr, code: -2, msg: 'aborted'});
			};
			xhr.onerror = function(e)
			{
				reject({xhr: xhr, code: -1, msg: 'error'});
			};
			xhr.ontimeout = function(e)
			{
				reject({xhr: xhr, code: -3, msg: 'timeout'});
			};

			// set xhr.on[progress|abort|etc]
			Object.keys(options).forEach(function(k) {
				if(k.substr(0, 2) != 'on') return false;
				if(['onload', 'onerror', 'onabort', 'ontimeout'].indexOf(k) >= 0) return false;
				var fn = options[k];
				xhr[k] = function(e) { fn(e, xhr); };
			});
			// set xhr.upload.on[progress|abort|etc]
			Object.keys(options.upload || {}).forEach(function(k) {
				if(k.substr(0, 2) != 'on') return false;
				var fn = options[k];
				xhr.upload[k] = function(e) { fn(e, xhr); };
			});

			if(options.override) options.override(xhr);

			xhr.send(options.data);
		});
	};
}).apply((typeof exports != 'undefined') ? exports : this);

