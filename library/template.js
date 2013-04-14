var Template = {
	// holds cached views
	cache: {},

	initialize: function()
	{
		this.load_inline_templates();
	},

	/**
	 * render a view.
	 */
	render: function(view_name, data, params)
	{
		data || (data = {});
		params || (params = {});

		if(typeof(this.cache[view_name]) != 'undefined')
		{
			// we have it in hand, so just fucking run it and return it
			return this.do_render(view_name, data, params);
		}

		this.load(view_name, data, params);
	},

	load: function(view_name, data, params)
	{
		params || (params = {});
		var cb_success	=	!params.onSuccess ? function(obj) {} : params.onSuccess;
		var cb_fail		=	!params.onFail ? function(obj) {} : params.onFail;

		var success	=	function(res)
		{
			if(!params.load_only)
			{
				return this.do_render(view_name, data, params);
			}
			else
			{
				return cb_success(res);
			}
		}.bind(this);

		if(typeof(this.cache[view_name]) != 'undefined')
		{
			return success();
		}

		// we don't have the template cached, so i think... you should make that
		// call!!!!
		new Request({
			url: 'views/'+view_name+'.html',
			method: 'get',
			onSuccess: function(res)
			{
				this.cache[view_name]	=	res;
				success();
			}.bind(this),
			onFailure: function(obj)
			{
				this.cache[view_name]	=	false;
				cb_fail();
			}.bind(this)
		}).send();
	},

	load_inline_templates: function()
	{
		if(typeof(_templates) != 'undefined')
		{
			// load templates from pre-made script
			this.cache	=	_templates;
		}
		else
		{
			// templates are most likely inlined, load them.
			var tpls	=	$$('script').filter(function(el) { return el.get('type') == 'text/x-lb-tpl'; });
			tpls.each(function(tpl) {
				this.cache[tpl.get('name')]	=	tpl.get('html').replace(/<%script%/g, '<script').replace(/<\/%script%>/g, '</script>');
			}, this);
		}
	},

	/**
	 * callback displaying template and doing variable replacements after view
	 * is loaded.
	 */
	do_render: function(name, data, params)
	{
		params || (params = {});

		// pull out important vars from our params
		var container	=	typeof(params['container']) == 'undefined' ? new Element('div') : params['container'];
		var cb_success	=	typeof(params['onSuccess']) == 'undefined' ? null : params['onSuccess'];
		var cb_fail		=	!params.onFail ? function(obj) {} : params.onFail;

		// check if we even have the view we want
		if(!this.cache[name])
		{
			container.set('html', '');
			if(cb_fail)
			{
				cb_fail({msg:'Bad template or not found.'});
			}
			return false;
		}

		var tpl_fn	=	this.cache[name];
		if(typeof(tpl_fn) != 'function')
		{
			// (sort of) Simple JavaScript Templating
			// Andrew Lyon
			// ---------------------------------------
			// Heavily modified version of John Resig's templating engine
			//    http://ejohn.org/ - MIT Licensed
			var template	=	new String(tpl_fn).toString().replace(/(\r\n|\n\r)/g, "\n");
			var fnstr		=	
				"var ___p=[],print=function(){___p.push.apply(___p,arguments);};" +
				"with(obj) {___p.push('" +
				template
					// fix single quotes in html (escape them)
					.replace(/(^|\?>)([\s\S]*?)($|<\?)/g, function(match) {
						return match.replace(/'/g, '\\\'');
					})
					// implement safe usage of $varname
					.replace(/<\?([\s\S]*?)\?>/g, function(match) {
						return match.replace(/\$([a-z_][a-z0-9_\.]+)/gi, '(typeof($1) == "undefined" ? null : $1)').replace(/[\r\n]+/g, ' ');
					})
					.replace(/\r?\n/g, '___::NEWLINE::___')
					.split("<?").join('___::TABBBBB::___')
					.replace(/((^|\?>)(?!=___::TABBBBB::___))'/g, "$1___::SLASHR::___")
					.replace(/___::TABBBBB::___=\s*\$?(.*?)\?>/g, "',$1,'")
					.split('___::TABBBBB::___').join("');")
					.split('?>').join("___p.push('")
					.split("___::SLASHR::___").join("\\'")
					.replace(/___::NEWLINE::___/g, '\'+ "\\n" + \'') +
					"');}" + "return ___p.join('');";
			var tpl_fn	=	new Function("obj", fnstr);
			this.cache[name]	=	tpl_fn;
		}

		// if we don't have a success callback, define a default that shoves the
		// view into the container's html.
		if(!cb_success)
		{
			var cb_success	=	function(res, container)
			{
				if(container.innerHTML)
				{
					container.set('html', res);
				}
				return res;
			};
		}

		// great success!
		var view	=	tpl_fn(data);
		cb_success(view, container);
		return view;
	}
};

