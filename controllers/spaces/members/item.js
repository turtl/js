var SpacesMemberItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',
	class_name: 'member',

	elements: {
		'.share-actions': 'actions_container',
		'.editing select[name=role]': 'inp_role',
	},

	events: {
		'click .menu a[href=#edit]': 'open_edit',
		'click .editing a[href=#save]': 'save_edit',
		'click .editing a[href=#cancel]': 'cancel_edit',
		'click .menu a[href=#delete]': 'open_delete',
		'click .menu a[href=#set-owner]': 'open_set_owner',
		'click .menu a[href=#leave]': 'open_leave',
	},

	model: null,
	space: null,

	edit_permission: null,
	delete_permission: null,
	set_owner_permission: null,

	edit_mode: false,

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('members: item: no model passed');
		}
		if(!this.space) {
			this.release();
			throw new Error('members: item: no space passed');
		}

		var update_actions = function() {
			var actions = [];
			var is_me = this.model.get('user_id') == turtl.user.id();
			var is_owner = this.model.get('user_id') == this.space.get_owner().get('user_id');
			if(is_me && !is_owner) {
				actions.push({name: i18next.t('Leave this space'), href: '#leave'});
			} else if(!is_me && !is_owner) {
				if(this.space.can_i(this.edit_permission)) {
					actions.push({name: i18next.t('Edit'), href: '#edit'});
				}
				if(this.space.can_i(this.delete_permission)) {
					actions.push({name: i18next.t('Delete'), href: '#delete'});
				}
				if(this.set_owner_permission && this.space.can_i(this.set_owner_permission)) {
					actions.push({name: i18next.t('Set as owner'), href: '#set-owner'});
				}
			}
			if(actions.length > 0) {
				this.sub('actions', function() {
					return new ItemActionsController({
						inject: this.actions_container,
						actions: [actions],
					});
				}.bind(this));
			} else {
				this.remove('actions');
			}
		}.bind(this);

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model, 'leave-space', this.open_leave.bind(this));
		this.render()
			.bind(this)
			.then(update_actions);
	},

	render: function() {
		var role = this.model.get('role');
		var email = this.model.get_email();
		var roles = {};
		Object.keys(Permissions.roles).forEach(function(role) {
			if(role == Permissions.roles.owner) return;
			roles[Permissions.roles[role]] = Permissions.desc[role];
		});
		return this.html(view.render('spaces/members/item', {
			is_me: this.model.get('user_id') == turtl.user.id(),
			email: email,
			role: role,
			edit_mode: this.edit_mode,
			roles: roles,
		}));
	},

	open_edit: function(e) {
		if(e) e.stop();
		this.edit_mode = true;
		this.render();
	},

	save_edit: function(e) {
		if(e) e.stop();
		if(!this.inp_role) {
			this.edit_mode = false;
			this.render();
			return;
		}
		var role = this.inp_role.get('value');
		var clone = this.model.clone();
		clone.set({role: role});
		clone.save()
			.bind(this)
			.then(function() {
				this.edit_mode = false;
				this.model.set(clone.toJSON());
				this.render();
			})
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem editing the user'), err);
				log.error('spaces: sharing: edit user: ', err, derr(err));
			});
	},

	cancel_edit: function(e) {
		if(e) e.stop();
		this.edit_mode = false;
		this.render();
	},

	do_delete: function() {
		return this.model.delete()
	},

	open_delete: function(e) {
		if(e) e.stop();
		if(!confirm(i18next.t('Really delete this user from this space?'))) return;
		this.model.delete()
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting the user'), err);
				log.error('spaces: sharing: delete user: ', err, derr(err));
			});
	},

	open_set_owner: function(e) {
		if(e) e.stop();
		if(!confirm(i18next.t('Really hand ownership of this space to another member? (You will be demoted to admin)'))) return;
		this.space.set_owner(this.model.get('user_id'))
			.bind(this)
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem setting the new owner'), err);
				log.error('spaces: sharing: set owner: ', err, derr(err));
			});
	},

	open_leave: function(e) {
		if(e) e.stop();
		if(!confirm(i18next.t('Really leave this space?'))) return;
		this.model.leave()
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem leaving the space'), err);
				log.error('spaces: sharing: leave: ', err, derr(err));
			});
	},
});

