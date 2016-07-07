var PersonasEditController = FormController.extend({
	elements: {
		'input[name=email]': 'inp_email',
		'input[name=name]': 'inp_name'
	},

	events: {
		'input input[name=email]': 'email_search'
	},

	in_modal: true,
	modal: null,

	model: null,
	formclass: 'personas-edit',

	init: function()
	{
		if(!this.model) this.model = new Persona();
		this.action = this.model.is_new() ? 'Add' : 'Edit';

		if(this.in_modal)
		{
			this.modal = new TurtlModal({
				show_header: true,
				title: this.action + ' persona'
			});
		}

		this.parent();
		this.render();

		if(this.in_modal)
		{
			var close = this.modal.close.bind(this.modal);
			this.modal.open(this.el);
			this.with_bind(this.modal, 'close', this.release.bind(this));
			this.bind(['cancel', 'close'], close);
		}

		this.requires_connection({msg: i18next.t('Adding/editing personas requires a connection to the Turtl server.')});

		var email = null;
		var email_timer = new Timer(500);
		this.with_bind(email_timer, 'fired', function() {
			this.do_email_search(email);
		}.bind(this));
		this.bind('email-search', function(the_email) {
			email = the_email;
			email_timer.reset();
		});

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
		if(!email) errors.push(i18next.t('Please enter an email for your persona'));

		if(errors.length)
		{
			barfr.barf(errors.join('<br>'));
			return Promise.reject();
		}

		var is_new = this.model.is_new();
		this.model.create_or_ensure_key(null, {silent: true});
		var clone = this.model.clone();
		clone.set({
			user_id: turtl.user.id(),
			email: email,
			name: name
		});
		return clone.save()
			.bind(this)
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
							turtl.events.trigger('ui-error', i18next.t('There was a problem generating a key for your persona'), err);
							log.error('persona: edit: keygen: ', this.model.id(), derr(err));
						});
				}

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that persona'), err);
				log.error('persona: edit: ', this.model.id(), derr(err));
			});
	},

	email_search: function(e)
	{
		var email = this.inp_email.get('value').clean();
		if(!email) return this.do_email_search(false);
		this.trigger('email-search', email);
	},

	do_email_search: function(email)
	{
		var promise;
		if(email)
		{
			promise = this.model.get_by_email(email, {ignore_this_persona: true});
		}
		else
		{
			promise = Promise.resolve(null);
		}
		promise.bind(this)
			.then(function(persona) {
				this._email_barf = barfr.barf(i18next.t('That email is already registered to another persona'), {persist: true});
				this.inp_email.addClass('error');
				this.disable(true);
			})
			.catch(function(err) {
				if(err.xhr && err.xhr.status == 404)
				{
					this.disable(false);
					this.inp_email.removeClass('error');
					if(this._email_barf) barfr.close_barf(this._email_barf);
				}
				else
				{
					throw new Error(JSON.stringify(err));
				}
			});
	}
});

