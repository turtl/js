var UserWelcomeController = Composer.Controller.extend({
	className: 'user-join confirm',

	events: {
		'click div.button.confirm': 'done'
	},

	init: function()
	{
		this.render();
		turtl.push_title('Welcome!', '/users/login');
	},

	release: function()
	{
		turtl.pop_title();
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		this.html(view.render('users/welcome', {}));
	},

	done: function(e)
	{
		if(e) e.stop();
		turtl.route('/users/join');
	}
});

