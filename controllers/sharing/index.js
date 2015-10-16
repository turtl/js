var SharingController = Composer.Controller.extend({
	elements: {
		'.invites-to-me': 'el_invites_to_me',
		'.boards-to-me': 'el_boards_to_me'
	},

	init: function()
	{
		turtl.push_title('Sharing');
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('notification:clear', 'share');

		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.with_bind(turtl.events, 'notification:set', function(type) {
			if(type != 'share') return;
			turtl.events.trigger('notification:clear', 'share');
		});

		this.render();
	},

	render: function()
	{
		if(!turtl.sync.connected) return this.html(view.render('sharing/noconnection'));

		var my_persona = turtl.profile.get('personas').first();
		if(!my_persona) return this.html(view.render('sharing/nopersona'));
		var persona_id = my_persona.id();

		var invites = turtl.profile.get('invites');
		var boards = turtl.profile.get('boards');

		var invites_to_me = new Composer.FilterCollection(invites, {
			filter: function(model) {
				return model.get('to') == persona_id ||
					(model.get('from') != persona_id && !model.get('has_persona'));
			}
		});
		var boards_to_me = new Composer.FilterCollection(boards, {
			filter: function(model) {
				var privs = model.get('privs');
				return model.get('shared') &&
					privs &&
					(privs[persona_id] || {}).perms > 0
			}
		});

		this.html(view.render('sharing/index'));

		this.track_subcontroller('invites-to-me', function() {
			return new SharingInvitesListController({
				inject: this.el_invites_to_me,
				collection: invites_to_me,
				to_me: true
			});
		}.bind(this));
		this.track_subcontroller('boards-to-me', function() {
			return new SharingBoardsListController({
				inject: this.el_boards_to_me,
				collection: boards_to_me,
				to_me: true
			});
		}.bind(this));
	}
});

