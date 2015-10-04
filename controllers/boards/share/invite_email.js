var BoardsShareInviteEmailController = Composer.Controller.extend({
	model: null,
	email: null,
	outdated_key: false,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		this.html(view.render('boards/share/invite_email', {
			email: this.email,
			outdated_key: this.outdated_key
		}));
	}
});

