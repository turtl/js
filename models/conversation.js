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
			collection: 'Personas',
			forward_events: true
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
			this.refresh_subject();
			this.trigger('message_refresh');
		}.bind(this));

		this.bind('change:selected', function() {
			if(!this.get('selected', false)) return false;
			this.mark_read();
		}.bind(this), 'conversation:monitor:selected');
	},

	mark_read: function()
	{
		// mark all my messages as read
		//
		// also, we delay here so anyone who needs the 'which messages are
		// unread' has a chance to get it before the list vanishes
		(function() {
			this.get('messages').each(function(msg) {
				msg.mark_read();
			});
			tagit.messages.trigger('mark_read');
		}).delay(10, this);
	},

	refresh_personas: function()
	{
		var personas		=	this.get('personas');
		var my_persona_ids	=	tagit.user.get('personas').map(function(p) { return p.id(); });
		personas.clear();
		this.get('messages').each(function(m) {
			var from_persona = m.get('persona');
			// NOTE: could use upsert below, but since it requires serialization
			// (which encrypts some of the data) it's best to just do a manual
			// upsert.
			if(from_persona)
			{
				// manual upsert
				if(!personas.find_by_id(from_persona.id())) personas.add(from_persona);
				if(my_persona_ids.contains(from_persona.id())) from_persona.set({mine: true});
			}
			var to_persona_id = m.get('to');
			var to_persona = tagit.user.get('personas').find_by_id(to_persona_id);
			if(to_persona)
			{
				// manual upsert
				if(!personas.find_by_id(to_persona.id())) personas.add(to_persona);
				if(my_persona_ids.contains(to_persona.id())) to_persona.set({mine: true});
			}
		}.bind(this));
		this.trigger('personas');
	},

	refresh_subject: function()
	{
		var subject	=	false;
		var first	=	this.get('messages').first();

		if(first) subject = first.get('subject');
		if(!subject) return false;

		this.set({ subject: subject });
	},

	generate_id: function()
	{
		return tcrypt.uuid();
	}
});

var Conversations = Composer.Collection.extend({
	model: 'Conversation'
});

var ConversationsFilter = Composer.FilterCollection.extend({
});

