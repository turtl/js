// MT1.11 Compat - who the fuck would remove these??
//
var $E = function(selector, filter){ return ($(filter) || document).getElement(selector); };
var $ES = function(selector, filter){ return ($(filter) || document).getElements(selector); };

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
	do_sync: true,

	// if true, tells the app to mirror data to local storage
	mirror: false,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	// holds messages for all the user's personas
	messages: null,

	// holds persona/board/note data for the user (ie, the user's profile)
	profile: null,

	// holds the search model
	search: null,

	// holds our sync model, responsible for coordinating synchronizing of data
	// between in-memory models, the local DB, and the API
	sync: null,

	// this is our local storage DB "server" (right now an IndexedDB abstraction
	// which stores files and notes locally).
	db: null,
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
		this.user	=	new User();

		this.setup_profile({initial_route: initial_route});

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
		if(!window._in_ext) this.route(initial_route);
	},

	setup_profile: function(options)
	{
		options || (options = {});

		// update the user_profiles collection on login
		this.user.bind('login', function() {
			// init our feedback
			this.load_controller('feedback', FeedbackButtonController);

			// if the user is logged in, we'll put their auth info into the api object
			if(!window._in_ext && !window._disable_cookie)
			{
				turtl.user.bind('change', turtl.user.write_cookie.bind(turtl.user), 'user:write_changes_to_cookie');
			}
			turtl.api.set_auth(turtl.user.get_auth());
			turtl.controllers.pages.release_current();
			turtl.sync		=	new Sync();
			turtl.messages	=	new Messages();
			turtl.profile	=	new Profile();
			turtl.search	=	new Search();

			turtl.show_loading_screen(true);

			// sets up local storage (indexeddb)
			turtl.setup_local_db({
				complete: function() {
					// database is setup, populate the profile
					turtl.profile.populate({
						complete: function() {
							// move keys from the user's settings into the keychain
							turtl.show_loading_screen(false);
							turtl.controllers.pages.release_current();
							turtl.last_url = '';
							//turtl.profile.persist();
							turtl.search.reindex();
							var initial_route	=	options.initial_route || '';
							if(initial_route.match(/^\/users\//)) initial_route = '/';
							if(initial_route.match(/index.html/)) initial_route = '/';
							if(initial_route.match(/background.html/)) initial_route = '/';
							if(!window._in_background) turtl.route(initial_route);
							turtl.setup_syncing();
							turtl.setup_background_panel();
							if(window.port) window.port.send('profile-load-complete');
						}.bind(turtl)
					});

				}.bind(this)
			});

			// logout shortcut
			turtl.keyboard.bind('S-l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');

			// notify addon of message changes
			turtl.messages.bind(['add', 'remove', 'reset', 'change'], function() {
				var num_messages	=	turtl.messages.map(function(msg) {
					return msg.id();
				});
				if(window.port) window.port.send('num-messages', num_messages.length);
			}, 'turtl:messages:counter');
			turtl.user.bind_relational('personas', ['add', 'remove', 'reset'], function() {
				var num_personas	=	turtl.user.get('personas').models().length;
				if(window.port) window.port.send('num-personas', num_personas);
			}, 'turtl:personas:counter');
		}.bind(turtl));
		turtl.user.bind('logout', function() {
			// remove feedback button
			this.controllers.feedback.release();
			delete this.controllers.feedback;

			turtl.controllers.pages.release_current();
			turtl.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
			turtl.messages.unbind(['add', 'remove', 'reset', 'change'], 'turtl:messages:counter');
			turtl.user.unbind_relational('personas', ['add', 'remove', 'reset'], 'turtl:personas:counter');
			turtl.show_loading_screen(false);
			turtl.user.unbind('change', 'user:write_changes_to_cookie');
			turtl.api.clear_auth();
			modal.close();

			// local storage is for logged in people only
			if(turtl.db)
			{
				turtl.db.close();
				turtl.db	=	null;
			}

			// this should give us a clean slate
			turtl.user.unbind();
			turtl.user	=	new User();
			turtl.setup_profile();
			turtl.setup_header_bar();
			turtl.profile.destroy();
			turtl.profile	=	null;

			if(window.port) window.port.send('logout');
		}.bind(turtl));
	},

	setup_local_db: function(options)
	{
		options || (options = {});

		// hijack the complete function to set our shiny new database into the
		// turtl scope.
		var complete		=	options.complete;
		options.complete	=	function(server)
		{
			turtl.db	=	server;
			if(complete) complete(server);
		};

		return database.setup(options);
	},

	wipe_local_db: function()
	{
		if(!turtl.user.logged_in)
		{
			console.log('wipe_local_db only works when logged in. if you know the users ID, you can wipe via:');
			console.log('window.indexedDB.deleteDatabase("turtl.<userid>")');
			return false;
		}
		turtl.do_sync	=	false;
		if(turtl.db) turtl.db.close();
		window.indexedDB.deleteDatabase('turtl.'+turtl.user.id());
		turtl.setup_local_db();
	},

	setup_header_bar: function()
	{
		if(turtl.controllers.HeaderBar) turtl.controllers.HeaderBar.release();
		turtl.controllers.HeaderBar = new HeaderBarController();
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
		// register our tracking for local syncing (db => in-mem)
		//
		// NOTE: order matters here! since the keychain holds keys in its data,
		// it's important that it runs before everything else, or you may wind
		// up with data that doesn't get decrypted properly. next is the
		// personas, followed by boards, and lastly notes.
		turtl.sync.register_local_tracker('user', turtl.user);
		turtl.sync.register_local_tracker('keychain', turtl.profile.get('keychain'));
		turtl.sync.register_local_tracker('personas', turtl.profile.get('personas'));
		turtl.sync.register_local_tracker('boards', turtl.profile.get('boards'));
		turtl.sync.register_local_tracker('notes', turtl.profile.get('notes'));

		// always sync from local db => in-mem models, even if syncing is
		// disabled. this not only keeps memory synchronized with what's being
		// stored, it allows us to sync changes between pieces of turtl client-
		// side. for instance, we can save data in an app tab, and a second
		// later it will be synced to our background process.
		turtl.sync.sync_from_db();

		// only sync against the remote DB if we're in the standalone app OR if
		// we're in the background thread of an addon
		if(turtl.do_sync && (!window._in_ext || window._in_background) && !window._in_app)
		{
			// note that our remote trackers use brand new instances of the
			// models/collections we'll be tracking. this enforces a nice
			// separation between remote syncing and local syncing (and
			// encourages all data changes to flow through the local db).
			turtl.sync.register_remote_tracker('user', new User());
			turtl.sync.register_remote_tracker('keychain', new Keychain());
			turtl.sync.register_remote_tracker('personas', new Personas());
			turtl.sync.register_remote_tracker('boards', new Boards());
			turtl.sync.register_remote_tracker('notes', new Notes());

			// start API -> local db sync process. calls POST /sync, which grabs
			// all the latest changes for our profile, which are then applied to
			// our local db.
			turtl.sync.sync_from_api();

			// start the local db -> API sync process.
			turtl.sync.sync_to_api();
		}

		// set up manual syncing, and listen for persona key assignments
		if(window.port && window._in_background)
		{
			window.port.bind('persona-attach-key', function(key, persona_data) {
				var persona	=	turtl.user.get('personas').find_by_id(persona_data.id);
				if(!persona || persona.has_rsa())
				{
					console.log('key attached, but persona gone (or has key)');
					// persona doesn't exist (or already has key), return the key
					window.port.send('rsa-keypair', key);
					return false;
				}
				persona.set_rsa(tcrypt.rsa_key_from_json(key));
				persona.save();
			});
			var persona	=	turtl.user.get('personas').first();
			if(persona && !persona.has_rsa({check_private: true}))
			{
				window.port.send('persona-created', persona.toJSON());
				console.log('turtl: persona created (init)');
			}
		}
	},

	setup_background_panel: function()
	{
		if(!window.port) return false;

		window.port.bind('addon-controller-open', function(controller_name, params) {
			var controller	=	turtl.controllers.pages.load(window[controller_name], params);
		});

		window.port.bind('get-height', function() {
			var height	=	$('background_content').getCoordinates().height + 10;
			window.port.send('set-height', height);
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
		var regex	=	new RegExp('(\\s*\\|\\s*'+(turtl.base_window_title).escapeRegExp()+')*(\\s*\\|)?$', 'g');
		title		=	title.clean().replace(regex, '');
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

window.addEvent('beforeunload', function() {
	if(window.port) window.port.send('tab-unload');
});
