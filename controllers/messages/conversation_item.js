var ConversationItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
	},

	events: {
	},

	model: null,

	init: function()
	{
		if(!this.model) return false;
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
		}).map(function(p) { return toJSON(p); });
		var remote_personas = personas.filter(function(p) {
			return !my_persona_ids.contains(p.id());
		}).map(function(p) { return toJSON(p); });
		var content = Template.render('messages/conversation_item', {
			conversation: toJSON(this.model),
			my_personas: my_personas,
			their_personas: remote_personas
		});
		this.html(content);
	}
});
