var PersonaListController = Composer.Controller.extend({
	tag: 'ul',

	personas: [],

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('personas/list', {
			personas: this.personas
		});
		this.html(content);
	}
});
