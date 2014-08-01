var Template = {
	// holds cached views
	cache: {},

	// if true (probably should be) will remove *all* <script> tags from
	// generated templates
	filter_scripts: true,

	initialize: function()
	{
		this.load_inline_templates();
	},

	/**
	 * render a view.
	 */
	render: function(view_name, data, options)
	{
		data || (data = {});
		options || (options = {});

		if(typeof(this.cache[view_name]) != 'undefined')
		{
			// we have it in hand, so just fucking run it and return it
			var content = this.do_render(view_name, data, options);
			return content;
		}

		this.load(view_name, data, options);
	},

	load: function(view_name, data, options)
	{
		options || (options = {});
		var cb_success = !options.onSuccess ? function(obj) {} : options.onSuccess;
		var cb_fail = !options.onFail ? function(obj) {} : options.onFail;

		var success = function(res)
		{
			if(!options.load_only)
			{
				return this.do_render(view_name, data, options);
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

		// security: don't load views remotely! preload them or go home.
		cb_fail('Don\'t load remote templates,');
		return false;

		// we don't have the template cached, so i think... you should make that
		// call!!!!
		new Request({
			url: 'views/'+view_name+'.html',
			method: 'get',
			onSuccess: function(res)
			{
				this.cache[view_name] = res;
				success();
			}.bind(this),
			onFailure: function(obj)
			{
				this.cache[view_name] = false;
				cb_fail();
			}.bind(this)
		}).send();
	},

	load_inline_templates: function()
	{
		if(typeof(_templates) != 'undefined')
		{
			// load templates from pre-made script
			this.cache = _templates;
		}
		else
		{
			// templates are most likely inlined, load them.
			var tpls = $$('script').filter(function(el) { return el.get('type') == 'text/x-lb-tpl'; });
			tpls.each(function(tpl) {
				this.cache[tpl.get('name')] = tpl.get('html').replace(/<%script%/g, '<script').replace(/<\/%script%>/g, '</script>');
			}, this);
		}
	},

	/**
	 * callback displaying template and doing variable replacements after view
	 * is loaded.
	 */
	do_render: function(name, data, options)
	{
		options || (options = {});

		// pull out important vars from our options
		var container = typeof(options['container']) == 'undefined' ? new Element('div') : options['container'];
		var cb_success = typeof(options['onSuccess']) == 'undefined' ? null : options['onSuccess'];
		var cb_fail = !options.onFail ? function(obj) {} : options.onFail;

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

		var tpl_fn = this.cache[name];
		if(typeof(tpl_fn) != 'function')
		{
			// (sort of) Simple JavaScript Templating
			// Andrew Lyon
			// ---------------------------------------
			// Heavily modified version of John Resig's templating engine
			//    http://ejohn.org/ - MIT Licensed
			var template = new String(tpl_fn).toString().replace(/(\r\n|\n\r)/g, "\n");
			var fnstr = 
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
			var tpl_fn = new Function("obj", fnstr);
			this.cache[name] = tpl_fn;
		}

		// if we don't have a success callback, define a default that shoves the
		// view into the container's html.
		if(!cb_success)
		{
			var cb_success = function(res, container)
			{
				if(container.innerHTML)
				{
					container.set('html', res);
				}
				return res;
			};
		}

		// great success!
		try
		{
			var view = tpl_fn(data);
		}
		catch(e)
		{
			console.error('Template: error: ', name, e);
			throw e;
		}
		if(options.filter_scripts || Template.filter_scripts)
		{
			// remove inline scripts from generated content. yes, you should do
			// this.
			view = view.replace(/<\/?script(.*?)>/ig, '');
		}
		cb_success(view, container);
		return view;
	}
};

