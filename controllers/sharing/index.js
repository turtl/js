var SharingController = Composer.Controller.extend({
	init: function()
	{
		turtl.push_title('Sharing');
		this.bind('release', turtl.pop_title.bind(null, false));
		this.with_bind(turtl.profile.get('boards'), ['add', 'remove', 'reset', 'change'], this.render.bind(this));
		this.with_bind(turtl.profile.get('invites'), ['add', 'remove', 'reset', 'change'], this.render.bind(this));

		turtl.events.trigger('notification:clear', 'share');

		this.render();
	},

	render: function()
	{
		var my_persona = turtl.profile.get('personas').first();
		if(!my_persona) return this.html(view.render('sharing/nopersona'));
		var persona_id = my_persona.id();

		var invites = turtl.profile.get('invites').toJSON();
		var boards = turtl.profile.get('boards').toJSON();

		var invites_from_me = invites.filter(function(invite) {
			return invite.from == persona_id;
		});
		var invites_to_me = invites.filter(function(invite) {
			return invite.to == persona_id;
		});
		var boards_i_share = boards.filter(function(board) {
			return !board.shared && Object.keys(board.privs || {}).length > 0;
		});
		var boards_shared_with_me = boards.filter(function(board) {
			return board.shared;
		});

		this.html(view.render('sharing/index', {
			invites_to_me: invites_to_me,
			invites_from_me: invites_from_me,
			boards_shared_with_me: boards_shared_with_me,
			boards_i_share: boards_i_share
		}));
	}
});

