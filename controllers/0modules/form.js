var FormController = Composer.Controller.extend({
	elements: {
		'.button.submit': 'btn_submit',
		'.button-row .desc': 'el_desc'
	},

	events: {
		'submit form': 'submit',
		'click .button.submit': 'do_submit',
		'click .button.cancel': 'cancel'
	},

	buttons: true,
	button_tabindex: null,
	formclass: 'standard-form',
	action: null,
	footer_actions: [],
	disabled: false,
	show_cancel: true,
	bind_keys: true,
	disable_esc: false,
	disable_browser_validation: false,

	view_state: {
		footer_desc: '',
		highlight_button: false,
	},

	init: function()
	{
		this.setup_form_key_handler();

		if(!this.action) this.action = i18next.t('Create');
		return this.parent.apply(this, arguments);
	},

	html: function(content)
	{
		return this.parent(view.render('modules/form-layout', {
			state: this.view_state,
			action: this.action,
			formclass: this.formclass,
			buttons: this.buttons,
			tabindex: this.button_tabindex,
			content: content,
			footer_actions: this.footer_actions,
			show_cancel: this.show_cancel,
			disabled: this.disabled,
			disable_browser_validation: this.disable_browser_validation,
		}));
	},

	cancel: function(e)
	{
		this.trigger('cancel');
	},

	/**
	 * we use a custom keyboard handler here, specifically DISABLING the global
	 * Turtl key handler and injecting our own. the idea is that we don't want
	 * the space menu showing up when you hit 's' in a dumb form.
	 *
	 * we look for `esc` and `ctrl+enter` here, mainly.
	 *
	 * another thing we do is only let one form at a time handle keys. this is
	 * done using an event-based tracking/locking system where basically the
	 * last form to be opened gets the lock (and once it releases, the form it
	 * stole the lock from gets it back).
	 */
	setup_form_key_handler: function() {
		turtl.keyboard.detach();	// disable keyboard shortcuts while editing

		// ---------------------------------------------------------------------
		// only allow one form at a time to use the global key handler. here, we
		// send the "ok, jerks, i'm taking the kayboard handler" event BEFORE we
		// start listening to the event ourselves, so we disable for everyone
		// but ourselves.
		var handler_name = this.cid()+'key-handler';
		turtl.events.trigger('forms:disable-key-handler', true, handler_name);
		// make sure we release our handler lock
		this.bind('release', function() {
			turtl.events.trigger('forms:disable-key-handler', false, handler_name);
		});
		// tracks who's who among disabled forms
		var keyboard_lock = {};
		this.with_bind(turtl.events, 'forms:disable-key-handler', function(yesno, name) {
			if(yesno === false) {
				delete keyboard_lock[name];
			} else {
				keyboard_lock[name] = true;
			}
		});
		// ---------------------------------------------------------------------

		// ...BUT close on escape
		var key_handler = function(e) {
			// is someone else locking the keyboard handler?
			if(Object.keys(keyboard_lock).length > 0) return;
			if(!this.bind_keys) return;
			var ctrl_or_cmd = e.control || e.meta;
			if(e.key == 'esc' && !this.disable_esc) {
				return this.trigger('cancel');
			}
			if(ctrl_or_cmd && (e.key == 'enter' || e.key == 'return')) {
				e.stop();
				return this.submit(e);
			}
		}.bind(this);
		document.body.addEvent('keydown', key_handler);
		this.bind('release', function() {
			turtl.keyboard.attach();
			document.body.removeEvent('keydown', key_handler);
		});
	},

	check_errors: function(errors)
	{
		if(errors.length == 0) return true;

		errors.slice(0).reverse().forEach(function(err) {
			barfr.barf(err[1]);
			var inp = err[0];
			inp.addClass('error');
			setTimeout(function() { inp.removeClass('error'); }, 8000);
		});
		errors[0][0].focus();
	},

	submit: function(e)
	{
		console.log('form: submit: overwrite me');
	},

	do_submit: function(e)
	{
		if(this.disabled)
		{
			if(e) e.stop();
			return;
		}
		this.submit(e);
	},

	requires_connection: function(options)
	{
		options || (options = {});

		var connect_barf = null;
		var close_barf = function() {
			if(!connect_barf) return;
			barfr.close_barf(connect_barf);
			connect_barf = null;
		};
		var check_disconnect = function()
		{
			close_barf();
			if(turtl.connected)
			{
				this.disable(false);
			}
			else
			{
				connect_barf = barfr.barf(options.msg);
				this.disable(true);
			}
		}.bind(this);
		this.with_bind(turtl.events, 'sync:connected', check_disconnect);
		check_disconnect();
	},

	disable: function(yesno)
	{
		this.disabled = !!yesno;
		this.render();
	}
});

