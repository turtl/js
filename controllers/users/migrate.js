var UserMigrateController = UserBaseController.extend({
	xdom: true,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
	},

	events: {
	},

	buttons: false,
	formclass: 'user-migrate',

	viewstate: {
		username: '',
		password: '',
	},

	init: function() {
		this.render();

		this.with_bind_once(turtl.events, 'user:migrate:login', function(username, password) {
			this.inp_username.set('value', username);
			this.inp_password.set('value', password);
		}.bind(this));
	},

	render: function() {
		return this.html(view.render('users/migrate', {
			state: this.viewstate,
		}));
	}
});

