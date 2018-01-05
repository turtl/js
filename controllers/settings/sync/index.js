var SyncController = Composer.ListController.extend({
	xdom: true,
	class_name: 'settings-sync',

	elements: {
		'.item-list': 'container',
	},

	collection: null,

	init: function()
	{
		var collection = new SyncCollection();
		collection.sortfn = function(a, b) { return a.id().localeCompare(b.id()); };
		this.collection = new Composer.FilterCollection(collection, {
			sort_events: true,
			diff_events: true,
		});

		this.with_bind(turtl.events, 'sync:connected', this.render.bind(this));
		turtl.push_title(i18next.t('Sync info'), '/settings');

		this.with_bind(this.collection, ['add', 'remove', 'reset'], this.render.bind(this));

		this.render()
			.bind(this)
			.then(function() {
				this.track(this.collection, function(model, options) {
					var con = new SyncItemController({
						inject: options.container,
						model: model,
					});
					this.with_bind(con, ['sync-unfreeze', 'sync-delete'], function() {
						collection.get_pending();
					}.bind(this));
					return con;
				}.bind(this), {
					container: function() { return this.container; }.bind(this)
				});
				var inter = setInterval(function() {
					collection.get_pending();
				}.bind(this), 5000);
				this.bind('release', function() { clearInterval(inter); });
				collection.get_pending();
				this.with_bind(turtl.events, 'sync:outgoing:complete', function() {
					collection.get_pending();
				});
			});
	},

	render: function()
	{
		var num_frozen = this.collection.filter(function(s) { return s.get('frozen', false); }).length;
		return this.html(view.render('settings/sync/index', {
			connected: turtl.connected,
			count: this.collection.size(),
			num_frozen: num_frozen,
		}));
	}
});

