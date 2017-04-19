var SpacesSharingSendController = FormController.extend({
	xdom: true,
	class_name: 'spaces-invite',

	elements: {
		'input[name=title]': 'inp_title',
		'input[name=email]': 'inp_email',
		'select[name=role]': 'inp_role',
		'input[name=passphrase]': 'inp_passphrase',
	},

	events: {
		'keyup input[name=email]': 'update_email',
	},

	model: null,
	modal: null,

	formclass: 'space-invite',
	buttons: true,
	button_tabindex: 6,
	action: 'Invite',

	to_user: null,
	email_timer: null,
	email_note: '',
	email_note_class: false,
	passphrase_holder: false,

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('spaces: share: invite: no model passed');
		}

		this.requires_connection({msg: i18next.t('Sending an invite requires a connection to the Turtl server.')});

		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: i18next.t('New invite'),
		}, this.modal_opts && this.modal_opts() || {}));

		var close = this.modal.close.bind(this.modal);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.email_timer = new Timer(750);
		this.email_timer.bind('fired', this.query_email.bind(this));

		this.render()
			.bind(this)
			.then(function() {
				this.modal.open(this.el);
				this.inp_email && this.inp_email.focus();
			});
	},

	render: function() {
		var space = this.model.toJSON();
		var roles = {};
		Object.keys(Permissions.roles).forEach(function(role) {
			if(role == Permissions.roles.owner) return;
			roles[Permissions.roles[role]] = Permissions.desc[role];
		});
		return this.html(view.render('spaces/sharing/send', {
			space: space,
			roles: roles,
			desc: Permissions.desc,
			email_note: this.email_note,
			email_note_class: this.email_note_class,
			passphrase_holder: this.passphrase_holder || i18next.t('Passphrase'),
		}));
	},

	submit: function(e) {
		if(e) e.stop();
		var space_id = this.model.id();
		var space_key = this.model.key;
		var title = this.inp_title.get('value');
		var email = this.inp_email.get('value').toLowerCase();
		var role = this.inp_role.get('value');
		var passphrase = this.inp_passphrase.get('value') || false;
		var pubkey = this.user && this.user.get('pubkey');

		var errors = [];
		if(!title) errors.push(i18next.t('Please give your invite a title.'));
		if(!space_key) errors.push(i18next.t('The current space has no key. Please try logging out and back in.'));
		if(!email || !email.match(/@/)) {
			errors.push(i18next.t('The email given is invalid.'));
		}
		if(!role) errors.push(i18next.t('Please select a role for this user.'));
		if(!Permissions.roles[role]) errors.push(i18next.t('The specified role does not exist.'));

		var member_exists = !!this.model.get('members').find(function(m) {
			return m.get_email() == email;
		});
		var invite_exists = !!this.model.get('invites').find(function(m) {
			return m.get_email() == email;
		});
		if(member_exists) errors.push(i18next.t('That user is already a member of this space.'));
		if(invite_exists) errors.push(i18next.t('That user is already invited to this space.'));

		if(errors.length) {
			barfr.barf(errors.join('<br>'));
			return;
		}

		var invite = new Invite({
			space_id: space_id,
			space_key: tcrypt.to_base64(space_key),
			to_user: email,
			role: role,
			title: title,
		});

		this.disable(true);
		turtl.loading(true);
		return invite.seal(pubkey, passphrase)
			.bind(this)
			.then(function() {
				return invite.send();
			})
			.then(function() {
				var clone = new Invite(invite.safe_json());
				this.model.get('invites').upsert(clone);
				this.trigger('close');
			})
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem sending that invite'), err);
				log.error('spaces: invites: send: ', err, derr(err));
			})
			.finally(function() {
				this.disable(false);
				turtl.loading(false);
			});
	},

	update_email: function(e) {
		this.disable(true);
		this.email_timer.reset();
	},

	query_email: function() {
		var email = this.inp_email.get('value');
		if(!email.match(/@/)) {
			this.email_note_class = false;
			this.passphrase_holder = false;
			this.render();
			return;
		}

		turtl.user.find_by_email(email)
			.bind(this)
			.then(function(user) {
				this.user = user ? new User(user) : null;
				if(user) {
					if(user.confirmed) {
						this.email_note = i18next.t('{{email}} has a confirmed account and this invite will be encrypted using their public key.', {email: email});
						this.email_note_class = 'success';
						this.passphrase_holder = i18next.t('Passphrase (optional)');
					} else {
						this.email_note = i18next.t('{{email}} has a Turtl account, but it is not confirmed. You may want protect the invite with a passphrase to keep it private.', {email: email});
						this.email_note_class = 'warn';
						this.passphrase_holder = i18next.t('Passphrase (optional, but recommended)');
					}
				} else  {
					this.email_note = i18next.t('{{email}} isn\'t registered with Turtl. It\'s recommended to protect the invite with a passphrase to keep it private.', {email: email});
					this.email_note_class = 'warn';
					this.passphrase_holder = i18next.t('Passphrase (optional, but recommended)');
				}
				this.render();
			})
			.finally(function() {
				this.disable(false);
			});
	},
});

/*
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

	// set to true if the user toggles the "Protect this invite" box so we know
	// NOT to negate their selection
	user_toggled_protect: false,

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
			title: i18next.t('New invite')
		});
		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.requires_connection({msg: i18next.t('Sharing a board requires a connection to the Turtl server.')});

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
		if(!title) errors.push([this.inp_title, i18next.t('Please give this invite a title')]);
		if(!email) errors.push([this.inp_email, i18next.t('Please enter a valid email')]);

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
			if(!passphrase) errors.push([this.inp_passphrase, i18next.t('Please enter a passphrase to protect the invite')]);
			invite_data.passphrase = passphrase;

			//if(!challenge) errors.push([this.inp_challenge, 'Please enter a question only the recipient will know the answer to']);
			//if(!response) errors.push([this.inp_response, 'Please enter the answer to the question']);
			//invite_data.challenge = challenge;
			//invite_data.response = response;
		}

		if(!this.check_errors(errors)) return;

		var invite = new BoardInvite(invite_data);
		this.disable(true);
		return invite.create().bind(this)
			.then(function() {
				barfr.barf(i18next.t('Invite sent'));
				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem sending that invite'), err);
				log.error('board: share: ', this.model.id(), derr(err));
				this.disable(false);
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
				if(!this.user_toggled_protect)
				{
					this.inp_use_challenge.set('checked', false);
					this.toggle_challenge();
				}
			})
			.catch(function(err) {
				if(err && (err.outdated_key || (err.xhr && err.xhr.status == 404)))
				{
					this.persona = null;
					if(!this.user_toggled_protect)
					{
						this.inp_use_challenge.set('checked', true);
						this.toggle_challenge();
					}
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
		if(e) this.user_toggled_protect = true;
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
*/

