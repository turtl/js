// MT1.11 Compat - who the fuck would remove these??
//
var $E = function(selector, filter){ return ($(filter) || document).getElement(selector); };
var $ES = function(selector, filter){ return ($(filter) || document).getElements(selector); };

// make our client IDs such that they are always sorted *after* real,
// server-generated IDs ('z.') and they are chronologically sortable from each
// other. Also, append in the original cid() at the end for easier debugging.
//
// NOTE: *DO NOT* change the cid scheme without updating the cid_match regex
// below!
var _cid		=	Composer.cid;
Composer.cid	=	function() { return 'z.' + (new Date().getTime()).toString(16) + '.' + _cid(); };
var cid_match	=	/^z\.[0-9a-f]+\.c[0-9]+$/;

var turtl	=	{
	site_url: null,

	// holds the user model
	user: null,

	// create a app-wide event bus
	events: new Composer.Event(),

	// an object for communicating remotely (with the core)
	remote: null,

	// holds the DOM object that turtl does all of its operations within
	main_container_selector: '#main',

	// a place to reference composer controllers by name
	controllers: {},

	// global key handler for attaching keyboard events to the app
	keyboard: null,

	loaded: false,
	router: false,

	// -------------------------------------------------------------------------
	// Data section
	// -------------------------------------------------------------------------
	// holds messages for all the user's personas
	messages: null,

	// holds persona/board/note data for the user (ie, the user's profile)
	profile: null,

	// Files collection, used to track file uploads/downloads
	files: null,

	// holds all non-messaged invites (for instance, once we get via the addon
	// or desktop invite page scraping)
	invites: null,
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

		// create our js <--> core comm object
		if(!window.port) throw new Error('window.port not present (required for turtl to work)!');
		turtl.remote = new RemoteHandler(window.port.comm);

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
		this.setup_header_bar();

		this.loaded	=	true;
		if(window.port) window.port.send('loaded');
		this.route(initial_route);
	},

	setup_profile: function(options)
	{
		options || (options = {});

		turtl.remote.bind('profile-loading', function() {
			turtl.show_loading_screen(true);
		});
		turtl.remote.bind('profile-loading-progress', function(data) {
			turtl.show_loading_screen(data);
		});
		turtl.remote.bind('profile-loaded', function() {
			turtl.show_loading_screen(false);
			if(!turtl.profile) turtl.profile = new Profile();
			(function() { turtl.profile.trigger('loaded'); }).delay(100);
		});

		turtl.user.bind('login', function() {
			turtl.controllers.pages.release_current();

			if(!turtl.profile) turtl.profile = new Profile();
			if(!turtl.invites) turtl.invites = new Invites();
			turtl.messages = new Messages();
			turtl.search = new Search();
			turtl.files = new Files();
			if(Tstorage.invites)
			{
				turtl.invites.reset(Object.values(JSON.parse(Tstorage.invites)));
			}
			if(window.port) window.port.bind('invites-populate', function(invite_data) {
				turtl.invites.reset(Object.values(invite_data));
			});

			turtl.profile.bind_once('loaded', function() {
				// profile is loaded, load the boards view
				turtl.last_url = '';
				turtl.route('/');
			});

			// logout shortcut
			turtl.keyboard.bind_once('S-l', function() {
				turtl.route('/users/logout');
			}, 'dashboard:shortcut:logout');

			// notify addon of message changes
			turtl.messages.bind(['add', 'remove', 'reset', 'change'], function() {
				var num_messages	=	turtl.messages.map(function(msg) {
					return msg.id();
				});
				if(window.port) window.port.send('num-messages', num_messages.length);
			}, 'turtl:messages:counter');
		});

		turtl.user.bind('logout', function() {
			turtl.controllers.pages.release_current();
			turtl.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
			turtl.messages.unbind(['add', 'remove', 'reset', 'change'], 'turtl:messages:counter');
			modal.close();

			Tstorage.invites	=	'{}';	// wipe local storage

			// clear out invites
			turtl.invites.clear();
			turtl.invites.unbind();

			// this should give us a clean slate
			turtl.user.unbind();
			turtl.user	=	new User();
			turtl.setup_profile();
			turtl.setup_header_bar();
			turtl.profile.destroy();
			turtl.profile	=	null;
			turtl.files		=	false;

			turtl.route('/');

			if(window.port) window.port.send('logout');
		});
	},

	wipe_local_db: function(options)
	{
		options || (options = {});

		if(!turtl.user.logged_in)
		{
			log.error('wipe_local_db only works when logged in. if you know the users ID, you can wipe via:');
			log.error('window.indexedDB.deleteDatabase("turtl.<userid>")');
			return false;
		}
		turtl.remote.send('cmd', {name: 'wipe-local-db'}, {
			success: options.complete
		});
	},

	setup_header_bar: function()
	{
		// setup the header bar
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

	show_loading_screen: function(show)
	{
		var overlay = $('loading-overlay');
		if(!overlay) return;

		overlay.setStyle('display', show ? 'table' : '');
		if(show === true)
		{
			var text = overlay.getElement('span');
			var imghtml = '<img src="'+ img('/images/template/logo.svg') +'" width="40" height="40">';
			text.set('html', imghtml + imghtml + imghtml);
			var imgs = text.getElements('img');
			var idx = 0;
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
			}.bind(this);
			turtl.show_loading_screen._interval = setInterval(spin, 750);
		}
		else if(show.length !== undefined)
		{
			var desc = overlay.getElement('p');
			if(!desc) return;
			var action = show[0];
			var item = show[1];
			var str = '';
			switch(action)
			{
			case 'populate': str += 'Populating '+ item; break;
			case 'index': str += 'Indexing profile'; break;
			}
			desc.set('html', str);
		}
		else if(turtl.show_loading_screen._interval)
		{
			var desc = overlay.getElement('p');
			if(desc) desc.set('html', '&nbsp;');
			clearInterval(turtl.show_loading_screen._interval);
			turtl.show_loading_screen._interval = null;
		}
	},

	setup_router: function(options)
	{
		options || (options = {});

		if(!this.router)
		{
			options	=	Object.merge({
				// we'll process our own QS, THXLOLOLOLOLOLOLOLOLOLOLOLOLOLOL!!!
				process_querystring: false,

				base: window._route_base || '',

				// we'll do our own first route
				suppress_initial_route: true,

				enable_cb: function(url)
				{
					return this.loaded;
				}.bind(this)
			}, options);
			this.router	=	new Composer.Router(config.routes, options);
			this.router.bind_links({
				filter_trailing_slash: true,
				do_state_change: function(a_tag)
				{
					turtl.controllers.pages.trigger('onroute', path);
					return true;
				}
			});
			this.router.bind('route', this.route_callback.bind(this));
			this.router.bind('preroute', function(url) {
				this.controllers.pages.trigger('preroute', url);
			}.bind(this));
			this.router.bind('fail', function(obj) {
				log.error('route failed:', obj.url, obj);
				console.trace();
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
			!url.match(/\/users\/join/) &&
			!url.match(/\/bookmark/)
		)
		{
			url = '/users/login';
		}
		log.debug('route: ', url, options);
		this.router.route(url, options);
	},

	route_callback: function(url)
	{
		this.last_url	=	url + window.location.search;
		this.controllers.pages.trigger('route', url);
	}
};

var modal		=	null;
var barfr		=	null;
var markdown	=	null;

window.addEvent('domready', function() {
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
	turtl.load_controller('pages', PagesController);

	(function() {
		if(window.port) window.port.bind('debug', function(code) {
			if(!window._debug_mode) return false;
			var res	=	eval(code);
			log.debug('turtl: debug: ', res);
		});
	}).delay(100);

	// prevent backspace from navigating back
	$(document.body).addEvent('keydown', function(e) {
		if(e.key != 'backspace') return;
		var is_input	=	['input', 'textarea'].contains(e.target.get('tag'));
		var is_button	=	is_input && ['button', 'submit'].contains(e.target.get('type'));
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

	// init it LOL
	turtl.init.delay(50, turtl);
});

// set up a global error handler that XHRs shit to the API so we know when bugs
// are cropping up
if(config.catch_global_errors)
{
	var enable_errlog	=	true;
	window.onerror	=	function(msg, url, line)
	{
		if(!turtl.api || !enable_errlog) return;
		log.error('remote error log: ', arguments);
		// remove filesystem info
		url	=	url.replace(/^.*\/data\/app/, '/data/app');
		if(!turtl.remote) return;
		turtl.remote.send('ui-error', {data: {client: config.client, version: config.version, msg: msg, url: url, line: line}}, {
			error: function(err) {
				log.error(err);
				// error posting, disable log for 30s
				enable_errlog	=	false;
				(function() { enable_errlog = true; }).delay(30000);
			}
		});
	};
}

