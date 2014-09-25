var FeedbackController = Composer.Controller.extend({
	elements: {
		'input[name=email]': 'inp_email',
		'textarea[name=body]': 'inp_body',
		'input[type=submit]': 'inp_submit'
	},

	events: {
		'submit form': 'send',
		'click input[name=close]': 'close'
	},

	init: function()
	{
		this.render();

		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var persona = turtl.user.get('personas').first();
		var email = persona ? persona.get('email') : null;
		var content = Template.render('feedback/index', {
			email: email
		});
		this.html(content);

		(function() {
			if(email)
			{
				this.inp_body.focus();
			}
			else
			{
				this.inp_email.focus();
			}
		}).delay(1, this);
	},

	render_thanks: function(email)
	{
		var content = Template.render('feedback/thanks', {
			email: email
		});
		this.html(content);
	},

	send: function(e)
	{
		if(e) e.stop();

		var from = this.inp_email.get('value').clean();
		var body = this.inp_body.get('value').clean();

		if(body == '')
		{
			this.inp_body.focus();
			return false;
		}

		var feedback = new Feedback({
			email: from,
			body: body
		});
		this.inp_submit.disabled = true;
		turtl.loading(true);
		feedback.save({
			success: function(res) {
				turtl.loading(false);
				this.render_thanks(from);
			}.bind(this),
			error: function(err) {
				turtl.loading(false);
				barfr.barf('There was a problem sending your feedback: '+ err +'. Please try again!');
				this.inp_submit.disabled = false;
			}.bind(this)
		});
	},

	close: function(e)
	{
		this.release();
	}
});
