var MessageComposeController = Composer.Controller.extend({
	elements: {
		'div.to': 'selector'
	},

	model: null,
	persona_selector: null,

	init: function()
	{
		if(!this.model) this.model = new Conversation();

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
			conversation: toJSON(this.model)
		});
		this.html(content);
		if(this.persona_selector) this.persona_selector.release();
		this.persona_selector = new PersonaSelector({
			inject: this.selector,
			persona: to_persona,
			lock: true
		});
	}
});
