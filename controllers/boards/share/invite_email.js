var BoardsShareInviteEmailController = Composer.Controller.extend({
	model: null,
	email: null,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		this.html(view.render('boards/share/invite_email', {
			email: this.email
		}));
	}
});

