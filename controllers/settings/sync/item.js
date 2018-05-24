var SyncItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',

	elements: {
		'.share-actions': 'actions_container',
	},

	events: {
		'click .menu a[href=#unfreeze]': 'unfreeze_item',
		'click .menu a[href=#delete]': 'delete_item',
	},

	model: null,

	init: function() {
		turtl.push_title(i18next.t('Sync info'), '/settings');

		// update our ago time
		var interval = setInterval(this.render.bind(this), 60000);
		this.bind('release', function() { clearInterval(interval); });

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.render();
	},

	render: function() {
		var data = this.model.toJSON();
		// make sure we properly localize our sync actions
		var action_map = {
			'add': i18next.t('Add'),
			'edit': i18next.t('Edit'),
			'delete': i18next.t('Delete'),
			'move-space': i18next.t('Move space'),
			'change-password': i18next.t('Change password'),
		};
		data.action_text = action_map[data.action];
		return this.html(view.render('settings/sync/item', {
			sync: data,
			created: id_timestamp(data.id),
		})).bind(this)
			.then(function() {
				this.el
					.removeClass('frozen')
					.removeClass('blocked');
				if(data.frozen) {
					this.el.addClass('frozen');
					var actions = [
						{name: i18next.t('Unfreeze sync item'), href: '#unfreeze'},
						{name: i18next.t('Delete sync item'), href: '#delete'},
					];
					this.sub('actions', function() {
						return new ItemActionsController({
							inject: this.actions_container,
							actions: [actions],
						});
					}.bind(this));
				}
				else if(data.blocked) {
					this.el.addClass('blocked');
				}
			});
	},

	unfreeze_item: function(e) {
		if(e) e.stop();
		this.model.unfreeze()
			.bind(this)
			.then(function() {
				this.trigger('sync-unfreeze');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem unfreezing that sync item'), err);
				log.error('sync: unfreeze: ', err, derr(err));
			});
	},

	delete_item: function(e) {
		if(e) e.stop();
		if(!confirm(i18next.t('Really delete this sync item? Doing this will undo a change you\'ve made locally (try unfreezing first).'))) return false;
		this.model.delete()
			.bind(this)
			.then(function() {
				this.trigger('sync-delete');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting that sync item'), err);
				log.error('sync: delete: ', err, derr(err));
			});
	},
});


