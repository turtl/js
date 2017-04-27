var InvitesController = Composer.Controller.extend({
	xdom: true,
	class_name: 'invite-list interface',

	events: {
		'click .invite .actions input[rel=accept]': 'open_accept',
		'click .invite .actions input[rel=delete]': 'open_delete',
	},

	init: function() {
		var invites = turtl.profile.get('invites');
		var title = i18next.t('Your invites');
		turtl.push_title(title, null, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [
				{name: i18next.t('Settings'), href: '/settings'},
			]}
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			turtl.route(atag.get('href'));
		}.bind(this));

		this.with_bind(invites, ['add', 'remove', 'reset', 'change'], this.render.bind(this));
		this.render();
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

	get_invite: function(e) {
		var li = Composer.find_parent('li.invite', e.target);
		if(!li) return false;
		var id = li.get('rel');
		if(!id) return false;
		return turtl.profile.get('invites').get(id);
	},

	open_accept: function(e) {
		if(e) e.stop();
		var invite = this.get_invite(e);
		if(!invite) return;
	},

	open_delete: function(e) {
		if(e) e.stop();
		var invite = this.get_invite(e);
		if(!invite) return;
		if(!confirm(i18next.t('Really delete this invite?'))) return;
		return invite.destroy()
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting that invite'), err);
				log.error('invites: delete: ', err, derr(err));
			});
	},
});

