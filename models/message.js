var Message = ProtectedShared.extend({
	base_url: '/messages',

	body_key: 'data',

	relations: {
		persona: {
			type: Composer.HasOne,
			model: 'Persona'
		}
	},

	public_fields: [
		'id',
		'to',
		'from',
		'keys'
	],

	private_fields: [
		'notification',
		'subject',
		'body'
	],

	init: function()
	{
		// NOTE: although the persona is not serialized with the message, not
		// having a persona key will break message serialization anyway. this is
		// hard to get around, so we add a little hack here.
		this.get('persona').key	=	tcrypt.random_key();

		// keep the "created" timestamp updated (not that the ID changes, but w/e)
		this.bind('change:id', function() {
			var id		=	this.id(true);
			if(!id) return;
			var ts		=	parseInt(this.id().substr(0, 8), 16);
			if(!ts) return;
			var date	=	new Date(ts * 1000);
			this.set({created: date});
		}.bind(this), 'message:track_timestamp');
		this.trigger('change:id');

		// test whether the message is read/unread
		var unread			=	Object.clone(tagit.user.get('settings').get_by_key('msg_unread').value());
		var highest_read_id	=	unread.highest || '';
		var lowest_read_id	=	unread.lowest || '';
		var specific_unread	=	unread.list || [];
		if(	this.id(true) &&
			!this.get('mine') &&
			(this.id().localeCompare(highest_read_id) > 0 ||
			 this.id().localeCompare(lowest_read_id) < 0 ||
			 specific_unread.contains(this.id())) )
		{
			this.set({unread: true});
		}
	},

	mark_read: function(options)
	{
		options || (options = {})

		var unread			=	Object.clone(tagit.user.get('settings').get_by_key('msg_unread').value());
		var highest_read_id	=	unread.highest || '';
		var lowest_read_id	=	unread.lowest || '';
		if(this.id().localeCompare(highest_read_id) > 0)
		{
			unread.highest	=	this.id();
		}

		if(this.id().localeCompare(lowest_read_id) < 0 || lowest_read_id == '')
		{
			unread.lowest	=	this.id();
		}

		// remove msg from user settings if it's in there
		if((unread.list || []).contains(this.id()))
		{
			unread.list		=	(unread.list || []).filter(function(id) {
				if(id == this.id()) return false;
				return true;
			}.bind(this));
		}
		tagit.user.get('settings').get_by_key('msg_unread').value(unread, options);
		this.unset('unread', options);
		this.trigger('mark_read');
	}
});

var Messages = Composer.Collection.extend({
	model: 'Message',

	last_id: null,

	sortfn: function(a, b) { return a.id().localeCompare(b.id()); },

	init: function()
	{
		// track the last (greatest) ID of the synced messages
		this.bind('add', function(model) {
			this.last_id = this.last().id();
		}.bind(this), 'messages:track_last_id')

		// track unread messages and save them in the user's settings.
		//
		// this specifically takes all 
		this.bind('mark_read', function() {
			var unread			=	Object.clone(tagit.user.get('settings').get_by_key('msg_unread').value());
			var highest_read_id	=	unread.highest || '';
			var lowest_read_id	=	unread.lowest || '';
			unread.list			=	(unread.list || []);
			// get all ids of unread messages
			var all_unread		=	this.select({unread: true}).each(function(m) {
				// no need to specifically add to user's unread list if ID is
				// greater than highest_read_id
				if( m.id().localeCompare(highest_read_id) > 0 &&
				    m.id().localeCompare(lowest_read_id) < 0 ) return;

				// not in the lest
				if(!unread.list.contains(m.id())) return;

				// this message's id is less than highest_read_id, and it's not
				// in the unread list. add it.
				unread.list.push(m.id());
			});
			tagit.user.get('settings').get_by_key('msg_unread').value(unread);
		}.bind(this), 'messages:track_unread');
	},

	get_messages_for_persona: function(persona, challenge, options)
	{
		options || (options = {});
		if(!options.after)
		{
			var last = this.models().filter(function() { return true; }).sort(function(a, b) {
				return a.id().localeCompare(b.id());
			})[0];
			if(last) options.after = last.id();
		}

		var challenge_expired = function() {
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
		}.bind(this);

		if(!challenge)
		{
			challenge_expired();
			return false;
		}

		var response = persona.generate_response(challenge);
		tagit.api.get('/messages/personas/'+persona.id(), { after: options.after, challenge: response }, {
			success: function(res) {
				var my_personas	=	tagit.user.get('personas');

				// add our messages into the pool
				this.add(res.received);
				// messages we sent have the "to" persona replaced with our own for
				// display purposes
				this.add(res.sent.map(function(sent) {
					var persona		=	my_personas.find_by_id(sent.from);
					if(!persona) return false;
					sent.persona	=	persona.toJSON();
					sent.mine		=	true;	// keeps us from marking it unread
					return sent;
				}));
				if(options.success) options.success(res);
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

	send: function(from_persona, challenge, to_persona, body, options)
	{
		options || (options = {});
	},

	sync: function(options)
	{
		options || (options = {});
		tagit.user.get('personas').each(function(persona) {
			this.get_messages_for_persona(persona, persona.challenge, {
				after: this.last_id,
				success: options.success,
				error: function(err, xhr) {
					barfr.barf('There was a problem grabbing messages from your persona '+persona.get('screenname')+': '+ err);
					if(options.error) options.error();
				}.bind(this)
			});
		}.bind(this));
	}
});

