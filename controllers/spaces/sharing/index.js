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

		const context = turtl.context.grab(this);

		this.members = this.model.get('members');
		this.invites = this.model.get('invites');

		var title = i18next.t('Sharing');
		var last_route_space = turtl.last_routes.slice(0).reverse().filter(function(url) {
			return url.indexOf('/spaces/') == 0 && url.indexOf('/sharing') < 0;
		})[0];
		var backurl = last_route_space || '/spaces/'+this.model.id()+'/notes';
		turtl.push_title(title, backurl, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		var invites = turtl.profile.get('invites');
		var set_header_actions = function() {
			var header_actions = [];
			if(invites.size() > 0) {
				header_actions.push({name: 'invites', icon: 'notification', class: 'notification mod bottom'});
			}
			var menu_actions = []
			menu_actions.push({name: i18next.t('Settings'), href: '/settings'});
			if(this.model.is_shared_with_me()) {
				menu_actions.push({name: i18next.t('Leave this space'), href: '#leave'});
			}
			header_actions.push({name: 'menu', actions: menu_actions});
			turtl.events.trigger('header:set-actions', header_actions);
		}.bind(this);
		set_header_actions();
		this.with_bind(this.model, 'destroy', turtl.route.bind(turtl, '/'));
		this.with_bind(invites, ['add', 'remove', 'reset', 'clear'], set_header_actions);
		this.with_bind(turtl.events, 'header:fire-action', function(name) {
			switch(name) {
				case 'invites': turtl.route('/invites'); break;
			}
		}.bind(this));
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			if(atag.get('href').match(/#leave/)) {
				return this.open_leave();
			}
			turtl.route(atag.get('href'));
		}.bind(this));

		var set_main_action = function() {
			if(this.model.can_i(Permissions.permissions.add_space_invite)) {
				this.sub('actions', function() {
					var actions = new ActionController({
						context: context,
					});
					actions.set_actions([{title: 'New member', name: 'share', icon: 'add_user'}]);
					this.with_bind(actions, 'actions:fire', this.open_send.bind(this));
					return actions;
				}.bind(this));
			} else {
				this.remove('actions');
			}
		}.bind(this);
		set_main_action();
		this.with_bind(this.model.get('members'), 'reset', set_main_action);

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

	open_leave: function(e) {
		if(e) e.stop();
		var model = this.members.find_user(turtl.user.id());
		if(!model) return;
		model.trigger('leave-space');
	},
});

