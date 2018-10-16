var InvitesController = Composer.ListController.extend({
	xdom: true,
	class_name: 'invite-list interface',

	elements: {
		'.item-list': 'container',
	},

	collection: null,

	empty: false,

	init: function() {
		this.collection = turtl.profile.get('invites');
		var title = i18next.t('Your invites');
		var last_route_space = turtl.last_routes.slice(0).reverse().filter(function(url) {
			return url.indexOf('/spaces/') == 0;
		})[0];
		var backurl = last_route_space || '/';
		turtl.push_title(title, backurl);
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [
				{name: i18next.t('Settings'), href: '/settings'},
			]}
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			turtl.route(atag.get('href'));
		}.bind(this));

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
					return new InvitesItemController({
						inject: options.container,
						model: model,
					});
				}.bind(this), {
					container: function() { return this.container; }.bind(this)
				});
			});
	},

	render: function() {
		return this.html(view.render('invites/index', {}))
			.bind(this)
			.then(function() {
				if(this.empty) this.el.addClass('is-empty');
				else this.el.removeClass('is-empty');
			});
	},
});

