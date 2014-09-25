var UserIndexController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'.user-main > .login-main': 'login_container',
		'.user-main > .join-main': 'join_container'
	},

	sub_controllers: [],

	init: function()
	{
		this.render();
	},

	release: function()
	{
		this.soft_release();
		return this.parent.apply(this, arguments);
	},

	soft_release: function()
	{
		this.sub_controllers.each(function(s) { s.release(); });
		this.sub_controllers = [];
	},

	render: function()
	{
		this.soft_release();
		var content = Template.render('users/index', {});
		this.html(content);

		var login = new UserLoginController({
			inject: this.login_container
		});
		var join = new UserJoinController({
			inject: this.join_container
		});
		this.sub_controllers.push(login);
		this.sub_controllers.push(join);
	}
});
