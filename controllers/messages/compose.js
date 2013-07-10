var MessageComposeController = Composer.Controller.extend({
	elements: {
	},

	persona_selector: null,

	init: function()
	{
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
		var to_persona = null;
		if(this.model)
		{
			var personas = this.model.get('personas');
			var my_persona_ids = tagit.user.get('personas').map(function(p) { return p.id(); });
			to_persona = personas.find(function(p) {
				return !my_persona_ids.contains(p.id());
			});
		}
		var content = Template.render('messages/compose', {
			to: to_persona ? toJSON(to_persona) : null,
			conversation: this.model ? toJSON(this.model) : {}
		});
		this.html(content);
		if(this.persona_selector) this.persona_selector.release();
		this.persona_selector = new PersonaSelector({
			persona: to_persona
		});
	}
});
