var Invite = Composer.Model.extend({
});

var InviteKey = Protected.extend({
	private_fields: ['key']
});

var BoardInvite = Invite.extend({
	send: function(from_persona, board, secret, options)
	{
		secret || (secret = false);
		options || (options = {});

		// make sure we have an email (kinda)
		if(!this.get('email', '').clean().match(/@/)) return false;

		if(typeOf(secret) == 'string')
		{
			secret	=	secret.clean();
			secret	=	secret.toLowerCase();
			if(secret == '') secret = false;
		}

		// create a key used to encrypt the board's key before emailing it
		var salt			=	(secret || '') + ':throw the NSA down the well';
		var encrypting_pass	=	tcrypt.uuid();
		var encrypting_key	=	tcrypt.key(encrypting_pass, salt, {keySize: 256/32, iterations: 400});

		var keymodel		=	new InviteKey({key: tcrypt.key_to_string(board.key)});
		keymodel.key		=	encrypting_key;

		var encrypted_key	=	keymodel.toJSON().body;

		from_persona.get_challenge({
			success: function(challenge) {
				turtl.api.post('/invites/boards/'+board.id(), {
					persona: from_persona.id(),
					challenge: from_persona.generate_response(challenge),
					to: this.get('email'),
					key: encrypting_pass,
					board_key: encrypted_key,
					used_secret: !!secret
				}, {
					success: function(invite) {
						if(invite.priv)
						{
							var privs			=	Object.clone(board.get('privs', {}));
							privs[invite.id]	=	invite.priv;
							board.set({privs: privs});
						}
						if(options.success) options.success(invite);
					}.bind(this),
					error: options.error
				});
			}.bind(this),
			error: options.error
		});
	},

	cancel: function(board, options)
	{
		options || (options = {});

		turtl.api._delete('/invites/'+this.id(), {}, {
			success: function() {
				var privs	=	Object.clone(board.get('privs', {}));
				delete privs[this.id()];
				board.set({privs: privs});
				if(options.success) options.success();
			}.bind(this),
			error: options.error
		});
	}
});
