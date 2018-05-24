var UserMustLoginController = Composer.Controller.extend({
	xdom: true,
	class_name: 'user-must-login',

	init: function() {
		this.render();
	},

	render: function() {
		this.html(view.render('users/must-login', {
		}));
	},
})

