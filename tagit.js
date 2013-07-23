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

	// whether or not to sync data w/ server
	sync: true,
	sync_timer: null,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	// holds messages for all the user's personas
	messages: null,

	// holds project/note data for the user
	profile: null,
	// -------------------------------------------------------------------------

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

		// load the global keyboard handler
		this.keyboard	=	new Composer.Keyboard({meta_bind: true});

		// set up our user object
		this.setup_user({initial_route: initial_route});

		// if a user exists, log them in
		this.user.login_from_cookie();

		this.setup_header_bar();

		this.loaded	=	true;
		this.route(initial_route);
	},

	setup_user: function(options)
	{
		options || (options = {});

		// create the user model
		this.user	=	new User();

		// update the user_profiles collection on login
		this.user.bind('login', function() {
			// if the user is logged in, we'll put their auth info into the api object
			this.user.bind('change', this.user.write_cookie.bind(this.user), 'user:write_changes_to_cookie');
			this.api.set_auth(this.user.get_auth());
			this.controllers.pages.release_current();
			this.messages = new Messages();
			tagit.show_loading_screen(true);
			this.profile = this.user.load_profile({
				init: true,
				success: function(_, from_storage) {
					this.user.load_personas({
						success: function(prof) {
							// message data can be loaded independently once personas
							// are loaded, so do it
							tagit.messages.sync();

							// this function gets called when all profile/persona data
							// has been loaded
							var finish	=	function()
							{
								tagit.show_loading_screen(false);
								this.controllers.pages.release_current();
								this.last_url = '';
								var initial_route	=	options.initial_route || '';
								if(initial_route.match(/^\/users\//)) initial_route = '/';
								tagit.profile.persist();
								this.route(initial_route);
								this.setup_syncing();
							}.bind(this);

							var num_personas	=	tagit.user.get('personas').models().length;

							// if we loaded from storage, we already have all the
							// persona profile junk, so don't bother loading it
							if(num_personas > 0 && !from_storage)
							{
								// wait for all personas to load their profiles before
								// finishing the load
								var i		=	0;
								var track	=	function()
								{
									i++;
									if(i >= num_personas) finish();
								};

								// loop over each persona and load its profile data
								tagit.user.get('personas').each(function(p) {
									p.load_profile({
										success: function() {
											track();
										},
										error: function(err) {
											barfr.barf('Error loading the profile data for your persona "'+p.get('screenname')+'":'+ err);
											// don't want to freeze the app just because one
											// persona doesn't load, do we?
											track();
										}
									});
								});
							}
							else
							{
								// no personas to load (or we loaded all the profile
								// data from locstor newayz), just finish up the load
								finish();
							}
						}.bind(this)
					});
				}.bind(this)
			});

			// logout shortcut
			tagit.keyboard.bind('S-l', function() {
				tagit.route('/users/logout');
			}, 'dashboard:shortcut:logout');
		}.bind(this));
		this.user.bind('logout', function() {
			tagit.controllers.pages.release_current();
			tagit.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
			tagit.show_loading_screen(false);
			this.user.unbind('change', 'user:write_changes_to_cookie');
			tagit.api.clear_auth();
			modal.close();

			// this should give us a clean slate
			this.user.unbind();
			this.user	=	null;
			this.setup_user();
			this.setup_header_bar();
		}.bind(this));
	},

	setup_header_bar: function()
	{
		if(this.controllers.HeaderBar) this.controllers.HeaderBar.release();
		this.controllers.HeaderBar = new HeaderBarController();
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

	setup_syncing: function()
	{
		// monitor for sync changes
		tagit.profile.get_sync_time();
		this.sync_timer = new Timer(10000);
		this.sync_timer.end = function()
		{
			tagit.profile.sync();
			this.sync_timer.start();
		}.bind(this);
		this.sync_timer.start();
	},

	stop_spinner: false,

	show_loading_screen: function(show, delay)
	{
		var overlay = $('loading-overlay');
		if(!overlay) return;
		var do_show	=	function()
		{
			overlay.setStyle('display', show ? 'table' : '');
			if(show)
			{
				this.stop_spinner = false;
				var chars = ['/', '-', '\\', '|'];
				var idx = 0;
				var spinner = $E('.spin', overlay);
				var spin = function()
				{
					if(this.stop_spinner || !spinner) return;
					spinner.set('html', chars[idx]);
					idx = (idx + 1) % chars.length;
					spin.delay(100, this);
				}.bind(this);
				spin();
			}
			else
			{
				this.stop_spinner = true;
			}
		};

		if(delay && delay > 0) do_show.delay(delay);
		else do_show();
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
	if(options.skip_sync && method == 'delete')
	{
		options.success();
		return;
	}
	else if(options.skip_sync) return;
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

	// don't want to send all data over a GET or DELETE
	var args	=	options.args;
	args || (args = {});
	if(method != 'get' && method != '_delete')
	{
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
		args.data = data;
	}
	tagit.api[method](model.get_url(), args, {
		success: options.success,
		error: options.error
	});
};


