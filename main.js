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
		sync: null,
	},

	router: null,
	api: null,

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
		turtl.controllers.pages.bind('prerelease', function() {
			$('wrap').scrollTop = 0;
		});

		turtl.keyboard = new Keyboard({
			defaultEventType: 'keydown'
		});
		turtl.keyboard.attach = turtl.keyboard.activate;
		turtl.keyboard.detach = turtl.keyboard.deactivate;

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
			turtl.controllers.pages.release();
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

			// sets up local storage
			turtl.setup_local_db()
				.then(function() {
					// save user to the local DB
					return turtl.user.save();
				})
				.then(function() {
					return turtl.profile.load();
				})
				.then(function() {
					// move keys from the user's settings into the keychain
					turtl.show_loading_screen(false);
					turtl.controllers.pages.release();
					turtl.last_url = '';
					turtl.search.reindex();
					var initial_route = options.initial_route || '/';
					if(initial_route.match(/^\/users\//)) initial_route = '/';
					if(initial_route.match(/index.html/)) initial_route = '/';
					if(initial_route.match(/background.html/)) initial_route = '/';
					turtl.setup_syncing();
					if(window.port) window.port.send('profile-load-complete');
				})
				.catch(function(e) {
					barfr.barf('There was a problem with the initial load of your profile: '+ e);
					log.error(e);
				});

			// logout shortcut
			turtl.keyboard.addEvent('S-l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');
		}.bind(turtl));
		turtl.user.bind('logout', function() {
			// stop syncing
			turtl.sync.stop();

			turtl.controllers.pages.release();
			turtl.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
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
			turtl.setup_profile();
			turtl.setup_header_bar();
			turtl.profile.destroy();
			turtl.profile = null;
			turtl.search.destroy();
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

		// always sync from local db => in-mem models, even if syncing is
		// disabled. this not only keeps memory synchronized with what's being
		// stored, it allows us to sync changes between pieces of turtl client-
		// side. for instance, we can save data in an app tab, and a second
		// later it will be synced to our background process.
		turtl.sync.sync_from_db();

		if(turtl.sync_to_api)
		{
			var notes = new Notes();
			notes.start();	// poll for note recrods without files

			// note that our remote trackers use brand new instances of the
			// models/collections we'll be tracking. this enforces a nice
			// separation between remote syncing and local syncing (and
			// encourages all data changes to flow through the local db).
			turtl.sync.register_remote_tracker('user', new Users());
			turtl.sync.register_remote_tracker('keychain', new Keychain());
			turtl.sync.register_remote_tracker('personas', new Personas());
			turtl.sync.register_remote_tracker('boards', new Boards());
			turtl.sync.register_remote_tracker('notes', notes);
			turtl.sync.register_remote_tracker('files', new Files());

			// start API -> local db sync process. calls POST /sync, which grabs
			// all the latest changes for our profile, which are then applied to
			// our local db.
			turtl.sync.sync_from_api();

			// start the local db -> API sync process.
			turtl.sync.sync_to_api();

			// handles all file jobs (download mainly)
			turtl.files.start_consumer();
		}
	},

	stop_spinner: false,

	show_loading_screen: function(show, delay)
	{
		var overlay = $('loading-overlay');
		if(!overlay) return;
		var do_show = function()
		{
			overlay.setStyle('display', show ? 'table' : '');
			if(show)
			{
				this.stop_spinner = false;
				var text = $E('span', overlay);
				text.addClass('display');
				var imghtml = '<img src="'+ img('/images/template/logo.svg') +'" width="40" height="40">';
				text.set('html', imghtml + imghtml + imghtml);
				var imgs = text.getElements('img');
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

					if(text.hasClass('display'))
					{
						text.removeClass('display');
					}
					else
					{
						text.addClass('display');
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
		options || (options = {});

		if(!this.router)
		{
			options = Object.merge({
				base: window._route_base || '',
				// we'll do our own first route
				suppress_initial_route: true,
				enable_cb: function(url) { return turtl.loaded; }
			}, options);
			this.router = new Composer.Router(config.routes, options);
			this.router.bind_links({ filter_trailing_slash: true });
			this.router.bind('route', this.route_callback.bind(this));
			this.router.bind('preroute', function(url) {
				this.controllers.pages.trigger('preroute', url);
			}.bind(this));
			this.router.bind('fail', function(obj) {
				log.error('route failed:', obj.url, obj);
			});
		}
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

	route_callback: function(url)
	{
		this.last_url = url + window.location.search;
		this.controllers.pages.trigger('route', url);
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
			console.log('back: ', back);
			if(back == '#modal.close')
			{
				modal.close();
			}
			else
			{
				turtl.route(entry.back);
			}
		}
	}
};

var modal = null;
var barfr = null;
var markdown = null;

window.addEvent('domready', function() {
	Composer.promisify({warn: true});

	window.port = window.port || false;
	window.__site_url = window.__site_url || '';
	window.__api_url = config.api_url || window.__api_url || '';
	window.__api_key = window.__api_key || '';
	window._base_url = window._base_url || '';
	turtl.site_url = __site_url || '';
	turtl.base_window_title = document.title.replace(/.*\|\s*/, '');
	turtl.api = new Api(
		__api_url || '',
		__api_key || '',
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

	(function() {
		if(window.port) window.port.bind('debug', function(code) {
			if(!window._debug_mode) return false;
			var res = eval(code);
			console.log('turtl: debug: ', res);
		});
	}).delay(100);

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
	if(!clid)
	{
		clid = localStorage.client_id = tcrypt.random_hash();
	}
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
				log.error('error catcher: error posting (how ironic): ', err);
				// error posting, disable log for 30s
				enable_errlog = false;
				(function() { enable_errlog = true; }).delay(30000);
			});
	};
}

