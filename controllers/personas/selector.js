var PersonaSelector = Composer.Controller.extend({

	persona: null,
	lock: false,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('personas/select', {
			persona: this.persona ? toJSON(this.persona) : null,
			lock: this.persona ? this.lock : false
		});
		this.html(content);
	}
});
