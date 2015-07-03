var DeleteAccountController = FormController.extend({
	events: {
		'submit form': 'do_it'
	},

	formclass: 'settings-delete-account',
	buttons: false,

	init: function()
	{
		turtl.push_title('Delete account', '/settings');

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
		if(!confirm('Just making sure...do you really want to delete your account?')) return;

		turtl.user.delete_account()
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem deleting your account. Please try again.', err);
				log.error('account: delete: ', turtl.user.id(), derr(err));
			});
	}
});

