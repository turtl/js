var SpacesSharingController = Composer.Controller.extend({
	xdom: true,
	class_name: 'spaces-sharing interface',

	elements: {
		'.memlist.members .container': 'member_container',
		'.memlist.invites .container': 'invite_container',
	},

	events: {
	},

	model: null,
	members: null,
	invites: null,

	init: function() {
		if(!this.model) this.model = turtl.profile.current_space();
		if(!this.model) throw new Error('space sharing: no spaces available');

		this.members = this.model.get('members');
		this.invites = this.model.get('invites');

		var actions = [];
		if(this.model.can_i(Permissions.permissions.add_space_invite)) {
			actions.push({name: 'menu', actions: [{name: i18next.t('Send invite'), href: '#send-invite'}]});
		}

		var title = i18next.t('Sharing');
		turtl.push_title(title, null, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [
				{name: i18next.t('Settings'), href: '/settings'},
			]},
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			turtl.route(atag.get('href'));
		}.bind(this));

		if(this.model.can_i(Permissions.permissions.add_space_invite)) {
			this.track_subcontroller('actions', function() {
				var actions = new ActionController();
				actions.set_actions([{title: 'New member', name: 'share', icon: 'add_user'}]);
				this.with_bind(actions, 'actions:fire', this.open_send.bind(this));
				return actions;
			}.bind(this));
		}

		this.render()
			.bind(this)
			.then(function() {
				this.sub('member-list', function() {
					return new SpacesMemberListController({
						inject: this.member_container,
						space: this.model,
						collection: this.members,
						edit_permission: Permissions.permissions.edit_space_member,
						delete_permission: Permissions.permissions.delete_space_member,
						set_owner_permission: Permissions.permissions.set_space_owner,
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
	},

	render: function() {
		var can_add_invite = this.model.can_i(Permissions.permissions.add_space_invite);
		var space = this.model.toJSON();
		return this.html(view.render('spaces/sharing/index', {
			space: space,
			can_add_invite: can_add_invite,
		}));
	},

	open_send: function() {
		new SpacesSharingSendController({
			model: this.model,
		});
	},
});

