var Message = Composer.Model.extend({
}, ProtectedShared);

var Messages = Composer.Collection.extend({
	model: 'Message',

	get_messages_for_persona: function(persona, challenge, options)
	{
		options || (options = {});
		if(!options.after)
		{
			var last = Array.clone(this.models()).sort(function(a, b) {
				return a.id().localeCompare(b.id());
			})[0];
			if(last) options.after = last.id();
		}

		var response = persona.generate_response(challenge);
		tagit.api.get('/messages/personas/'+persona.id(), { after: options.after, challenge: response }, {
			success: function(res) {
				this.add(res);
				if(options.success) options.success(res);
			}.bind(this),
			error: function(err, xhr) {
				if(xhr.status == 403 && !options.retry)
				{
					// We got a 403, try regenerating the persona challenge and sending
					// the request again with the new challenge
					persona.get_challenge({
						expire: 1800,   // 1/2 hour
						persist: true,
						success: function(challenge) {
							// mark this next request as a retry so it knows not to try
							// again on failure
							options.retry = true;
							this.get_messages_for_persona(persona, challenge, options);
						}.bind(this),
						error: function(err, xhr) {
							if(options.error) options.error(err, xhr);
						}.bind(this)
					});
				}
				else
				{
					if(options.error) options.error(err, xhr);
				}
			}.bind(this)
		});
	},

	send: function(from_persona, challenge, to_persona_id, body, options)
	{
		options || (options = {});
	},

	sync: function(options)
	{
		options || (options = {});
		tagit.user.get('personas').each(function(persona) {
			this.get_messages_for_persona(persona, persona.challenge, {
				success: options.success,
				error: function(err, xhr) {
					barfr.barf('There was a problem grabbing messages from your persona '+persona.get('screenname')+': '+ err);
					if(options.error) options.error();
				}.bind(this)
			});
		}.bind(this));
	}
});
