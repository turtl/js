var Invite = Composer.Model.extend({
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

		var encrypted_key	=	tcrypt.encrypt(encrypting_key, tcrypt.key_to_string(board.key));

		from_persona.get_challenge({
			success: function(challenge) {
				tagit.api.post('/invites/boards/'+board.id(), {
					persona: from_persona.id(),
					challenge: from_persona.generate_response(challenge),
					to: this.get('email'),
					key: encrypting_pass,
					board_key: encrypted_key,
					used_secret: !!secret
				}, {
					success: options.success,
					error: options.error
				});
			}.bind(this),
			error: options.error
		});
	}
});
