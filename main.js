var $E = function(selector, filter) {return ($(filter) || document).getElement(selector);};
var $ES = function(selector, filter) {return ($(filter) || document).getElements(selector);};

// we need CBC for backwards compat
sjcl.beware['CBC mode is dangerous because it doesn\'t protect message integrity.']();

// make our client IDs such that they are always sorted *after* real,
// server-generated IDs ('z.') and they are chronologically sortable from each
// other. Also, append in the original cid() at the end for easier debugging.
//
// NOTE: *DO NOT* change the cid scheme without updating the cid_match regex
// below!
Composer.cid = (function() {
	var counter = 0;
	return function() {
		counter++;
		return (new Date().getTime().toString(16)) +
			turtl.client_id +
			counter.toString(16);
	};
})();

var cid_match = /[0-9a-f]+/;

var default_route = '/boards';

var turtl = {
	client_id: null,

	site_url: null,

	events: new Composer.Event(),

	// holds the user model
	user: null,

	// holds the DOM object that turtl does all of its operations within
	main_container_selector: '#main',

	// global key handler for attaching keyboard events to the app
	keyboard: null,

	loaded: false,
	router: false,

	// whether or not to sync data w/ server
	sync_to_api: false,
	poll_api_for_changes: false,

	// holds the title breadcrumbs
	titles: [],

	controllers: {},

	controllers: {
		pages: null,
		header: null,
		sidebar: null,
		action: null,
		sync: null
	},

	router: null,
	api: null,

	// holds the last successfully routed url
	last_url: null,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	user: null,

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

	// Files collection, used to track file uploads/downloads
	files: null,

	// holds all non-messaged invites (for instance, once we get via the addon
	// or desktop invite page scraping)
	invites: null,
	// -------------------------------------------------------------------------

	init: function()
	{
		if(this.loaded) return false;

		turtl.user = new User();
		turtl.controllers.pages = new PagesController();
		turtl.controllers.header = new HeaderController();
		turtl.controllers.sidebar = new SidebarController();
		turtl.controllers.action = new ActionController();
		turtl.controllers.pages.bind('prerelease', function() {
			// always scroll to the top of the window on page load
			$('wrap').scrollTop = 0;

			// always clear out the available actions on each page load
			turtl.events.trigger('actions:update', false);
		});
		turtl.controllers.pages.bind('start', function() {
			modal.close();
		});

		turtl.events.bind('ui-error', function(msg, err) {
			barfr.barf(msg + ': ' + err.message);
		});

		turtl.keyboard = new Keyboard({
			defaultEventType: 'keydown'
		});
		turtl.keyboard.attach = turtl.keyboard.activate;
		turtl.keyboard.detach = turtl.keyboard.deactivate;
		turtl.keyboard.attach();

		var initial_route = window.location.pathname;
		turtl.setup_user({initial_route: initial_route});

		// if a user exists, log them in
		if(!window._disable_cookie)
		{
			this.user.login_from_cookie();
		}

		this.loaded = true;
		if(window.port) window.port.send('loaded');
		this.route(initial_route);
	},

	setup_user: function(options)
	{
		options || (options = {});

		// update the user_profiles collection on login
		this.user.bind('login', function() {
			// if the user is logged in, we'll put their auth info into the api object
			if(!window._disable_cookie)
			{
				turtl.user.bind('change', turtl.user.write_cookie.bind(turtl.user), 'user:write_changes_to_cookie');
			}
			turtl.controllers.pages.release_sub();
			turtl.sync = new Sync();
			turtl.messages = new Messages();
			turtl.profile = new Profile();
			turtl.search = new Search();
			turtl.files = new Files();
			turtl.api.set_auth(turtl.user.get_auth());

			// setup invites and move invites from local storage into collection
			if(!turtl.invites) turtl.invites = new Invites();
			if(localStorage.invites)
			{
				turtl.invites.reset(Object.values(JSON.parse(localStorage.invites)));
			}
			localStorage.invites = '{}';	// wipe local storage
			if(window.port) window.port.bind('invites-populate', function(invite_data) {
				turtl.invites.reset(Object.values(invite_data));
			}.bind(this));

			// init our sync interface (shows updates on syncing/uploads/downloads)

			turtl.controllers.sync = new SyncController;

			turtl.show_loading_screen(true);
			turtl.update_loading_screen('Initializing Turtl...');

			// sets up local storage
			turtl.setup_local_db().bind({})
				.then(function() {
					// save user to the local DB
					return turtl.user.save();
				})
				.then(function() {
					turtl.update_loading_screen('Loading profile...');
					this.start = window.performance.now();
					return turtl.profile.load();
				})
				.then(function() {
					log.info('profile: loaded in: ', window.performance.now() - this.start);
					turtl.update_loading_screen('Indexing notes...');
					return turtl.search.reindex();
				})
				.then(function() {
					return turtl.setup_syncing();
				})
				.then(function() {
					setTimeout(turtl.show_loading_screen.bind(null, false), 200);
					turtl.controllers.pages.release_sub();
					var initial_route = options.initial_route || default_route;
					if(initial_route.match(/^\/users\//)) initial_route = default_route;
					if(initial_route.match(/index.html/)) initial_route = default_route;
					if(initial_route.match(/background.html/)) initial_route = default_route;
					turtl.route(initial_route);
					if(window.port) window.port.send('profile-load-complete');
				})
				.catch(function(err) {
					barfr.barf('There was a problem with the initial load of your profile: '+ err.message);
					log.error(derr(err));
				});

			// logout shortcut
			turtl.keyboard.addEvent('shift+l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');
		}.bind(turtl));
		turtl.user.bind('logout', function() {
			// stop syncing
			turtl.sync.stop();

			turtl.controllers.pages.release_sub();
			turtl.keyboard.removeEvents('shift+l');
			turtl.messages.unbind(['add', 'remove', 'reset', 'change'], 'turtl:messages:counter');
			turtl.user.unbind_relational('personas', ['add', 'remove', 'reset'], 'turtl:personas:counter');
			turtl.show_loading_screen(false);
			turtl.user.unbind('change', 'user:write_changes_to_cookie');
			turtl.api.clear_auth();
			modal.close();

			localStorage.invites = '{}';	// wipe local storage

			// local storage is for logged in people only
			if(turtl.db)
			{
				turtl.db.close();
				turtl.db = null;
			}

			// clear out invites
			turtl.invites.clear();
			turtl.invites.unbind();

			// this should give us a clean slate
			turtl.user.unbind();
			turtl.user = new User();
			turtl.setup_user();
			turtl.profile.destroy();
			turtl.profile = null;
			turtl.search.clear();
			turtl.search = false;
			turtl.files = false;

			turtl.route('/');

			if(window.port) window.port.send('logout');
		}.bind(turtl));
	},

	setup_local_db: function()
	{
		return database.setup()
			.then(function(db) {
				turtl.db = db;
			});
	},

	wipe_local_db: function(options)
	{
		options || (options = {});

		if(!turtl.user.logged_in)
		{
			console.log('wipe_local_db only works when logged in. if you know the users ID, you can wipe via:');
			console.log('window.indexedDB.deleteDatabase("turtl.<userid>")');
			return false;
		}
		turtl.sync.stop();
		if(turtl.db) turtl.db.close();
		window.indexedDB.deleteDatabase('turtl.'+turtl.user.id());
		turtl.db = null;
		if(options.restart)
		{
			return turtl.setup_local_db()
		}
		else
		{
			return Promise.resolve();
		}
	},

	loading: function(show)
	{
		return false;
	},

	setup_syncing: function()
	{
		// enable syncing
		turtl.sync.start();

		// register our tracking for local syncing (db => in-mem)
		//
		// NOTE: order matters here! since the keychain holds keys in its data,
		// it's important that it runs before everything else, or you may wind
		// up with data that doesn't get decrypted properly. next is the
		// personas, followed by boards, and lastly notes.
		turtl.sync.register_local_tracker('user', new Users());
		turtl.sync.register_local_tracker('keychain', turtl.profile.get('keychain'));
		turtl.sync.register_local_tracker('personas', turtl.profile.get('personas'));
		turtl.sync.register_local_tracker('boards', turtl.profile.get('boards'));
		turtl.sync.register_local_tracker('notes', turtl.profile.get('notes'));
	},

	stop_spinner: false,

	show_loading_screen: function(show, delay)
	{
		if(!$E('body > #loading-overlay'))
		{
			var loading = new Element('div#loading-overlay')
				.set('html', '<div><span></span><ul></ul></div>')
				.inject(document.body, 'top');
		}
		var overlay = $('loading-overlay');
		if(!overlay) return;
		turtl.update_loading_screen(false);
		var do_show = function()
		{
			overlay.setStyle('display', show ? 'table' : '');
			if(show)
			{
				this.stop_spinner = false;
				var spinner = $E('span', overlay);
				spinner.addClass('display');
				var imghtml = '<img src="'+ asset('/images/template/logo.svg') +'" width="40" height="40">';
				spinner.set('html', imghtml + imghtml + imghtml);
				var imgs = spinner.getElements('img');
				var idx = 0;
				//var spinner = $E('.spin', overlay);
				var spin = function()
				{
					idx = (idx + 1) % 4;
					imgs.each(function(img, i) {
						if(i >= idx)
						{
							img.removeClass('show');
							return;
						}
						if(!img.hasClass('show')) img.addClass('show');
					});

					if(spinner.hasClass('display'))
					{
						spinner.removeClass('display');
					}
					else
					{
						spinner.addClass('display');
					}
					spin.delay(750, this);
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

	update_loading_screen: function(msg)
	{
		var text = $E('body > #loading-overlay ul');
		if(!text) return false;
		if(!msg) return text.set('html', '');
		var li = new Element('li').set('html', msg).inject(text);
		setTimeout(function() { li.addClass('show'); }, 10);
	},

	unload: function()
	{
		this.loaded = false;
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
			base: window._route_base || '',
			// we'll do our own first route
			suppress_initial_route: true,
			enable_cb: function(url) {
				var enabled = true;
				if(turtl.user.logged_in)
				{
				}

				if(turtl.user.logged_in && (!turtl.profile || !turtl.profile.profile_data))
				{
					turtl.controllers.pages.trigger('loaded');
					enabled = false;
				}
				if(!turtl.loaded) enabled = false;
				return enabled;
			}
		}, options);
		turtl.router = new Composer.Router(config.routes, options);
		turtl.router.bind_links({ filter_trailing_slash: true });
		turtl.router.bind('route', turtl.controllers.pages.trigger.bind(turtl.controllers.pages, 'route'));
		turtl.router.bind('preroute', turtl.controllers.pages.trigger.bind(turtl.controllers.pages, 'preroute'));
		turtl.router.bind('fail', function(obj) {
			log.error('route failed:', obj.url, obj);
		});
		turtl.router.bind('preroute', function(boxed) {
			boxed.path = boxed.path.replace(/\-\-.*$/, '');
			return boxed;
		});

		// save turtl.last_url
		var route = null;
		turtl.router.bind('route', function() {
			turtl.last_url = route;
			route = window.location.pathname;
		});
	},

	route: function(url, options)
	{
		options || (options = {});
		this.setup_router(options);
		if(
			!this.user.logged_in &&
			!url.match(/\/users\/login/) &&
			!url.match(/\/users\/join/)
		)
		{
			url = '/users/login';
		}
		this.router.route(url, options);
	},

	_set_title: function()
	{
		var title = 'Turtl';
		var back = false;
		if(turtl.titles[0])
		{
			title = turtl.titles[0].title;
			back = turtl.titles[0].back;
		}

		var html = title;
		if(back)
		{
			html = '<a href="'+ back +'" rel="back"><icon>&#59229;</icon>&nbsp;&nbsp;'+ html +'</a>';
		}
		var html = '<em>'+html+'</em>';

		document.title = title;
		var header = document.getElement('header h1');
		header.set('html', html);
	},

	push_title: function(title, backurl)
	{
		turtl.titles.unshift({
			title: title,
			back: backurl
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

	push_modal_url: function(url)
	{
		var back = turtl.router.cur_path().replace(/\-\-.*/, '');
		turtl.route(back + '--' + url);
		return function()
		{
			turtl.route(back);
		};
	}
};

var modal = null;
var barfr = null;
var markdown = null;

window.addEvent('domready', function() {
	Composer.promisify({warn: true});

	window.port = window.port || false;
	window._base_url = config.base_url || '';
	turtl.site_url = config.site_url || '';
	turtl.base_window_title = document.title.replace(/.*\|\s*/, '');
	turtl.api = new Api(
		config.api_url,
		'',
		function(cb_success, cb_fail) {
			return function(data)
			{
				if(typeof(data) == 'string')
				{
					data = JSON.parse(data);
				}
				if(data.__error) cb_fail(data.__error);
				else cb_success(data);
			};
		}
	);

	// create the modal object
	modal = new TurtlModal({ inject: '#wrap' });

	// create the barfr
	barfr = new Barfr('barfr', {});

	// prevent backspace from navigating back
	$(document.body).addEvent('keydown', function(e) {
		if(e.key != 'backspace') return;
		var is_input = ['input', 'textarea'].contains(e.target.get('tag'));
		var is_button = is_input && ['button', 'submit'].contains(e.target.get('type'));
		if(is_input && !is_button) return;

		// prevent backspace from triggering if we're not in a form element
		e.stop();
	});

	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		pedantic: false,
		sanitize: false,
		smartLists: true
	});

	var clid = localStorage.client_id;
	if(!clid) clid = localStorage.client_id = tcrypt.random_hash();
	turtl.client_id = clid;
	turtl.init();
});

// set up a global error handler that XHRs shit to the API so we know when bugs
// are cropping up
if(config.catch_global_errors)
{
	var enable_errlog = true;
	window.onerror = function(msg, url, line)
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
}

