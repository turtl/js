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
	action: null,

	to_user: null,
	email_timer: null,
	email_note: '',
	email_note_class: false,
	passphrase_holder: false,

	init: function() {
		if(!this.action) this.action = i18next.t('Invite');
		this.parent();

		var confirmed = turtl.user.get('confirmed');
		if(!confirmed) {
			barfr.barf(i18next.t('You must confirm your email to share spaces.'));
			this.release();
			return;
		}

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
		var title = this.inp_title.get('value');
		var email = this.inp_email.get('value').toLowerCase();
		var role = this.inp_role.get('value');
		var passphrase = this.inp_passphrase.get('value') || null;
		var pubkey = (this.user && this.user.get('pubkey')) || null;

		var errors = [];
		if(!title) errors.push(i18next.t('Please give your invite a title.'));
		if(!email || !email.match(/@/)) {
			errors.push(i18next.t('The email given is invalid.'));
		}
		if(!role) errors.push(i18next.t('Please select a role for this user.'));
		if(!Permissions.roles[role]) errors.push(i18next.t('The specified role does not exist.'));

		if(errors.length) {
			barfr.barf(errors.join('<br>'));
			return;
		}

		var invite = new SpaceInvite({
			space_id: space_id,
			to_user: email,
			role: role,
			title: title,
		});

		this.disable(true);
		turtl.loading(true);
		return invite.send(pubkey, passphrase)
			.bind(this)
			.then(function() {
				this.trigger('close');
			})
			.catch(function(err) {
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
			.catch(function(err) {
				log.error('invites: find user by email: ', err, derr(err));
			})
			.finally(function() {
				this.disable(false);
			});
	},
});

