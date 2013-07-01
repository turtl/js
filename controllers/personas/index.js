var PersonasController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

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
	},

	render: function()
	{
		var content = Template.render('personas/index', {
			personas: tagit.user.get('personas', [])
		});
		this.html(content);
	}
});
