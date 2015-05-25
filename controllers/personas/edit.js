var PersonasEditController = FormController.extend({
	elements: {
		'input[name=email]': 'inp_email',
		'input[name=name]': 'inp_name'
	},

	modal: null,

	model: null,
	formclass: 'personas-edit',

	init: function()
	{
		if(!this.model) this.model = new Persona();
		this.action = this.model.is_new() ? 'Add' : 'Edit';

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action + ' persona'
		});

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));

		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		this.html(view.render('personas/edit', {
			persona: this.model.toJSON()
		}));
		if(this.action == 'Add')
		{
			(function() {
				this.inp_email.focus();
			}.delay(300, this));
		}
	},

	submit: function(e)
	{
		if(e) e.stop();

		var email = this.inp_email.get('value').trim();
		var name = this.inp_name.get('value').trim();

		var errors = [];
		if(!email) errors.push('Please enter an email for your persona');

		if(errors.length)
		{
			barfr.barf(errors.join('<br>'));
			return;
		}

		var keypromise = Promise.resolve();
		var is_new = this.model.is_new();
		if(is_new)
		{
			keypromise = this.model.init_new({silent: true});
		}
		var clone = this.model.clone();
		clone.set({
			email: email,
			name: name
		});
		keypromise.bind(this)
			.then(function() {
				return clone.save();
			})
			.then(function() {
				this.model.set(clone.toJSON());

				// add the persona to our list
				turtl.profile.get('personas').upsert(this.model);
				if(is_new)
				{
					this.model.generate_key().bind(this)
						.then(function() {
							this.model.save();
						})
						.catch(function(err) {
							turtl.events.trigger('ui-error', 'There was a problem generating a key for your persona', err);
							log.error('persona: edit: keygen: ', this.model.id(), derr(err));
						});
				}

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem updating that persona', err);
				log.error('persona: edit: ', this.model.id(), derr(err));
			});
	}
});

