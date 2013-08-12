var InviteBoardController	=	Composer.Controller.extend({
	elements: {
		'input[name=secret]': 'inp_secret'
	},

	events: {
		'submit form': 'send_invite'
	},

	invite: null,
	email: '',
	board: null,

	init: function()
	{
		if(!this.board) return false;
		if(!this.invite) this.invite = new BoardInvite({email: this.email});

		this.render();
		this.bind('submit', this.send_invite.bind(this), 'invites:submit');
	},

	release: function()
	{
		this.unbind('submit', 'invites:submit');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content	=	Template.render('invites/board', {
			invite: toJSON(this.invite)
		});
		this.html(content);
	},

	send_invite: function(e)
	{
		if(e) e.stop();
		var secret	=	this.inp_secret.get('value');
		tagit.loading(true);
		this.invite.send(this.board.key, secret, {
			success: function() {
				tagit.loading(false);
				barfr.barf('Invite send to '+ this.invite.get('email'));
				this.release();
			}.bind(this),
			error: function(err, xhr) {
				tagit.loading(false);
				barfr.barf('There was a problem sending your invite: '+ err);
			}.bind(this)
		});
	}
});

