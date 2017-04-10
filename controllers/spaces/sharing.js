var SpacesSharingController = Composer.Controller.extend({
	xdom: true,
	class_name: 'spaces-sharing',

	elements: {
		'.memlist.members .container': 'member_container',
		'.memlist.invites .container': 'invite_container',
		'.send input[name=title]': 'inp_title',
		'.send input[name=email]': 'inp_email',
		'.send select[name=role]': 'inp_role',
		'.send input[name=passphrase]': 'inp_passphrase',
	},

	events: {
		'submit .send form': 'send_invite',
		'click .send .button.cancel': 'close_send',
	},

	model: null,
	members: null,
	invites: null,
	modal: null,

	send_open: false,

	init: function() {
		if(!this.model) this.model = turtl.profile.current_space();
		if(!this.model) throw new Error('space sharing: no spaces available');

		this.members = this.model.get('members');
		this.invites = this.model.get('invites');

		var actions = [];
		if(this.model.can_i(Permissions.permissions.add_space_invite)) {
			actions.push({name: 'menu', actions: [{name: i18next.t('Send invite'), href: '#send-invite'}]});
		}

		var title = i18next.t('Collaborators on "{{space}}"', {space: this.model.get('title')});
		this.modal = new TurtlModal({
			show_header: true,
			title: title,
			actions: actions,
			class_name: 'turtl-modal spaces-sharing-modal',
		});

		this.with_bind(this.modal, 'header:menu:fire-action', function(action, tag) {
			switch(tag.get('href'))
			{
				case '#send-invite': this.open_send(); break;
			}
		}.bind(this));

		this.render()
			.bind(this)
			.then(function() {
				this.modal.open(this.el);

				this.sub('member-list', function() {
					return new SpacesMemberListController({
						inject: this.member_container,
						space: this.model,
						collection: this.members,
						edit_permission: Permissions.permissions.edit_space_member,
						delete_permission: Permissions.permissions.delete_space_member,
					});
				}.bind(this));
				this.sub('invite-list', function() {
					return new SpacesMemberListController({
						inject: this.invite_container,
						space: this.model,
						collection: this.invites,
						edit_permission: Permissions.permissions.edit_space_invite,
						delete_permission: Permissions.permissions.delete_space_invite,
					});
				}.bind(this));
			});
		var close = this.modal.close.bind(this.modal);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function() {
		var can_add_invite = this.model.can_i(Permissions.permissions.add_space_invite);
		var can_edit_invite = this.model.can_i(Permissions.permissions.edit_space_invite);
		var can_delete_invite = this.model.can_i(Permissions.permissions.delete_space_invite);
		var space = this.model.toJSON();
		var roles = Object.values(Permissions.roles)
			.filter(function(r) { return r != Permissions.roles.owner; });
		return this.html(view.render('spaces/sharing', {
			space: space,
			roles: roles,
			invite_title: i18next.t('Invite to "{{space}}"', {space: space.title}),
			send_open: this.send_open,
			can_add_invite: can_add_invite,
			can_edit_invite: can_edit_invite,
			can_delete_invite: can_delete_invite,
		}));
	},

	open_send: function() {
		this.send_open = true;
		this.render()
			.bind(this)
			.then(function() {
				this.inp_email && this.inp_email.focus()
			});
	},

	close_send: function() {
		this.send_open = false;
		this.render();
	},

	send_invite: function(e) {
		if(e) e.stop();
		var space_id = this.model.id();
		var title = this.inp_title.get('value');
		var email = this.inp_email.get('value');
		var role = this.inp_role.get('value');
		var passphrase = this.inp_passphrase.get('value') || false;

		var invite = new Invite({
			space_id: space_id,
			role: role,
			has_passphrase: !!passphrase,
			title: title,
		});
	},
});

