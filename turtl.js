// MT1.11 Compat - who the fuck would remove these??
//
// $(this.main_container_selector).set('html', '');
var $E = function(selector, filter){ return ($(filter) || document).getElement(selector); };
var $ES = function(selector, filter){ return ($(filter) || document).getElements(selector); };

// stores the object that communicates with the addon
var addon_comm	=	null;

var turtl	=	{
	site_url: null,

	// base window title
	base_window_title: 'Turtl',

	// holds the user model
	user: null,

	// holds the DOM object that turtl does all of its operations within
	main_container_selector: '#main',

	// a place to reference composer controllers by name
	controllers: {},

	// global key handler for attaching keyboard events to the app
	keyboard: null,

	loaded: false,
	router: false,

	// tells the pages controller whether or not to scroll to the top of the
	// window after a page load
	scroll_to_top: true,

	// whether or not to sync data w/ server
	sync: false,
	sync_timer: null,

	// if true, tells the app to mirror data to local storage
	mirror: false,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	// holds messages for all the user's personas
	messages: null,

	// holds project/note data for the user
	profile: null,

	// holds the search model
	search: null,
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

		// setup the API tracker (for addon API requests)
		turtl.api.tracker.attach();

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
		if(window._in_ext)
		{
			this.user.login_from_auth(window._auth);
			window._auth	=	null;	// clear, because i'm paranoid
		}
		else
		{
			this.user.login_from_cookie();
		}

		this.setup_header_bar();

		this.loaded	=	true;
		if(window.port) window.port.send('loaded');
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
			if(!window._in_ext)
			{
				this.user.bind('change', this.user.write_cookie.bind(this.user), 'user:write_changes_to_cookie');
			}
			this.api.set_auth(this.user.get_auth());
			this.controllers.pages.release_current();
			this.messages	=	new Messages();
			this.profile	=	new Profile();
			this.search		=	new Search();

			turtl.show_loading_screen(true);
			this.profile.initial_load({
				complete: function() {
					turtl.show_loading_screen(false);
					this.controllers.pages.release_current();
					this.last_url = '';
					turtl.profile.persist();
					this.search.reindex();
					var initial_route	=	options.initial_route || '';
					if(initial_route.match(/^\/users\//)) initial_route = '/';
					if(initial_route.match(/index.html/)) initial_route = '/';
					if(initial_route.match(/background.html/)) initial_route = '/';
					this.route(initial_route);
					this.setup_syncing();
					this.setup_background_panel();
					if(window.port) window.port.send('profile-load-complete');
				}.bind(this)
			});

			// logout shortcut
			turtl.keyboard.bind('S-l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');
		}.bind(this));
		this.user.bind('logout', function() {
			turtl.controllers.pages.release_current();
			turtl.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
			turtl.show_loading_screen(false);
			this.user.unbind('change', 'user:write_changes_to_cookie');
			turtl.api.clear_auth();
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
		turtl.profile.get_sync_time();

		// monitor for sync changes
		if(turtl.sync && !window._in_ext)
		{
			this.sync_timer = new Timer(10000);
			this.sync_timer.end = function()
			{
				turtl.profile.sync();
				this.sync_timer.start();
			}.bind(this);
			this.sync_timer.start();
		}

		// listen for syncing from addon
		if(window.port) window.port.bind('profile-sync', function(sync) {
			if(!sync) return false;
			turtl.profile.process_sync(data_from_addon(sync));
		});

		// set up manual syncing
		if(window.port) window.port.bind('do-sync', function() {
			turtl.profile.sync();
		});
	},

	setup_background_panel: function()
	{
		if(!window.port) return false;

		window.port.bind('addon-controller-open', function(controller_name, params) {
			var controller	=	turtl.controllers.pages.load(eval(controller_name), params);
		});

		window.port.bind('get-height', function() {
			var height	=	$('background_content').getCoordinates().height + 10;
			window.port.send('set-height', height);
		});

		window.port.bind('gen-rsa-key', function() {
		});
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
					return this.loaded;
				}.bind(this),
				on_failure: function(obj)
				{
					console.log('route failed:', obj.url, obj);
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
					turtl.controllers.pages.trigger('onroute', path);
					//turtl.controllers.pages.on_route(path);
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
		title	=	title.clean().replace(eval('/(\\s*\\|\\s*'+(turtl.base_window_title).escapeRegExp()+')*(\\s*\\|)?$/g'), '');
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
	window.port				=	window.port || false;
	window.__site_url		=	window.__site_url || '';
	window.__api_url		=	window.__api_url || '';
	window.__api_key		=	window.__api_key || '';
	window._base_url		=	window._base_url || '';
	turtl.main_container	=	$E(turtl.main_container_selector);
	turtl.site_url			=	__site_url || '';
	turtl.base_window_title	=	document.title.replace(/.*\|\s*/, '');
	turtl.api				=	new Api(
		__api_url || '',
		__api_key || '',
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
	
	turtl.load_controller('pages', PagesController);

	// init it LOL
	turtl.init.delay(50, turtl);
});

