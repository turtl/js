var BoardsShareInviteController = FormController.extend({
	class_name: 'board-share',

	elements: {
		'input[name=title]': 'inp_title',
		'input[name=email]': 'inp_email',
		'input[name=passphrase]': 'inp_passphrase',
		//'input[name=challenge]': 'inp_challenge',
		//'input[name=response]': 'inp_response',
		'input[name=use-challenge]': 'inp_use_challenge',
		'.loader svg': 'loader',
		'.invite-type': 'el_invite_type',
		'.challenge': 'el_challenge',
		'.challenge .inner': 'el_challenge_inner'
	},

	events: {
		'keyup input[name=email]': 'update_email',
		'change input[name=use-challenge]': 'toggle_challenge'
	},

	modal: null,
	model: null,
	formclass: 'boards-invite',
	buttons: true,
	button_tabindex: 5,
	action: 'Invite',

	email: null,
	email_timer: null,
	persona: null,

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('boards: share: invite: no model passed');
		}
		//this.action = 'Invite';
		this.modal = new TurtlModal({
			show_header: true,
			title: 'New invite'
		});
		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.requires_connection({msg: 'Sharing a board requires a connection to the Turtl server.'});

		this.email_timer = new Timer(500);
		this.email_timer.bind('fired', this.query_email.bind(this));
	},

	render: function()
	{
		var board = this.model.toJSON();
		this.html(view.render('boards/share/invite', {
			board: board
		}));
		(function() { this.inp_email.focus(); }).delay(300, this);
		this.el_challenge_inner.set('slide', {duration: 300});
		this.el_challenge_inner.get('slide').hide();
	},

	render_invite_type: function(typeclass, email, extra_params)
	{
		extra_params || (extra_params = {});

		this.track_subcontroller('invite-type', function() {
			var params = {
				inject: this.el_invite_type,
				model: this.model,
				email: email
			};
			Object.keys(extra_params).forEach(function(key) { params[key] = extra_params[key]; });
			var con = new typeclass(params);
			return con;
		}.bind(this));
	},

	submit: function(e)
	{
		if(e) e.stop();
		var my_persona = turtl.profile.get('personas').first();

		var title = this.inp_title.get('value');
		var email = this.email;
		var set_challenge = this.inp_use_challenge.get('checked');
		var passphrase = this.inp_passphrase.get('value');
		//var challenge = this.inp_challenge.get('value');
		//var response = this.inp_response.get('value');
		var errors = [];
		if(!title) errors.push([this.inp_title, 'Please give this invite a title']);
		if(!email) errors.push([this.inp_email, 'Please enter a valid email']);

		var invite_data = {
			object_id: this.model.id(),
			perms: 2,
			to_persona: this.persona || null,
			from: my_persona.id(),
			to: this.persona ? this.persona.id(true) : email,
			title: title,
			key: this.model.key
		};

		if(set_challenge)
		{
			if(!passphrase) errors.push([this.inp_passphrase, 'Please enter a passphrase to protect the invite']);
			invite_data.passphrase = passphrase;

			//if(!challenge) errors.push([this.inp_challenge, 'Please enter a question only the recipient will know the answer to']);
			//if(!response) errors.push([this.inp_response, 'Please enter the answer to the question']);
			//invite_data.challenge = challenge;
			//invite_data.response = response;
		}

		if(!this.check_errors(errors)) return;

		var invite = new Invite(invite_data);
		return this.model.create_share(invite).bind(this)
			.then(function() {
				barfr.barf('Invite sent');
				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem sending that invite', err);
				log.error('board: share: ', this.model.id(), derr(err));
			});
	},

	update_email: function(e)
	{
		this.email = false;
		this.email_timer.reset();
	},

	query_email: function()
	{
		var email = this.inp_email.get('value');
		if(!email.match(/@/)) return;

		this.persona = null;
		new Persona().get_by_email(email, {require_pubkey: true}).bind(this)
			.then(function(persona) {
				this.persona = persona;
				this.render_invite_type(BoardsShareInvitePersonaController, email);
			})
			.catch(function(err) {
				if(err && (err.outdated_key || (err.xhr && err.xhr.status == 404)))
				{
					this.persona = null;
					this.inp_use_challenge.set('checked', true);
					this.toggle_challenge();
					return this.render_invite_type(BoardsShareInviteEmailController, email, {
						outdated_key: !!err.outdated_key
					});
				}
				throw err;
			})
			.finally(function() {
				this.email = email;
			});
	},

	toggle_challenge: function(e)
	{
		var checked = this.inp_use_challenge.get('checked');
		if(checked)
		{
			this.el_challenge_inner.slide('in');
			this.el_challenge.addClass('active');
			if(e)
			{
				setTimeout(function() {
					this.inp_passphrase.focus();
				}.bind(this), 100);
			}
		}
		else
		{
			this.el_challenge_inner.slide('out');
			this.el_challenge.removeClass('active');
		}
	}
});

