var InviteEmailController	=	Composer.Controller.extend({
	elements: {
		'input[name=secret]': 'inp_secret'
	},

	events: {
		'submit form': 'send_invite'
	},

	invite: null,
	email: '',

	init: function()
	{
		if(!this.invite) this.invite = new Invite({email: this.email});
		this.render();
	},

	release: function()
	{
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content	=	Template.render('invites/email', {
			invite: toJSON(this.invite)
		});
		this.html(content);
	},

	send_invite: function(e)
	{
		if(e) e.stop();
	}
});

