var PersonasController = Composer.Controller.extend({
	class_name: 'personas',

	elements: {
		'.personas-container': 'el_personas'
	},

	filter: null,

	init: function()
	{
		turtl.push_title('Personas');
		this.bind('release', turtl.pop_title.bind(null, false));

		/*
		this.filter = new Composer.FilterCollection(turtl.profile.get('personas'), {
			filter: function(p) { return p.get('user_id') == turtl.user.id(); }
		});
		this.bind('release', this.filter.detach.bind(this.filter));
		*/
		this.filter = turtl.user.get('personas');

		this.with_bind(this.filter, ['add', 'remove', 'reset', 'change'], this.render.bind(this));
		this.render();
	},

	render: function()
	{
		var persona = this.filter.first();
		if(persona)
		{
			this.html(view.render('personas/view', {
				persona: persona.toJSON()
			}));
			var action = this.get_subcontroller('actions');
			if(action) action.release();
		}
		else
		{
			this.html(view.render('personas/empty', {}));

			// set up the action button
			this.track_subcontroller('actions', function() {
				var actions = new ActionController();
				actions.set_actions([{title: 'New persona', name: 'add'}]);
				this.with_bind(actions, 'actions:fire', function(action) {
					switch(action)
					{
						case 'add': this.open_add(); break;
					}
				}.bind(this));
				return actions;
			}.bind(this));
		}
	},

	open_add: function()
	{
		new PersonasEditController();
	},

	open_edit: function(e)
	{
	}
});

