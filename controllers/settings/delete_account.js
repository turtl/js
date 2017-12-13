var DeleteAccountController = FormController.extend({
	elements: {
		'input[type=submit]': 'inp_submit',
		'p.load': 'el_loader',
	},

	events: {
		'submit form': 'do_it'
	},

	formclass: 'settings-delete-account',
	buttons: false,

	init: function()
	{
		turtl.push_title(i18next.t('Delete account'), '/settings');

		this.parent();
		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/delete_account', {}));
	},

	do_it: function(e)
	{
		if(e) e.stop();
		if(!confirm(i18next.t('Just making sure...do you really want to delete your account?'))) return;

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);

		turtl.user.delete_account()
			.bind(this)
			.then(function() {
				barfr.barf(i18next.t('Your account has been deleted.'));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting your account. Please try again.'), err);
				log.error('account: delete: ', turtl.user.id(), derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.inp_submit.set('disabled', '');
				this.el_loader.removeClass('active');
			});
	}
});

