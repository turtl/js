var PersonaEditController = Composer.Controller.extend({
	elements: {
		'input[name=screenname]': 'inp_screenname',
		'input[name=email]': 'inp_email',
		'input[name=name]': 'inp_name',
		'img.load': 'screenname_loading',
		'p.taken': 'screenname_note'
	},

	events: {
		'keyup input[name=screenname]': 'check_screenname',
		'submit form': 'edit_persona',
		'click h1 a': 'open_personas'
	},

	collection: null,
	model: null,
	sn_timer: null,

	// if true, will return to board management instead of persona mgmt on close
	return_to_manage: false,

	init: function()
	{
		if(!this.model) this.model = new Persona();
		this.model.key = tagit.user.get_key();	// persona uses same key as user

		if(this.model.is_new() && this.collection.models().length > 0)
		{
			this.open_personas();
			return false;
		}

		this.render();
		modal.open(this.el);
		var modalclose = function() {
			modal.removeEvent('close', modalclose);
			this.release();
		}.bind(this);
		modal.addEvent('close', modalclose);

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(500);
		this.sn_timer.end = this.do_check_screenname.bind(this);
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('personas/edit', {
			persona: toJSON(this.model),
			return_to_manage: this.return_to_manage
		});
		this.html(content);
		(function() { this.inp_screenname.focus(); }).delay(1, this);
	},

	edit_persona: function(e)
	{
		if(e) e.stop();
		// TODO: if you add to these, remove them from the model below
		var screenname = this.inp_screenname.get('value');
		var name = this.inp_name.get('value').clean();
		var email = this.inp_email.get('value').clean();

		this.model.unset('screenname');
		this.model.unset('name');
		this.model.unset('email');

		if(!this.screenname_valid(screenname))
		{
			// TODO: fix duplication
			this.screenname_msg('A screenname can only include A-Z 0-9 and . (periods)');
			this.inp_screenname.addClass('error');
			return false;
		}

		var set		=	{screenname: screenname};
		var args	=	{};
		if(name != '') set.name = name;
		if(email != '') set.email = email;
		var is_new = this.model.is_new();
		if(is_new)
		{
			var symkey	=	tcrypt.gen_symmetric_keys(tagit.user);
			set.pubkey	=	symkey.public;
			set.privkey	=	symkey.private;
			set.secret	=	this.model.generate_secret(tagit.user.get_key());
			args.secret	=	set.secret;
		}
		this.model.set(set);
		tagit.loading(true);
		var do_save = function()
		{
			this.model.save({
				args: args,
				success: function(res) {
					tagit.loading(false);
					if(is_new) this.collection.add(this.model);
					this.model.trigger('saved');
					this.open_personas();
				}.bind(this),
				error: function(model, err) {
					tagit.loading(false);
					barfr.barf('There was a problem '+ (is_new ? 'adding' : 'updating') +' your persona: '+ err);
				}.bind(this)
			});
		}.bind(this);
		if(is_new)
		{
			do_save();
		}
		else
		{
			this.model.get_challenge({
				success: function(res) {
					var challenge = res;
					// set the challenge/response into the args sent with the save.
					// this lets the server know we own the persona.
					args.challenge = this.model.generate_response(challenge);
					do_save();
				}.bind(this),
				error: function(err, xhr) {
					barfr.barf('There was a problem verifying your ownership of this persona: '+ err);
				}.bind(this)
			});
		}
	},

	get_screenname: function()
	{
		return this.inp_screenname.get('value').replace(/[^a-z0-9\/\.]/gi, '').clean();
	},

	screenname_valid: function(screenname)
	{
		if(screenname.match(/[^a-z0-9\.]/i))
		{
			return false;
		}
		return true;
	},

	screenname_msg: function(msg, success)
	{
		success || (success = false);
		msg = msg.clean();

		this.screenname_note.className = this.screenname_note.className.replace(/(error|success)/g, '');
		this.screenname_note.addClass(success ? 'success' : 'error');
		this.screenname_note.setStyle('visibility', msg == '' ? 'hidden' : 'visible');
		if(msg != '')
		{
			this.screenname_note.set('html', msg);
		}
	},

	check_screenname: function(e)
	{
		var screenname = this.inp_screenname.get('value')
		if(!this.screenname_valid(screenname))
		{
			// TODO: fix duplication
			this.screenname_msg('A screenname can only include A-Z 0-9 and . (periods)');
			this.inp_screenname.addClass('error');
			return false;
		}
		this.screenname_note.setStyle('visibility', 'hidden');
		this.inp_screenname.removeClass('error');
		this.sn_timer.start();
		if(this.get_screenname() != '') this.screenname_loading.setStyle('display', 'inline');
	},

	do_check_screenname: function()
	{
		var screenname = this.get_screenname();
		this.screenname_loading.setStyle('display', '');
		if(screenname == '') return false;
		this.screenname_loading.setStyle('display', 'inline');
		this.model.get_by_screenname(screenname, {
			// don't want this persona to trigger a "screenname taken" error if
			// if already owns the screenname
			ignore_this_persona: true,

			success: function(res) {
				this.screenname_loading.setStyle('display', '');
				if(!this.screenname_valid(this.inp_screenname.get('value')))
				{
					return false;
				}
				this.screenname_msg('That screenname is taken =\'[.');
				this.inp_screenname.addClass('error');
			}.bind(this),
			error: function(err, xhr) {
				this.screenname_loading.setStyle('display', '');
				if(xhr.status == 404)
				{
					if(!this.screenname_valid(this.inp_screenname.get('value')))
					{
						return false;
					}
					this.screenname_msg('That screenname is available.', true);
				}
				else
				{
					barfr.barf('There was an error checking the availability of that screenname. Try again.');
				}
			}.bind(this)
		});
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		this.release();
		if(this.return_to_manage)
		{
			new BoardManageController({
				collection: tagit.profile.get('boards')
			});
		}
		else
		{
			new PersonasController();
		}
	}
});
