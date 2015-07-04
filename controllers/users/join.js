var UserJoinController = FormController.extend({
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
		'input[name=promo]': 'inp_promo',
		'input[type=submit': 'inp_submit',
		'div.promo': 'promo_section',
		'.strength': 'strength_container',
		'.strength .inner': 'strength_bar',
		'.strength .status': 'strength_status'
	},

	events: {
		'click a[href=#open-promo]': 'open_promo',
		'click .button.confirm': 'finalize',
		'input input[name=password]': 'update_meter'
	},

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
		this.update_meter();
	},

	check_login: function(inp_username, inp_password, inp_pconfirm)
	{
		var username = inp_username.get('value');
		var password = inp_password.get('value');
		var pconfirm = inp_pconfirm.get('value');

		var errors = [];
		if(username.length < 3)
		{
			errors.push([inp_username, 'Please enter a username 3 characters or longer.']);
		}

		if(password.length == 0)
		{
			errors.push([inp_password, 'Please enter a passphrase. Hint: Sentences are much better than single words.']);
		}
		else if(password.length < 4)
		{
			errors.push([inp_password, 'We don\'t mean to tell you your business, but a passphrase less than four characters won\'t cut it. Try again.']);
		}
		else if(password != pconfirm)
		{
			errors.push([inp_pconfirm, 'Your passphrase does not match the confirmation.']);
		}
		else if(password.toLowerCase() == 'password')
		{
			errors.push([inp_password, 'That passphrase is making me cringe.']);
		}
		return errors;
	},

	submit: function(e)
	{
		if(e) e.stop();
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var pconfirm = this.inp_confirm.get('value');
		var promo = this.inp_promo ? this.inp_promo.get('value') : null;

		var errors = this.check_login(this.inp_username, this.inp_password, this.inp_confirm);
		if(!this.check_errors(errors)) return;

		this.inp_submit.disabled = true;

		var user = new User({
			username: username,
			password: password
		});

		turtl.loading(true);
		user.join({ promo: promo }).bind(this)
			.then(function(userdata) {
				var data = user.toJSON();
				data.id = userdata.id;
				turtl.user.login(data)
					.then(function() {
						turtl.route('/');
					});
			})
			.catch(function(err) {
				this.inp_submit.disabled = false;
				if(err.disconnected)
				{
					barfr.barf('Couldn\'t connect to the server');
					return;
				}
				turtl.events.trigger('ui-error', 'There was a problem saving that account', err);
				log.error('users: join: ', derr(err));
			})
			.finally(function() {
				turtl.loading(false);
			});
	},

	update_meter: function(e)
	{
		var passphrase = this.inp_password.get('value');
		var status = ' - ';
		if(passphrase.length >= 32)
		{
			status = 'excellent';
		}
		else if(passphrase.length >= 24)
		{
			status = 'great';
		}
		else if(passphrase.length >= 16)
		{
			status = 'good';
		}
		else if(passphrase.length >= 10)
		{
			status = 'ok';
		}
		else if(passphrase.length > 4)
		{
			status = 'weak';
		}
		else if(passphrase.length > 0)
		{
			status = 'too short';
		}

		var width = Math.min(passphrase.length / 32, 1) * 100;

		this.strength_status.set('html', status);
		this.strength_bar.setStyles({width: width + '%'});
		this.strength_container.className = this.strength_container.className.replace(/level-.*( |$)/, '');
		this.strength_container.addClass('level-'+sluggify(status));
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
