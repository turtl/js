var LogsController = Composer.Controller.extend({
	xdom: true,

	elements: {
		'contents': 'textarea[name="contents"]',
	},

	events: {
	},

	init: function() {
		turtl.push_title(i18next.t('Debug log'), '/settings');
		return (new App()).get_logs()
			.bind(this)
			.then(function(logdata) {
				this.render({contents: logdata});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem loading the debug log'), err);
				log.error('settings: logs: ', derr(err));
			});
	},

	render: function(options) {
		options || (options = {})
		return this.html(view.render('settings/logs', {
			contents: options.contents,
		}));
	},

	save: function(e)
	{
		if(e) e.stop();
		var cur_username = this.inp_cur_username.get('value');
		var cur_password = this.inp_cur_password.get('value');
		var new_username = this.inp_new_username.get('value');
		var new_password = this.inp_new_password.get('value');
		var new_confirm = this.inp_new_confirm.get('value');

		var errors = [];
		if(new_password != new_confirm) {
			errors.push([this.inp_new_confirm, i18next.t('Your passphrase does not match the confirmation.')]);
		}
		if(!this.check_errors(errors)) return;

		var loading = function(yesno)
		{
			this.inp_submit.set('disabled', yesno);
			if(yesno) this.el_loader.addClass('active');
			else this.el_loader.removeClass('active');
		}.bind(this);

		var pending_barf = barfr.barf(i18next.t('Updating your login. Please be patient (and DO NOT close the app)!'));
		loading(true);
		return delay(300)
			.bind(this)
			.then(function() {
				var errors = UserJoinController.prototype.check_login(this.inp_new_username, this.inp_new_password, this.inp_new_confirm);
				if(!this.check_errors(errors)) {
					loading(false);
					barfr.close_barf(pending_barf);
					return;
				}

				return turtl.user.change_password(cur_username, cur_password, new_username, new_password)
					.then(function() {
						barfr.barf(i18next.t('Your login was changed successfully! Logging you out...'));
					})
					.finally(function() {
						barfr.close_barf(pending_barf);
					});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem changing your login. We are undoing the changes'), err);
				log.error('settings: change password: ', derr(err));
				loading(false);
			});
	},

	match_username: function(e)
	{
		var username = this.inp_cur_username.get('value');
		this.inp_new_username.set('value', username);
	}
});


