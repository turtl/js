var FeedbackController = FormController.extend({
	xdom: true,
	class_name: 'feedback',

	elements: {
		'input[name=email]': 'inp_email',
		'textarea': 'inp_text',
		'input[type=submit]': 'btn_submit'
	},

	buttons: false,

	init: function()
	{
		turtl.push_title(i18next.t('Give us feedback'), '/settings');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.requires_connection({msg: i18next.t('Sending feedback requires a connection to the Turtl server.')});

		this.render()
			.bind(this)
			.then(function() {
				if(this.inp_text) this.inp_text.focus();
			});
	},

	render: function()
	{
		//if(!turtl.connected) return this.html(view.render('feedback/noconnection'));
		return this.html(view.render('feedback/index', {
			connected: turtl.connected,
		}));
	},

	render_thanks: function()
	{
		this.html(view.render('feedback/thanks'));
	},

	submit: function(e)
	{
		if(e) e.stop();
		var body = this.inp_text.get('value').trim();

		var errors = [];
		if(!body) errors.push([this.inp_text, i18next.t('Please enter some feedback')]);
		if(!this.check_errors(errors)) return;

		var data = {
			body: body
		};

		var feedback = new Feedback(data);

		this.btn_submit.set('disabled', true).addClass('disabled');
		this.disable(true);
		feedback.save().bind(this)
			.then(function() {
				this.render_thanks();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem sending that feedback'), err);
				log.error('feedback: send: ', derr(err));
				this.btn_submit.set('disabled', false).removeClass('disabled');
				this.disable(false);
			});
	}
});

