var PersonaListController = Composer.Controller.extend({
	tag: 'ul',

	personas: [],
	hist_edit: false,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('personas/list', {
			personas: this.personas,
			show_edit: !this.hide_edit
		});
		this.html(content);
	}
});
