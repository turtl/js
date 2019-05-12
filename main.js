var $E = function(selector, filter) {return ($(filter) || document).getElement(selector);};
var $ES = function(selector, filter) {return ($(filter) || document).getElements(selector);};

var turtl = {
	events: new Composer.Event(),

	// our salty core communication lib(eral tears).
	core: null,

	// our "remember me" lib. THAT'S IT, STAN. REMEMBERRR
	remember_me: null,

	// holds the DOM object that turtl does all of its operations within
	main_container_selector: '#main',

	// global key handler for attaching keyboard events to the app
	keyboard: null,

	// a modal helper
	overlay: null,

	initialized: false,
	loaded: false,

	// holds the title breadcrumbs
	titles: [],

	controllers: {
		pages: null,
		header: null,
		nav: null,
		sidebar: null,
		loading: null
	},

	// a value we update to indicate the API connection state
	connected: true,

	// some general (CHECKMATE, )libs we use
	router: null,
	param_router: new ParamRouter(),
	api: null,
	back: null,
	settings: new PublicSetting(),
	context: null,

	// our last routes
	last_url: null,
	last_routes: [],

	// whether or not our locale data is loaded
	localized: false,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	user: null,

	// holds space/board/note data for the user (ie, the user's profile)
	profile: null,

	// holds the search model
	search: null,
	// -------------------------------------------------------------------------

	init: function()
	{
		if(this.initialized) return false;

		turtl.user = new User();
		turtl.search = new Search();
		turtl.controllers.pages = new PagesController();
		turtl.controllers.header = new HeaderController();
		turtl.controllers.loading = new LoadingController();
		turtl.controllers.pages.bind('prerelease', function() {
			// always scroll to the top of the window on page load
			$(window).scrollTo(0, 0);
			turtl.events.trigger('header:set-actions', false);
		});

		turtl.events.bind('ui-error', function(msg, err) {
			barfr.barf(msg+': '+derr(err).message);
		});

		var core_ready_promise = new Promise(function(resolve) {
			turtl.events.bind_once('core:ready', resolve, 'turtl:main:core-ready');
		});

		turtl.core = new CoreComm(config.core.adapter, config.core.options);
		turtl.remember_me = new RememberMe(config.remember_me.adapter, config.remember_me.options);

		var core_connected_promise = new Promise(function(resolve, reject) {
			turtl.core.bind('connected', function(yesno) {
				if(!yesno) return;
				turtl.core.unbind('connected', 'turtl:init:core-connected');
				resolve();
			}, 'turtl:init:core-connected');
		}.bind(this));

		turtl.events.bind('all', function() {
			var ev = arguments[0];
			log.debug('turtl.events -- '+ev, Array.prototype.slice.call(arguments, 1));
		});

		turtl.core.bind('error', function(err) {
			turtl.events.trigger('core-error', err);
		});

		turtl.core.bind('event', function(ev, data) {
			turtl.dispatch_core_event(ev, data);
		});

		turtl.keyboard = new TurtlKeyboard();
		turtl.keyboard.attach();

		turtl.context = new PageContext();
		turtl.overlay = new TurtlOverlay();

		config.routes = turtl.param_router.parse_routes(config.routes);

		var initial_route = window.location.pathname;
		turtl.setup_user({initial_route: initial_route});

		var connect_barf_id = null;
		turtl.events.bind('sync:connected', function(connected) {
			if(connected === turtl.connected) return;
			turtl.connected = connected;
			if(connected) {
				if(connect_barf_id) barfr.close_barf(connect_barf_id);
				connect_barf_id = barfr.barf(i18next.t('Connected to the Turtl service! Disengaging offline mode. Syncing your profile.'));
			} else {
				if(connect_barf_id) barfr.close_barf(connect_barf_id);
				connect_barf_id = barfr.barf(i18next.t('Disconnected from the Turtl service. Engaging offline mode. Your changes will be saved and synced once back online!'));
			}
		});

		turtl.events.bind('app:localized', function() {
			turtl.localized = true;
		});
		turtl.controllers.pages.bind('prerelease', function() {
			var space_id = turtl.param_router.get().space_id;
			if(!space_id) return;
			if(!turtl.profile) return;
			turtl.profile.set_current_space(space_id);
		});

		return Promise.all([core_ready_promise, core_connected_promise])
			.bind(this)
			.then(function() {
				var current_settings = {};
				try { current_settings = JSON.parse(localStorage['login_settings']); } catch(_) {}
				var endpoint = current_settings.endpoint || localStorage.config_api_url;
				if(!endpoint) return;
				return App.prototype.set_api_config({endpoint: endpoint})
					.catch(function(err) {
						barfr.barf(i18next.t('There was a problem setting the API endpoint. Try restarting the app.'));
						log.error('core: set endpoint: ', derr(err));
						throw err;
					});
			})
			.then(function() {
				// load the sidebar after we set up the user/profile object
				turtl.controllers.sidebar = new SidebarController();

				this.initialized = true;
				turtl.events.trigger('loaded');

				// let RememberMe manage the login from here
				return turtl.remember_me.login();
			})
			.finally(function() {
				turtl.route(initial_route);
			});
	},

	dispatch_core_event: function(ev, data) {
		switch(ev) {
			case 'messaging:ready':
				turtl.events.trigger('core:ready');
				break;
			case 'user:login':
				// there is a race condition where we get user:login before the
				// user object has set logged_in = true, which messes up some of
				// the interfaces (header, mainly). so, here we wait until the
				// turtl.user obj is logged in, then we fire the login event.
				var inter = setInterval(function() {
					if(!turtl.user.logged_in) return;
					turtl.user.trigger('login');
					clearInterval(inter);
				}, 10);
				break;
			case 'user:logout':
				turtl.user.do_logout();
				break;
			case 'user:logout:clear-cookie':
				turtl.remember_me.clear();
				break;
			case 'user:change-password:logout':
				barfr.barf(i18next.t('Your login was changed successfully!'));
				break;
			case 'user:delete':
				barfr.barf(i18next.t('Your account has been deleted.'));
				break;
			case 'sync:update':
			case 'sync:file:downloaded':
				if(ev == 'sync:file:downloaded') {
					data = {
						type: 'file',
						action: 'download',
						item_id: data.note_id,
						data: {id: data.note_id},
					};
				}
				turtl.events.trigger('sync:update', data);
				turtl.events.trigger('sync:update:'+data.type, data);
				break;
			case 'sync:connected':
				turtl.events.trigger('sync:connected', data);
				break;
			case 'sync:file:uploaded':
				break;
			case 'sync:outgoing:failure':
				barfr.barf(i18next.t('There was an error syncing a local change and syncing is paused. Click to open your sync settings and fix &raquo;'), {
					onclick: function() { turtl.route('/settings/sync'); },
					persist: true,
				});
				break;
			case 'sync:outgoing:complete':
				turtl.events.trigger('sync:outgoing:complete');
				break;
			case 'sync:outgoing:extra':
				turtl.events.trigger('sync:outgoing:extra', data);
				break;
			case 'sync:incoming:extra':
				turtl.events.trigger('sync:incoming:extra', data);
				break;
			case 'migration-event':
				turtl.events.trigger('migration', data.event, data.args);
				break;
			case 'profile:loaded':
				turtl.events.trigger('profile-loaded');
				break;
			case 'profile:indexed':
				turtl.events.trigger('profile-indexed');
				break;
			case 'profile:import:tally':
				turtl.events.trigger('profile:import:tally', data);
				break;
			case 'app:quit':
				// this should be handled by the loader (ie, the desktop app)
				break;
		}
	},

	setup_user: function(options)
	{
		options || (options = {});

		var load_profile = function()
		{
			turtl.controllers.pages.release_sub();
			turtl.profile = new Profile();
			turtl.profile.bind('loaded', function() {
				turtl.user.trigger('profile-loaded');
			});

			turtl.events.trigger('app:objects-loaded');

			turtl.show_loading_screen(true);
			turtl.update_loading_screen(i18next.t('Initializing Turtl'));

			$E('body').removeClass('loggedout');

			var profile_load_promise = new Promise(function(resolve, reject) {
				turtl.events.bind_once('profile-loaded', resolve);
			});
			var profile_index_promise = new Promise(function(resolve, reject) {
				turtl.events.bind_once('profile-indexed', resolve);
			});

			this.start = Date.now();
			var sync = new Sync();
			sync.start()
				.bind(this)
				.then(function() {
					turtl.update_loading_screen(i18next.t('Loading profile'));
					return profile_load_promise;
				})
				.then(function() {
					return turtl.profile.load();
				})
				.then(function() {
					log.info('profile: loaded in: ', Date.now() - this.start);
					turtl.update_loading_screen(i18next.t('Indexing notes'));
					return profile_index_promise;
				})
				.then(function() {
					setTimeout(turtl.show_loading_screen.bind(null, false), 200);
					turtl.controllers.pages.release_sub();
					var default_space = turtl.user.setting('default_space');
					var spaces = turtl.profile.get('spaces');
					var space = default_space ? spaces.get(default_space) : spaces.first();
					if(!space) space = spaces.first();
					var initial_route = '/';
					if(space) {
						var space_route = '/spaces/'+space.id()+'/notes';
						initial_route = options.initial_route || space_route;
						if(initial_route == '/') initial_route = space_route;
					}

					if(initial_route.match(/^\/users\//)) initial_route = space_route;
					if(initial_route.match(/index.html/)) initial_route = space_route;
					if(initial_route.match(/background.html/)) initial_route = space_route;
					turtl.route(initial_route);
					options.initial_route = '/';

					turtl.loaded = true;
					turtl.events.trigger('app:loaded');
					turtl.events.trigger('app:load:profile-loaded');

					turtl.keyboard.bind('shift+/', function() {
						new KeyboardShortcutHelpController();
					}, 'shortcut:main:hellp');
					turtl.keyboard.bind('n', function() {
						var space = turtl.profile.current_space();
						turtl.route('/spaces/'+space.id()+'/notes');
					}, 'shortcut:main:notes');
					turtl.keyboard.bind('b', function() {
						turtl.controllers.sidebar.open();
					}, 'shortcut:main:boards');
					turtl.keyboard.bind('s', function() {
						turtl.controllers.sidebar.open();
						turtl.controllers.sidebar.open_spaces();
					}, 'shortcut:main:boards');
				})
				.catch(function(err) {
					barfr.barf(i18next.t('There was a problem with the initial load of your profile. Please try again.'));
					log.error('turtl: load: ', derr(err));
					var what_next = new Element('div.choice');
					var retry = new Element('a')
						.set('href', '#retry')
						.addClass('button')
						.set('html', i18next.t('Retry'))
						.inject(what_next);
					var logout = new Element('a')
						.set('href', '#logout')
						.addClass('button')
						.set('html', i18next.t('Logout'))
						.inject(what_next);
					var wipe = new Element('a')
						.set('href', '#wipe')
						.addClass('button')
						.set('html', i18next.t('Clear local data'))
						.inject(what_next);
					turtl.events.trigger('loading:stop');
					turtl.update_loading_screen(false);
					turtl.update_loading_screen(i18next.t('Error loading profile'));
					turtl.update_loading_screen(what_next);
					retry.addEvent('click', function(e) {
						if(e) e.stop();
						turtl.update_loading_screen(false);
						load_profile();
					});
					logout.addEvent('click', function(e) {
						if(e) e.stop();
						turtl.user.logout();
					});
					wipe.addEvent('click', function(e) {
						var settings = new SettingsController();
						settings.wipe_data(e);
					});
				});

			// logout shortcut
			turtl.keyboard.bind('control+shift+l', function() {
				SettingsController.prototype.wipe_data();
			}, 'dashboard:shortcut:clear-data');
			turtl.keyboard.bind('shift+l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');
		}.bind(turtl);
		this.user.bind('login', load_profile);
		turtl.user.bind('logout', function() {
			$E('body').addClass('loggedout');
			var is_user_controller = turtl.controllers.pages.is([
				UserLoginController,
				UserJoinController,
				UserWelcomeController,
				UserMigrateController
			]);

			if(!is_user_controller) {
				turtl.controllers.pages.release_sub();
			}
			turtl.keyboard.unbind('shift+l');
			turtl.keyboard.unbind('n', 'shortcut:main:notes');
			turtl.keyboard.unbind('b', 'shortcut:main:boards');
			turtl.show_loading_screen(false);

			// this should give us a clean slate
			if(turtl.profile) turtl.profile.destroy();
			turtl.profile = null;

			var url = turtl.router && turtl.router.cur_path();
			if(
				!url || (
					!url.match(/\/users\/login/) &&
					!url.match(/\/users\/join/) &&
					!url.match(/\/users\/migrate/) &&
					!url.match(/\/users\/debug/) &&
					!url.match(/\/settings\/logs/)
				)
			) {
				turtl.route('/');
			}

			turtl.events.trigger('user:logout');
			turtl.events.trigger('app:unloaded');
			turtl.loaded = false;
		}.bind(turtl));
	},

	loading: function(show)
	{
		return false;
	},

	stop_spinner: false,

	show_loading_screen: function(show, delay)
	{
		if(delay)
		{
			setTimeout(function() {
				turtl.events.trigger('loading:show', show);
			}, delay);
		}
		else
		{
			turtl.events.trigger('loading:show', show);
		}
	},

	update_loading_screen: function(msg)
	{
		turtl.events.trigger('loading:log', msg);
	},

	unload: function()
	{
		this.initialized = false;
		Object.each(this.controllers, function(controller) {
			controller.release();
		});
		this.controllers = {};
	},

	setup_router: function(options)
	{
		if(turtl.router) return;

		options || (options = {});
		options = Object.merge({
			base: config.route_base || '',
			// we'll do our own first route
			suppress_initial_route: true,
			default_title: 'Turtl',
			enable_cb: function(url) {
				var enabled = true;

				if(turtl.user.logged_in && (!turtl.profile || !turtl.profile.loaded)) {
					turtl.controllers.pages.trigger('loaded');
					enabled = false;
				}
				if(turtl.user.logging_in) enabled = false;
				if(!turtl.initialized) enabled = false;
				return enabled;
			}
		}, options);
		turtl.router = new Composer.Router(config.routes, options);
		turtl.router.bind_links({
			filter_trailing_slash: true,
			selector: 'a:not([href^=#])'
		});

		// parameterize our routes.
		turtl.param_router.set_router(turtl.router);

		// catch ALL #hash links and stop them in their tracks. this fixes a bug
		// in NWJS v0.15.x where setting the window location to a hash crashes
		// the app (at least in windows)
		Composer.add_event(document.body, 'click', function(e) {
			if(e) e.stop();
		}, 'a[href^="#"]');

		var last_route = null;
		turtl.router.bind('preroute', function() {
			turtl.last_url = last_route;
			last_route = turtl.router.cur_path();
			if(turtl.last_url) {
				turtl.push_route(turtl.last_url);
			}
		});
		turtl.router.bind('preroute', turtl.controllers.pages.trigger.bind(turtl.controllers.pages, 'preroute'));
		turtl.router.bind('route', turtl.controllers.pages.trigger.bind(turtl.controllers.pages, 'route'));
		turtl.router.bind('fail', function(obj) {
			log.error('route failed:', obj.url, obj);
		});
		turtl.router.bind('preroute', function(boxed) {
			boxed.path = boxed.path.replace(/\-\-.*$/, '');
			return boxed;
		});
	},

	route: function(url, options)
	{
		options || (options = {});
		this.setup_router(options);
		if(
			!turtl.user.logged_in &&
			!url.match(/\/users\/login/) &&
			!url.match(/\/users\/join/) &&
			!url.match(/\/users\/migrate/) &&
			!url.match(/\/users\/debug/) &&
			!url.match(/\/settings\/logs/)
		)
		{
			url = '/users/login';
		}
		log.debug('turtl::route() -- '+url);
		this.router.route(url, options);
	},

	route_changed: function() {
		return turtl.last_routes[turtl.last_routes.length - 1] != turtl.router.cur_path();
	},

	push_route: function(url) {
		turtl.last_routes.push(url);
		if(turtl.last_routes.length >= 10) {
			turtl.last_routes = turtl.last_routes.slice(1);
		}
	},

	route_to_space: function(space_id) {
		if(!space_id && turtl.profile) {
			var space = turtl.profile.current_space();
			if(space) space_id = space.id();
		}
		return turtl.route('/spaces/'+space_id+'/notes');
	},

	_set_title: function()
	{
		var title = 'Turtl';
		var back = false;
		var options = {};
		if(turtl.titles[0])
		{
			title = turtl.titles[0].title;
			back = turtl.titles[0].back;
			options = turtl.titles[0].options;
		}

		turtl.controllers.header.render_title(title, back, options);
	},

	push_title: function(title, backurl, options)
	{
		if(!backurl) turtl.titles = turtl.titles.slice(0, 5);
		turtl.titles.unshift({
			title: title,
			back: backurl,
			options: options
		});
		turtl._set_title();
	},

	pop_title: function(do_route_back)
	{
		var entry = turtl.titles.shift()
		turtl._set_title();
		if(entry && entry.back && do_route_back)
		{
			var back = entry.back;
			turtl.route(entry.back);
		}
	},

	replace_title: function(title, backurl, options)
	{
		turtl.titles[turtl.titles.length - 1] = {
			title: title,
			back: backurl,
			options: options,
		};
		turtl._set_title();
	},

	push_modal_url: function(url, options)
	{
		options || (options = {});

		var prefix = options.prefix || 'modal';
		var back = turtl.router.cur_path();
		var add = '--'+prefix+':'+url;
		if(options.add_url)
		{
			back = back.replace(add, '');
		}
		else
		{
			back = back.replace(/\-\-.*/, '');
		}
		back += add;
		turtl.route(back, {replace_state: options.replace});
		return function()
		{
			var re = new RegExp(add);
			if(!turtl.router.cur_path().match(re)) return;
			turtl.route(back.replace(re, ''));
		};
	}
};

var barfr = null;
var markdown = null;

var _turtl_init = function()
{
	window._base_url = config.base_url || '';

	turtl.back = new Backstate();

	// create the barfr
	barfr = new Barfr('barfr', {timeout: 8000});

	// prevent backspace from navigating back
	$(document.body).addEvent('keydown', function(e) {
		if(e.key != 'backspace') return;
		var is_input = ['input', 'textarea'].contains(e.target.get('tag'));
		var is_editable = Composer.find_parent('div.editable', e.target);
		var is_button = is_input && ['button', 'submit'].contains(e.target.get('type'));
		if((is_input || is_editable) && !is_button) return;

		// prevent backspace from triggering if we're not in a form element
		e.stop();
	});

	// OH BEHAVE
	delete Hammer.defaults.cssProps.userSelect;
    
	const md_opts = {
		html: true,
		breaks: true,
		linkify: true,
		typographer: true,
	};
	md = window.markdownit(md_opts)
		.use(function(md) {
			window.markdownitTaskLists(md, {enabled: false});
		})
		.use(window.markdownitkatex);

	view.fix_template_paths();

	turtl.init();

	setup_global_error_catching();
};

window.addEvent('domready', function() {
	setTimeout(_turtl_init, 100);
});

init_localization();

function setup_global_error_catching() {
	// set up a global error handler that XHRs shit to the API so we know when bugs
	// are cropping up
	if(config.catch_global_errors) {
		var enable_errlog = true;
		var handler = function(msg, url, line)
		{
			if(!turtl.api || !enable_errlog) return;
			log.error('remote error log: ', arguments);
			// remove filesystem info
			url = url.replace(/^.*\/data\/app/, '/data/app');
			turtl.api.post('/log/error', {data: {client: config.client, version: config.version, msg: msg, url: url, line: line}})
				.catch(function(err) {
					log.error('error catcher: error posting (how ironic): ', derr(err));
					// error posting, disable log for 30s
					enable_errlog = false;
					(function() { enable_errlog = true; }).delay(30000);
				});
		};
		Promise.onPossiblyUnhandledRejection(function(err) {
			console.error('Unhandled Promise error: ', err, err.stack);
		});
		window.onerror = handler;
	}
}

// eslint-disable-next-line
window.eval = function () { throw new Error('nope'); };

