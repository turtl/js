var Persona = Composer.Model.extend({
	base_url: '/personas',

	public_fields: [
		'id',
		'pubkey',
		'email',
		'name'
	],

	private_fields: [
		'secret',
		'privkey'
	],

	// persistent challenge
	challenge: null,
	challenge_timer: null,

	init: function()
	{
		// make sure we always have a key (just copy the user's key)
		if(!this.key) this.key = turtl.user.get_key();

		this.challenge_timer		=	new Timer(1);
		this.challenge_timer.end	=	function()
		{
			this.challenge	=	null;
		}.bind(this);

		this.bind('destroy', function() {
			var settings	=	Object.clone(turtl.user.get('settings').get_by_key('personas').value());
			delete settings[this.id()];
			turtl.user.get('settings').get_by_key('personas').value(settings);
		}.bind(this), 'persona:user:cleanup');
	},

	load_profile: function(options)
	{
		this.get_challenge({
			success: function(challenge) {
				turtl.api.get('/profiles/personas/'+this.id(), {challenge: this.generate_response(challenge)}, {
					success: function(profile) {
						// mark shared boards as such
						profile.boards.each(function(board) {
							board.shared	=	true;
						});

						// add the boards to the profile
						turtl.profile.load(profile, {
							complete: function() {
								if(options.success) options.success();
							}
						});
					}.bind(this),
					error: options.error
				})
			}.bind(this),
			error: options.error
		});
	},

	sync_data: function(sync_time, options)
	{
		options || (options = {});

		turtl.api.post('/sync/personas/'+this.id(), {
			time: sync_time,
			challenge: this.generate_response(this.challenge)
		}, {
			success: function(sync) {
				turtl.profile.process_sync(sync);
			},
			error: function(err, xhr) {
				if(xhr.status == 403 && !options.retry)
				{
					// mah, message sync will generate a new persistent
				}
				else
				{
					barfr.barf('Error syncing persona profile with server: '+ err);
				}
			}
		});
	},

	destroy_persona: function(options)
	{
		options || (options = {});
		this.get_challenge({
			success: function(res) {
				var challenge = res;
				options.args = {challenge: this.generate_response(challenge)};
				this.destroy(options);
			}.bind(this),
			error: options.error
		});
	},

	get_by_email: function(email, options)
	{
		options || (options = {});
		var args = {};

		// this prevents a persona from returning from the call if it is already
		// the owner of the email
		if(options.ignore_this_persona && this.id(true))
		{
			args.ignore_persona_id = this.id(true);
		}
		turtl.api.get('/personas/email/'+email, args, options);
	},

	search_by_email: function(email, options)
	{
		options || (options = {});

		turtl.api.get('/personas/email/'+email+'*', {}, options);
	},

	generate_secret: function(key)
	{
		return tcrypt.encrypt(key, tcrypt.uuid()).toString().replace(/:.*/, '');
	},

	get_challenge: function(options)
	{
		options || (options = {});
		var args = {};
		if(options.use_persistent && this.challenge)
		{
			if(options.success) options.success(this.challenge);
			return;
		}
		if(options.expire) args.expire = options.expire;
		if(options.persist) args.persist = 1;
		turtl.api.post('/personas/'+this.id()+'/challenge', args, {
			success: function(challenge) {
				if(options.persist)
				{
					this.challenge = challenge;
					if(options.expire)
					{
						// expire the local challenge before it expires on the server
						this.challenge_timer.ms	=	(options.expire - 5) * 1000;
						this.challenge_timer.reset();
					}
				}
				if(options.success) options.success(challenge);
			}.bind(this),
			error: options.error
		});
	},

	generate_response: function(challenge)
	{
		var secret	=	this.get('secret');
		if(!secret) secret = turtl.user.get('settings').get_by_key('personas').value()[this.id()];
		if(!secret) return false;
		return tcrypt.hash(secret + challenge);
	},

	get_messages: function(challenge, options)
	{
		options || (options = {});
		if(!options.after)
		{
			var last = turtl.messages.models().filter(function() { return true; }).sort(function(a, b) {
				return a.id().localeCompare(b.id());
			})[0];
			if(last) options.after = last.id();
		}

		var challenge_expired = function() {
			// We got a 403, try regenerating the persona challenge and sending
			// the request again with the new challenge
			this.get_challenge({
				expire: 1800,   // 1/2 hour
				persist: true,
				success: function(challenge) {
					// mark this next request as a retry so it knows not to try
					// again on failure
					options.retry = true;
					this.get_messages(challenge, options);
				}.bind(this),
				error: function(err, xhr) {
					if(options.error) options.error(err, xhr);
				}.bind(this)
			});
		}.bind(this);

		if(!challenge)
		{
			challenge_expired();
			return false;
		}

		var response = this.generate_response(challenge);
		turtl.api.get('/messages/personas/'+this.id(), { after: options.after, challenge: response }, {
			success: function(res) {
				var my_personas	=	turtl.user.get('personas');

				// add our messages into the pool
				turtl.messages.add(res.received);
				// messages we sent have the "to" persona replaced with our own for
				// display purposes
				turtl.messages.add((res.sent || []).map(function(sent) {
					var persona		=	my_personas.find_by_id(sent.from);
					if(!persona) return false;
					sent.persona	=	persona.toJSON();
					sent.mine		=	true;	// let the app know WE sent it
					return sent;
				}));
				if(options.success) options.success(res, this);
			}.bind(this),
			error: function(err, xhr) {
				if(xhr.status == 403 && !options.retry)
				{
					challenge_expired();
				}
				else
				{
					if(options.error) options.error(err, xhr);
				}
			}.bind(this)
		});
	},

	send_message: function(message, options)
	{
		options || (options = {});
		this.get_challenge({
			success: function(challenge) {
				message.save({
					args: { challenge: this.generate_response(challenge) },
					success: function() {
						if(options.success) options.success();
					},
					error: function(err) {
						if(options.error) options.error(err);
					}
				});
			}.bind(this),
			error: options.error
		})
	},

	delete_message: function(message, options)
	{
		options || (options = {});
		this.get_challenge({
			success: function(challenge) {
				message.destroy({
					args: {
						challenge: this.generate_response(challenge),
						persona: this.id()
					},
					success: function() {
						if(options.success) options.success();
					},
					error: function(_, err) {
						if(options.error) options.error(err);
					}
				});
			}.bind(this),
			error: options.error
		});
	}
}, Protected);

var Personas = Composer.Collection.extend({
	model: Persona
});
