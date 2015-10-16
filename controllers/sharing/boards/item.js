var SharingBoardsItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.share-actions': 'actions'
	},

	events: {
		'click': 'open_board',
		'click .menu a[rel=leave-this-board]': 'leave_board'
	},

	model: null,

	init: function()
	{
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.render();
	},

	render: function()
	{
		var timestamp = id_timestamp(this.model.id());
		var my_persona = turtl.profile.get('personas').first();
		var persona_id = my_persona && my_persona.id();

		var perms = '';
		var privs = this.model.get('privs') || {};
		switch((privs[persona_id] || {}).perms)
		{
		case 1: perms = 'Read'; break;
		case 2: perms = 'Write'; break;
		case 3: perms = 'Admin'; break;
		}

		this.html(view.render('sharing/boards/item', {
			board: this.model.toJSON(),
			permissions: perms
		}));
		var actions = [[
			{name: 'Leave this board'}
		]];
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				actions: actions
			});
		}.bind(this));
		if(this.el_unlocker)
		{
			this.el_unlocker.set('slide', {duration: 300});
			this.el_unlocker.get('slide').hide();
		}
	},

	open_board: function(e)
	{
		if(Composer.match(e.target, '.share-actions *')) return;
		if(e) e.stop();
		turtl.route('/boards/'+this.model.id()+'/notes?back='+encodeURIComponent('/sharing'));
	},

	leave_board: function(e)
	{
		if(e) e.stop();
		var persona = turtl.profile.get('personas').first();
		this.model.remove_persona(persona);
	}
});

