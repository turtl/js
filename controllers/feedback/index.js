var FeedbackController = FormController.extend({
	class_name: 'feedback',

	elements: {
		'input[name=email]': 'inp_email',
		'textarea': 'inp_text',
		'input[type=submit]': 'btn_submit'
	},

	buttons: false,

	init: function()
	{
		turtl.push_title('Give us feedback');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.requires_connection({msg: 'Sending feedback requires a connection to the Turtl server.'});

		this.render();

		this.bind('release', function() {
			Autosize.destroy(this.inp_text);
		}.bind(this));
	},

	render: function()
	{
		Autosize.destroy(this.inp_text);

		if(!turtl.sync.connected) return this.html(view.render('feedback/noconnection'));

		var persona = turtl.profile.get('personas').first();
		if(persona) var email = persona.get('email');
		this.html(view.render('feedback/index', {
			show_email: !email
		}));

		if(this.inp_text)
		{
			setTimeout(function() { autosize(this.inp_text); }.bind(this), 10);
			this.inp_text.focus();
		}
	},

	render_thanks: function()
	{
		this.html(view.render('feedback/thanks'));
	},

	submit: function(e)
	{
		if(e) e.stop();
		var email = this.inp_email && this.inp_email.get('value').trim();
		var body = this.inp_text.get('value').trim();

		var errors = [];
		if(!body) errors.push([this.inp_text, 'Please enter some feedback']);
		if(!this.check_errors(errors)) return;

		var data = {
			user_id: turtl.user.id(),
			body: body
		};
		var persona = turtl.profile.get('personas').first();
		var persona_email = persona && persona.get('email');
		if(persona_email) data.email = persona_email;
		else if(email) data.email = email;

		var feedback = new Feedback(data);

		this.btn_submit.set('disabled', true).addClass('disabled');
		this.disable(true);
		feedback.save().bind(this)
			.then(function() {
				this.render_thanks();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem sending that invite', err);
				log.error('feedback: send: ', derr(err));
				this.btn_submit.set('disabled', false).removeClass('disabled');
				this.disable(false);
			});

	}
});

