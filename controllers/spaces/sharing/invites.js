var InvitesController = Composer.Controller.extend({
	xdom: true,
	class_name: 'invite-list interface',

	init: function() {
		var title = i18next.t('Your invites');
		turtl.push_title(title, null, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		this.render()
			.bind(this)
			.then(function() {
				this.modal.open(this.el);
			});
	},

	render: function() {
		var invites = turtl.profile.get('invites').toJSON();
		var empty = invites.length == 0;
		return this.html(view.render('spaces/sharing/invites', {
			invites: invites,
		})).bind(this)
			.then(function() {
				if(empty) this.el.addClass('is-empty');
				else this.el.removeClass('is-empty');
			});
	},
});

