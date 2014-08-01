var PersonaEditController = Composer.Controller.extend({
	elements: {
		'input[name=email]': 'inp_email',
		'input[name=name]': 'inp_name',
		'img.load': 'email_loading',
		'p.taken': 'email_note',
		'input[type=submit]': 'inp_submit'
	},

	events: {
		'keyup input[name=email]': 'check_email',
		'submit form': 'edit_persona',
		'click h1 a': 'open_personas',
		'click a[href=#skip]': 'do_close'
	},

	edit_in_modal: true,

	collection: null,
	model: null,
	sn_timer: null,

	// whether or not this was opened after a join (shows a different interface)
	join: false,

	init: function()
	{
		if(!this.collection) this.collection = turtl.user.get('personas');
		if(!this.model) this.model = new Persona();
		this.model.key = turtl.user.get_key();	// persona uses same key as user

		if(this.model.is_new() && this.collection.models().length > 0)
		{
			this.open_personas();
			return false;
		}

		this.render();
		if(this.edit_in_modal)
		{
			modal.open(this.el);
			var close_fn = function() {
				this.release();
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(500);
		this.sn_timer.end = this.do_check_email.bind(this);
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('personas/edit', {
			persona: this.model.toJSON(),
			was_join: this.join
		});
		this.html(content);
		(function() { this.inp_email.focus(); }).delay(1, this);
		if(window.port) window.port.send('resize');
	},

	edit_persona: function(e)
	{
		if(e) e.stop();
		// TODO: if you add to these, remove them from the model below
		var email = this.inp_email.get('value').clean();
		var name = this.inp_name.get('value').clean();
		this.inp_submit.disabled = true;

		this.model.unset('name');
		this.model.unset('email');

		if(!this.email_valid(email))
		{
			// TODO: fix duplication
			this.email_msg('That email appears to be invalid.');
			this.inp_email.addClass('error');
			return false;
		}

		var set = {
			user_id: turtl.user.id(),
			email: email
		};
		if(name != '') set.name = name;
		if(email != '') set.email = email;
		var is_new = this.model.is_new();
		if(is_new)
		{
			set.pubkey = false;
			set.privkey = false;
		}
		this.model.set(set);
		if(is_new) this.model.generate_ecc_key();
		turtl.loading(true);
		this.model.save({
			success: function() {
				turtl.loading(false);
				if(is_new)
				{
					this.collection.add(this.model);
					barfr.barf('Persona added! You are now free to share with others.');
				}
				this.model.trigger('saved');
				if(this.join)
				{
					this.do_close();
				}
				else
				{
					this.open_personas();
				}
			}.bind(this),
			error: function(model, err) {
				turtl.loading(false);
				barfr.barf('There was a problem '+ (is_new ? 'adding' : 'updating') +' your persona: '+ err);
				this.inp_submit.disabled = false;
			}.bind(this)
		});
	},

	get_email: function()
	{
		return this.inp_email.get('value').clean();
	},

	email_valid: function(email)
	{
		if(email.match(/^\S+@\S+$/i))
		{
			return true;
		}
		return false;
	},

	email_msg: function(msg, success)
	{
		success || (success = false);
		msg = msg.clean().safe();

		this.email_note.className = this.email_note.className.replace(/(error|success)/g, '');
		this.email_note.addClass(success ? 'success' : 'error');
		this.email_note.setStyle('visibility', msg == '' ? 'hidden' : 'visible');
		if(msg != '')
		{
			this.email_note.set('html', msg);
		}
	},

	check_email: function(e)
	{
		var email = this.inp_email.get('value')
		if(!this.email_valid(email))
		{
			// TODO: fix duplication
			this.email_msg('That email appears to be invalid.');
			this.inp_email.addClass('error');
			return false;
		}
		this.email_note.setStyle('visibility', 'hidden');
		this.inp_email.removeClass('error');
		this.sn_timer.start();
		if(this.get_email() != '') this.email_loading.setStyle('display', 'inline');
	},

	do_check_email: function()
	{
		var email = this.get_email();
		this.email_loading.setStyle('display', '');
		if(email == '') return false;
		this.email_loading.setStyle('display', 'inline');
		this.model.get_by_email(email, {
			// don't want this persona to trigger a "email taken" error if
			// if already owns the email
			ignore_this_persona: true,

			success: function(res) {
				this.email_loading.setStyle('display', '');
				if(!this.email_valid(this.inp_email.get('value')))
				{
					return false;
				}
				this.email_msg('That email is taken =\'[.');
				this.inp_email.addClass('error');
			}.bind(this),
			error: function(err, xhr) {
				this.email_loading.setStyle('display', '');
				if(xhr.status == 404)
				{
					if(!this.email_valid(this.inp_email.get('value')))
					{
						return false;
					}
					this.email_msg('That email is available.', true);
				}
				else
				{
					barfr.barf('There was an error checking the availability of that email. Try again.');
				}
			}.bind(this)
		});
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		this.release();
		new PersonasController({
			inject: this.inject,
			edit_in_modal: this.edit_in_modal
		});
	},

	do_close: function(e)
	{
		if(e) e.stop();
		this.release();
		if(window.port) window.port.send('close');
	}
});
