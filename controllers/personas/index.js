var PersonasController = Composer.Controller.extend({
	class_name: 'personas',

	elements: {
		'.persona-view': 'el_view'
	},

	filter: null,

	init: function()
	{
		turtl.push_title('Your persona');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.filter = turtl.profile.get('personas');
		this.with_bind(this.filter, ['add', 'remove', 'reset', 'change'], this.render.bind(this));
		this.render();
	},

	render: function()
	{
		var persona = this.filter.first();
		if(persona)
		{
			this.html(view.render('personas/index', {
				persona: persona.toJSON()
			}));
			var action = this.get_subcontroller('actions');
			if(action) action.release();
			this.track_subcontroller('view', function() {
				return new PersonasViewController({
					inject: this.el_view,
					model: persona
				});
			}.bind(this));
		}
		else
		{
			this.html(view.render('personas/empty', {}));
			turtl.events.trigger('header:set-actions', false);
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
	}
});

