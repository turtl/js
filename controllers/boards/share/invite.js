var BoardsShareInviteController = FormController.extend({
	elements: {
		'input[name=email]': 'inp_email',
		'.loader svg': 'loader'
	},

	events: {
		'keyup input[name=email]': 'update_email'
	},

	modal: null,
	model: null,
	formclass: 'boards-invite',
	buttons: false,

	email_timer: null,

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('boards: share: invite: no model passed');
		}
		//this.action = 'Invite';
		this.modal = new TurtlModal({
			show_header: true,
			title: 'New invite'
		});
		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		var disable = function(yesno) { this.disabled = !!yesno; }.bind(this);
		turtl.events.bind('api:connect', disable.bind(this, false));
		turtl.events.bind('api:disconnect', disable.bind(this, true));
		disable(!turtl.api.connected);

		this.email_timer = new Timer(500);
		this.email_timer.bind('fired', this.query_email.bind(this));
	},

	render: function()
	{
		var board = this.model.toJSON();
		this.html(view.render('boards/share/invite', {
			board: board
		}));
		(function() { this.inp_email.focus(); }).delay(300, this);
	},

	submit: function(e)
	{
		if(e) e.stop();
		console.log('LOOOL');
	},

	update_email: function(e)
	{
		this.email_timer.reset();
	},

	query_email: function()
	{
		var email = this.inp_email.get('value');
		if(!email.match(/@/)) return;
		console.log('oh nooo');
	}
});

