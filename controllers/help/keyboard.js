var KeyboardShortcutHelpController = Composer.Controller.extend({
	modal: null,

	init: function() {
		// don't allow multiple tag windows
		turtl.events.trigger('help:keyboard:open');
		this.with_bind(turtl.events, 'help:keyboard:open', this.trigger.bind(this, 'close'));

		this.modal = new TurtlModal({
			show_header: true,
			title: i18next.t('Keyboard shortcuts')
		});

		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function() {
		this.html(view.render('help/bindings'));
	},
});

