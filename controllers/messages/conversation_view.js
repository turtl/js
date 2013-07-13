var ConversationViewController = Composer.Controller.extend({
	className: 'gutter',

	elements: {
		'textarea[name=body]': 'inp_body'
	},

	events: {
		'submit form.reply': 'reply'
	},

	model: null,

	compose_controller: null,

	init: function()
	{
		this.render();
		tagit.user.bind_relational('personas', ['add', 'remove', 'saved'], this.render.bind(this), 'conversation:view:watch_personas:render');
		if(this.model) this.model.bind_relational('messages', ['change', 'add', 'remove'], this.render.bind(this), 'conversation:view:render');
	},

	release: function()
	{
		tagit.user.unbind_relational('personas', ['add', 'remove', 'saved'], 'conversation:view:watch_personas:render');
		if(this.model)
		{
			this.model.unbind_relational('messages', ['change', 'add', 'remove'], 'conversation:view:render');
			this.model.set({selected: false});
		}
		if(this.compose_controller) this.compose_controller.release();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('messages/conversation_view', {
			messages: this.model ? toJSON(this.model.get('messages', [])) : [],
			num_personas: tagit.user.get('personas').models().length
		});
		this.html(content);
	},

	reply: function(e)
	{
		if(e) e.stop();
		var body	=	this.inp_body.get('value').clean();
		if(body == '') return false;
		var my_personas	=	tagit.user.get('personas').map(function(p) { return p.id(); });
		var my_persona	=	this.model.get('personas').find(function(p) {
			return my_personas.contains(p.id());
		});

		// do some annoying persona lookups here to get the recipient's persona id
		var to_personas	=	this.model.get('personas').map(function(p) { return p.id(); });
		var first_msg	=	this.model.get('messages').first();
		to_personas.push(first_msg.get('to'));
		to_personas.push(first_msg.get('from'));
		var to_persona_id	=	to_personas.filter(function(id) {
			return !my_personas.contains(id);
		})[0];
		if(!my_persona)
		{
			barfr.barf('Error sending message: do you have any personas?');
			return false;
		}
		var message		=	new Message({
			conversation_id: this.model.id(),
			from: my_persona.id(),
			to: to_persona_id,
			body: body
		});
		// we HAVE to have the to_persona, and since there's a chance it doesn't
		// exist locally, we pull it out
		var to_persona	=	new Persona({id: to_persona_id});
		to_persona.fetch({
			success: function() {
				message.add_recipient(my_persona);
				message.add_recipient(to_persona);

				// TODO: fix code duplication: messages/compose.js
				tagit.loading(true);
				my_persona.get_challenge({
					success: function(challenge) {
						message.save({
							args: { challenge: my_persona.generate_response(challenge) },
							success: function() {
								tagit.loading(false);
								barfr.barf('Message sent.');
								message.persona	=	my_persona.toJSON();
								tagit.messages.add(message);
								this.release();
							}.bind(this),
							error: function(_, err) {
								tagit.loading(false);
								barfr.barf('Error sending message: '+ err);
							}.bind(this)
						});
					}.bind(this),
					error: function(err, xhr) {
						tagit.loading(false);
						barfr.barf('Problem verifying ownership of your persona '+ my_persona.get('screenname') +': '+ err +'. Try again.');
					}.bind(this)
				});
			}.bind(this),
			error: function(_, err) {
				barfr.barf('Error loading the recipient\'s persona data: '+ err);
			}.bind(this)
		});
	}
});
