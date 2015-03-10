var UserJoinController = FormController.extend({
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
		'input[name=promo]': 'inp_promo',
		'div.promo': 'promo_section'
	},

	events: {
		'click a[href=#open-promo]': 'open_promo',
		'click .button.join': 'submit',
		'click .button.confirm': 'finalize'
	},

	model: false,
	promo: null,

	buttons: false,
	formclass: 'user-join',

	init: function()
	{
		this.parent();

		turtl.push_title('Join', '/users/login');
		this.bind('release', turtl.pop_title.bind(null, false));

		// check for promo codes
		var check_promo = function()
		{
			var promo = localStorage.promo;
			if(promo && this.inp_promo.get('value') == '')
			{
				this.inp_promo.set('value', promo);
				var open = this.el.getElement('a.open-promo');
				if(open) open.click();
			}
			check_promo.delay(500, this);
		}.bind(this);
		check_promo();

		this.render();
	},

	render: function()
	{
		var content = view.render('users/join', {
			enable_promo: config.enable_promo,
			promo: localStorage.promo
		});
		this.html(content);
		if(this.promo_section && !this.promo_section.hasClass('open'))
		{
			this.promo_section.set('slide', {duration: 250, mode: 'horizontal'});
			this.promo_section.get('slide').hide();
		}
		(function() { this.inp_username.focus(); }).delay(100, this);
	},

	submit: function(e)
	{
		if(e) e.stop();
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var pconfirm = this.inp_confirm.get('value');
		var promo = this.inp_promo ? this.inp_promo.get('value') : null;

		if(password != pconfirm)
		{
			barfr.barf('Your password does not match the confirmation.');
			this.inp_password.focus();
			return false;
		}

		if(password.length < 4)
		{
			barfr.barf('We don\'t mean to tell you your business, but a password less than four characters won\'t cut it. Try again.');
			this.inp_password.focus();
			return false;
		}

		if(password.toLowerCase() == 'password')
		{
			barfr.barf('You want to secure all of your data using <em>that</em> password? Be our guest...');
		}

		this.submit.disabled = true;

		var user = new User({
			username: username,
			password: password
		});

		turtl.loading(true);
		user.join({ promo: promo }).bind(this)
			.then(function(userdata) {
				var data = user.toJSON();
				data.id = userdata.id;
				turtl.user.set({
					username: user.get('username'),
					password: user.get('password')
				});
				turtl.user.login(data);
				turtl.route('/');
			})
			.catch(function(e) {
				this.submit.disabled = false;
				barfr.barf('Error adding user: '+ e);
			})
			.finally(function() {
				turtl.loading(false);
			});
	},

	open_promo: function(e)
	{
		if(e) e.stop();
		if(!this.promo_section) return;
		e.target.dispose();
		this.promo_section.addClass('open');
		this.promo_section.get('slide').slideIn();
	}
});
