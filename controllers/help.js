var HelpController = Composer.Controller.extend({
	init: function()
	{
		this.render();

		modal.open(this.el);
		modal.objects.container.removeClass('bare');
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('help/index');
		this.html(content);
	}
});
