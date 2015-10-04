var BoardsShareController = Composer.Controller.extend({
	class_name: 'board-share',

	elements: {
		'ul.item-list': 'el_item_list'
	},

	events: {
		'click .nopersona a': 'open_add_persona'
	},

	board_id: null,

	model: null,

	init: function()
	{
		if(!this.board_id) throw new Error('boards: share: board_id not specified');
		if(!this.model)
		{
			this.model = turtl.profile.get('boards').get(this.board_id);
		}
		if(!this.model) throw new Error('boards: share: bad model');

		turtl.push_title('Sharing: '+ this.model.get('title'), '/boards');
		this.bind('release', turtl.pop_title.bind(null, false));

		var has_persona = turtl.profile.get('personas').size() > 0;
		this.render({no_persona: !has_persona});

		this.with_bind(this.model, ['change'], this.render.bind(this));

		// set up the action button
		if(has_persona)
		{
			this.track_subcontroller('actions', function() {
				var actions = new ActionController();
				actions.set_actions([{title: 'New member', name: 'share', icon: 'add_user'}]);
				this.with_bind(actions, 'actions:fire', this.open_add.bind(this));
				return actions;
			}.bind(this));
		}
	},

	render: function(options)
	{
		options || (options = {});

		if(options.no_persona)
		{
			this.html(view.render('boards/share/nopersona'));
		}
		else
		{
			var board = this.model.toJSON();
			var members = board.personas;
			var pending = turtl.profile.get('invites').toJSON().filter(function(invite) {
				return invite.object_id == board.id;
			});
			this.html(view.render('boards/share/index', {
				board: board,
				has_shares: members.length > 0 || pending.length > 0
			}));
			this.track_subcontroller('members', function() {
				return new BoardsShareListController({
					el: this.el_item_list,
					model: this.model,
					collection: this.model.get('personas')
				});
			}.bind(this));
			this.track_subcontroller('pending', function() {
				return new BoardsShareListController({
					el: this.el_item_list,
					model: this.model,
					pending: true,
					collection: turtl.profile.get('invites')
				});
			}.bind(this));
		}
	},

	open_add: function()
	{
		new BoardsShareInviteController({model: this.model});
	},

	open_add_persona: function(e)
	{
		if(e) e.stop();
		turtl.route('/personas');
		setTimeout(function() {
			new PersonasEditController();
		}, 10);
	}
});

