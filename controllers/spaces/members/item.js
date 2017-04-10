var SpacesMemberItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',

	elements: {
		'.share-actions': 'actions_container',
	},

	events: {
		'click .menu a[href=#edit]': 'open_edit',
		'click .menu a[href=#delete]': 'open_delete',
	},

	model: null,
	space: null,

	edit_permission: null,
	delete_permission: null,

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('members: item: no model passed');
		}
		if(!this.space) {
			this.release();
			throw new Error('members: item: no space passed');
		}
		this.render()
			.bind(this)
			.then(function() {
				var actions = [];
				if(this.space.can_i(this.edit_permission)) {
					actions.push({name: i18next.t('Edit'), href: '#edit'});
				}
				if(this.space.can_i(this.delete_permission)) {
					actions.push({name: i18next.t('Delete'), href: '#delete'});
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
			email: email,
			role: role,
		}));
	},

	open_edit: function(e) {
		if(e) e.stop();
	},

	open_delete: function(e) {
		if(e) e.stop();
	},
});

