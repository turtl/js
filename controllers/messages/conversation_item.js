var MessageItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
	},

	events: {
	},

	model: null,

	init: function()
	{
		this.render();
	},

	release: function()
	{
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var personas = this.model.get('personas');
		var my_persona_ids = tagit.user.get('personas').map(function(p) { return p.id(); });
		var my_personas = personas.filter(function(p) {
			return my_persona_ids.contains(p.id());
		});
		var remote_personas = personas.filter(function(p) {
			return !my_persona_ids.contains(p.id());
		});
		var content = Template.render('messages/item', {
			conversation: toJSON(this.model),
			my_personas: toJSON(my_personas),
			their_personas: toJSON(remote_personas)
		});
		this.html(content);
	}
});
