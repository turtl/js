var MessageComposeController = Composer.Controller.extend({
	elements: {
		'div.to .select': 'selector',
		'input[name=subject]': 'inp_subject',
		'textarea[name=body]': 'inp_body'
	},

	events: {
		'submit form': 'send'
	},

	model: null,
	from_persona: null,
	to_persona: null,
	persona_selector: null,

	init: function()
	{
		if(!this.model) this.model = new Conversation();

		this.from_persona = tagit.user.get('personas').first();
		if(!this.from_persona)
		{
			barfr.barf('You must have a persona before being able to send messages.');
			this.release();
			return;
		}

		this.render();
		modal.open(this.el);
		var modalclose = function() {
			modal.removeEvent('close', modalclose);
			this.release();
		}.bind(this);
		modal.addEvent('close', modalclose);

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		tagit.keyboard.attach(); // re-enable shortcuts
		if(modal.is_open) modal.close();
		if(this.persona_selector) this.persona_selector.release();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var user_personas = tagit.user.get('personas');
		if(this.model && !this.model.is_new())
		{
			var personas = this.model.get('personas');
			var my_persona_ids = user_personas.map(function(p) { return p.id(); });
			this.to_persona = personas.find(function(p) {
				return !my_persona_ids.contains(p.id());
			});
		}
		var content = Template.render('messages/compose', {
			from: toJSON(this.from_persona),
			to: this.to_persona ? toJSON(this.to_persona) : null,
			conversation: toJSON(this.model)
		});
		this.html(content);

		if(this.persona_selector) this.persona_selector.release();
		this.persona_selector = new PersonaSelector({
			inject: this.selector,
			persona: this.to_persona,
			lock: this.to_persona ? true : false,
			tabindex: 1
		});
		this.persona_selector.bind('selected', function(persona) {
			this.to_persona = persona;
		}.bind(this));
	},

	send: function(e)
	{
		if(e) e.stop();

		if(!this.to_persona || this.to_persona.is_new())
		{
			barfr.barf('Please pick a recipient for this message.')
			if(this.persona_selector && this.persona_selector.inp_screenname)
			{
				this.persona_selector.inp_screenname.focus();
			}
			return false;
		}

		if(this.model.is_new())
		{
			this.model.set({id: this.model.generate_id()});
		}
		var subject = this.inp_subject.get('value').clean();
		var body = this.inp_body.get('value');
		var message = new Message({
			conversation_id: this.model.id(),
			from: this.from_persona.id(),
			to: this.to_persona.id(),
			subject: subject,
			body: body
		});

		// make sure we generate keys for this recipient
		message.add_recipient(this.from_persona);
		message.add_recipient(this.to_persona);

		// TODO: fix code duplication: messages/conversation_view.js
		tagit.loading(true);
		this.from_persona.get_challenge({
			success: function(challenge) {
				message.save({
					args: { challenge: this.from_persona.generate_response(challenge) },
					success: function() {
						tagit.loading(false);
						barfr.barf('Message sent.');
						message.set({persona: this.from_persona});
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
				barfr.barf('Problem verifying ownership of your persona '+ this.from_persona.get('screenname') +': '+ err +'. Try again.');
			}.bind(this)
		});
	}
});
