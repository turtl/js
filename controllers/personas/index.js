var PersonasController = Composer.Controller.extend({
	elements: {
	},

	events: {
		'click .button.add': 'add_persona',
		'click a.add': 'add_persona'
	},

	collection: null,

	init: function()
	{
		if(!this.collection) this.collection = tagit.user.get('personas');
		this.render();
		modal.open(this.el);
		var modalclose = function() {
			modal.removeEvent('close', modalclose);
			this.release();
		}.bind(this);
		modal.addEvent('close', modalclose);
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var personas = this.collection.map(function(persona) {
			return toJSON(persona);
		});
		var content = Template.render('personas/index', {
			personas: personas
		});
		this.html(content);
	},

	add_persona: function(e)
	{
		if(e) e.stop();
		this.release();
		new PersonaEditController({
			collection: this.collection
		});
	}
});
