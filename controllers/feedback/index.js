var FeedbackController = FormController.extend({
	class_name: 'feedback',

	elements: {
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
		this.html(view.render('feedback/index'));

		if(this.inp_text) setTimeout(function() { autosize(this.inp_text); }.bind(this), 10);
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
		if(!body) errors.push([this.inp_text, 'Please enter some feedback']);
		if(!this.check_errors(errors)) return;

		var data = {
			user_id: turtl.user.id(),
			body: body
		};
		var persona = turtl.profile.get('personas').first();
		if(persona) data.email = persona.get('email');

		var feedback = new Feedback({body: body});

		this.btn_submit.set('disabled', true).addClass('disabled');
		this.disable(true);
		feedback.save().bind(this)
			.then(function() {
				this.render_thanks();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem sending that invite', err);
				log.error('board: share: ', this.model.id(), derr(err));
				this.btn_submit.set('disabled', false).removeClass('disabled');
				this.disable(false);
			});

	}
});

