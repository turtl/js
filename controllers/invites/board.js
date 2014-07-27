var InviteBoardController = Composer.Controller.extend({
	elements: {
		'div.challenge': 'challenge_box',
		'div.challenge .inner': 'challenge_inner',
		'input.secure': 'inp_secure',
		'input[name=question]': 'inp_question',
		'input[name=answer]': 'inp_answer',
		'input[type=submit]': 'inp_submit'
	},

	events: {
		'click input.secure': 'toggle_secure',
		'submit form': 'send_invite'
	},

	model: null,
	invite: null,
	email: '',
	persona: null,
	persona_data: null,

	init: function()
	{
		if(!this.model) return false;
		if(!this.invite) this.invite = new BoardInvite({email: this.email});
		this.persona = new Persona(this.persona_data ? this.persona_data : {});

		this.render();
	},

	release: function()
	{
		this.unbind('submit');
		this.unbind('sent');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('invites/board', {
			invite: toJSON(this.invite),
			persona: toJSON(this.persona),
			board: toJSON(this.model)
		});
		this.html(content);
		if(this.persona.is_new())
		{
			this.toggle_secure();
		}
	},

	send_invite: function(e)
	{
		if(e) e.stop();
		this.inp_submit.disabled = true;
		if(this.persona.is_new())
		{
			this.send_invite_email();
		}
		else
		{
			this.send_invite_persona();
		}
	},

	send_invite_persona: function()
	{
		if(this.model.get('personas').find_by_id(this.persona.id()))
		{
			barfr.barf('This board is already shared with that person.');
			return false;
		}

		// TODO: fix persona assumption
		// TODO: add question/answer challenge
		var from = turtl.user.get('personas').first();
		var message = new Message();

		// make sure we generate keys for this recipient
		//message.add_recipient(from);
		message.public_key = this.persona.get('pubkey');
		message.set({
			from: from.id(),
			to: this.persona.id(),
			notification: true,
			subject: from.get('email') + ' wants to share the board "'+ this.model.get('title') + '" with you.',
			body: {
				type: 'share_board',
				board_id: this.model.id(),
				board_key: tcrypt.key_to_string(this.model.key)
			}
		});

		turtl.loading(true);
		var perms = 2;
		this.model.share_with(from, this.persona, perms, {
			success: function() {
				from.send_message(message, {
					success: function() {
						turtl.loading(false);
						barfr.barf('Invite sent.');
						this.trigger('sent');
						this.release();
					}.bind(this),
					error: function() {
						turtl.loading(false);
						barfr.barf('There was a problem sending your invite: '+ err);
					}.bind(this)
				});
			}.bind(this),
			error: function(err) {
				turtl.loading(false);
				barfr.barf('There was a problem sharing this board: '+ err);
				this.inp_submit.disabled = false;
			}.bind(this)
		});
	},

	send_invite_email: function()
	{
		var question = this.inp_question.get('value');
		var secret = this.inp_answer.get('value');
		var secure = this.inp_secure.checked;

		if(!secure)
		{
			question = '';
			secret = '';
		}

		// TODO: fix persona assumption
		var persona = turtl.user.get('personas').first();
		turtl.loading(true);
		this.invite.send(persona, this.model, question, secret, {
			success: function() {
				turtl.loading(false);
				barfr.barf('Invite sent to '+ this.invite.get('email'));
				this.trigger('sent');
				this.release();
			}.bind(this),
			error: function(err, xhr) {
				turtl.loading(false);
				barfr.barf('There was a problem sending your invite: '+ err);
			}.bind(this)
		});
	},

	toggle_secure: function(e)
	{
		var show = this.inp_secure.checked;
		this.challenge_inner.setStyle('display', 'block');
		if(show)
		{
			this.challenge_inner.slide('hide').slide('in');
		}
		else
		{
			this.challenge_inner.slide('show').slide('out');
		}
	}
});

