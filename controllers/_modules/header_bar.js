var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	init: function()
	{
		tagit.user.bind(['login', 'logout'], this.render.bind(this), 'header_bar:user:render');
		this.render();
	},

	release: function()
	{
		tagit.user.unbind(['login', 'logout'], 'header_bar:user:render');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('modules/header_bar', {
			user: toJSON(tagit.user)
		});
		this.html(content);
	}
});
