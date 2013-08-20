var Invite = Composer.Model.extend({
	encrypt_key: function(key, secret, options)
	{
		options || (options = {});
		secret || (secret = false);

		if(typeOf(secret) == 'string')
		{
			secret	=	secret.clean();
			// remember, this is insecure already, so making the secret actually
			// easy to enter is more of a priority
			if(options.normalize) secret = secret.toLowerCase();
			if(secret == '') secret = false;
		}

		// create a key used to encrypt the board's key before emailing it
		var salt			=	(secret || '') + ':throw the NSA down the well';
		var encrypting_pass	=	tcrypt.uuid();
		var encrypting_key	=	tcrypt.key(encrypting_pass, salt, {keySize: 256/32, iterations: 400});

		// don't do encryption directly, use the Protected model.
		var keymodel		=	new InviteKey({key: tcrypt.key_to_string(key)});
		keymodel.key		=	encrypting_key;
		return {
			encrypted_key: keymodel.toJSON().body,
			encrypting_pass: encrypting_pass,
			used_secret: !!secret
		};
	},

	decrypt_key: function(encrypted_key, encrypting_pass, secret, options)
	{
		options || (options = {});
		secret || (secret = false);

		if(typeOf(secret) == 'string')
		{
			secret	=	secret.clean();
			// remember, this is insecure already, so making the secret actually
			// easy to enter is more of a priority
			if(options.normalize) secret = secret.toLowerCase();
			if(secret == '') secret = false;
		}

		// create a key used to encrypt the board's key before emailing it
		var salt			=	(secret || '') + ':throw the NSA down the well';
		var encrypting_key	=	tcrypt.key(encrypting_pass, salt, {keySize: 256/32, iterations: 400});

		// don't do encryption directly, use the Protected model.
		var keymodel		=	new InviteKey();
		keymodel.key		=	encrypting_key;
		keymodel.set({body: encrypted_key});
		return keymodel.get('key');
	}
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

		var encdata			=	this.encrypt_key(board.key, secret, {normalize: true});
		var encrypted_key	=	encdata.encrypted_key;
		var encrypting_pass	=	encdata.encrypting_pass;
		var used_secret		=	encdata.used_secret;

		from_persona.get_challenge({
			success: function(challenge) {
				turtl.api.post('/invites/boards/'+board.id(), {
					persona: from_persona.id(),
					challenge: from_persona.generate_response(challenge),
					to: this.get('email'),
					key: encrypting_pass,
					board_key: encrypted_key,
					used_secret: used_secret ? 1 : 0
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

var Invites	=	Composer.Collection.extend({
	model: Invite
});

