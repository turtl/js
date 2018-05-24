var SpacesMemberListController = Composer.ListController.extend({
	xdom: true,

	elements: {
		'.item-list': 'container',
	},

	space: null,
	collection: null,

	edit_permission: null,
	delete_permission: null,
	set_owner_permission: null,

	empty: false,

	init: function() {
		if(!this.space) {
			this.release();
			throw new Error('members: list: no space passed');
		}
		if(!this.collection) {
			this.release();
			throw new Error('members: list: no collection passed');
		}

		this.bind('list:empty', function() {
			this.empty = true;
			this.render();
		}.bind(this));
		this.bind('list:notempty', function() {
			this.empty = false;
			this.render();
		}.bind(this));

		this.render()
			.bind(this)
			.then(function() {
				this.track(this.collection, function(model, options) {
					return new SpacesMemberItemController({
						inject: options.container,
						model: model,
						space: this.space,
						edit_permission: this.edit_permission,
						delete_permission: this.delete_permission,
						set_owner_permission: this.set_owner_permission,
					});
				}.bind(this), {
					container: function() { return this.container; }.bind(this)
				});
			});
	},

	render: function() {
		return this.html(view.render('spaces/members/list', {
			empty: this.empty,
			empty_msg: i18next.t('None'),
		})).bind(this)
			.then(function() {
				if(this.empty) this.el.addClass('is-empty');
				else this.el.removeClass('is-empty');
			});
	},
});

