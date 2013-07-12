var Message = Composer.RelationalModel.extend({
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
		'from'
	],

	private_fields: [
		'conversation_id',
		'subject',
		'body'
	]
}, ProtectedShared);

var Messages = Composer.Collection.extend({
	model: 'Message',

	conversations: null,

	last_id: null,

	sortfn: function(a, b) { return a.id().localeCompare(b.id()); },

	init: function()
	{
		this.conversations = new Conversations();
		this.bind('add', function(model) {
			var conversation_id = model.get('conversation_id');
			if(!conversation_id) return;

			var conversation = this.conversations.find_by_id(conversation_id);

			// if a conversation doesn't exist for this message, create one and
			// add to the conversations list
			if(!conversation) this.conversations.add({id: conversation_id});
		}.bind(this), 'messages:monitor_conversations:add');

		// track the last (greatest) ID of the synced messages
		this.bind('add', function(model) {
			this.last_id = this.last().id();
		}.bind(this), 'messages:track_last_id')
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
				this.add(res);
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

var MessagesFilterConversation = Composer.FilterCollection.extend({
	sortfn: function(a, b)
	{
		return a.id().localeCompare(b.id());
	},

	filter: function(msg, collection)
	{
		//return true;
		var conversation = collection.get_parent();
		return msg.get('conversation_id') == conversation.id();
	}
});

var Conversation = Composer.RelationalModel.extend({
	relations: {
		messages: {
			type: Composer.HasMany,
			filter_collection: 'MessagesFilterConversation',
			master: function() {
				return tagit.messages;
			}
		},

		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		}
	},

	init: function()
	{
		// if all messages are removed from a conversation, it's destroyed
		this.bind_relational('messages', 'remove', function(model) {
			if(this.get('messages').models().length == 0)
			{
				this.get('messages').detach();
				this.destroy({skip_sync: true});
			}
		}.bind(this));

		// keep personas up-to-date
		this.bind_relational('messages', ['add', 'remove', 'change'], function(model) {
			this.refresh_personas();
		}.bind(this));
	},

	refresh_personas: function()
	{
		var personas = this.get('personas');
		personas.clear();
		this.get('messages').each(function(m) {
			var from_persona = m.get('persona');
			if(from_persona) personas.upsert(new Persona(from_persona));
			var to_persona_id = m.get('to');
			var to_persona = tagit.user.get('personas').find_by_id(to_persona_id);
			if(to_persona) personas.upsert(new Persona(to_persona));
		}.bind(this));
	},

	generate_id: function()
	{
		return tcrypt.uuid();
	}
});

var Conversations = Composer.Collection.extend({
	model: 'Conversation'
});
