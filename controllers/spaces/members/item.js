var SpacesMemberItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',

	elements: {
		'.share-actions': 'actions_container',
	},

	events: {
		'click .menu a[href=#edit]': 'open_edit',
		'click .menu a[href=#delete]': 'open_delete',
		'click .menu a[href=#set-owner]': 'open_set_owner',
	},

	model: null,
	space: null,

	edit_permission: null,
	delete_permission: null,
	set_owner_permission: null,

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('members: item: no model passed');
		}
		if(!this.space) {
			this.release();
			throw new Error('members: item: no space passed');
		}
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.render()
			.bind(this)
			.then(function() {
				var actions = [];
				var is_me = this.model.get('user_id') == turtl.user.id();
				if(!is_me) {
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
				}
			});
	},

	render: function() {
		var role = this.model.get('role');
		var email = this.model.get_email();
		return this.html(view.render('spaces/members/item', {
			is_me: this.model.get('user_id') == turtl.user.id(),
			email: email,
			role: role,
		}));
	},

	open_edit: function(e) {
		if(e) e.stop();
		console.log('edit');
	},

	open_delete: function(e) {
		if(e) e.stop();
		if(!confirm(i18next.t('Really delete this user from this space?'))) return;
		this.model.destroy()
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting the user'), err);
				log.error('spaces: sharing: delete user: ', err, derr(err));
			});
	},

	open_set_owner: function(e) {
		if(e) e.stop();
		console.log('set owner');
	},
});

