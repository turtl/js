var InvitesController = Composer.Controller.extend({
	xdom: true,
	class_name: 'invite-list',

	modal: null,

	init: function() {
		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: i18next.t('Your invites'),
		}, this.modal_opts && this.modal_opts() || {}));

		var close = this.modal.close.bind(this.modal);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.render()
			.bind(this)
			.then(function() {
				this.modal.open(this.el);
			});
	},

	render: function() {
		var invites = turtl.profile.get('invites').toJSON();
		return this.html(view.render('spaces/sharing/invites', {
			invites: invites,
		}));
	},
});

