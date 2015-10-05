var BoardsShareListController = Composer.ListController.extend({
	elements: {
		'ul': 'el_list'
	},

	events: {
	},

	model: null,
	collection: null,
	filter: null,

	pending: false,

	init: function()
	{
		if(this.pending)
		{
			var board_id = this.model.id();
			var my_persona = turtl.profile.get('personas').first().id();
			this.filter = new Composer.FilterCollection(this.collection, {
				filter: function(model)
				{
					var res = model.get('object_id') == board_id &&
						model.get('from') == my_persona;
					return res;
				}
			});
		}
		else
		{
			this.filter = new Composer.FilterCollection(this.collection, {
				filter: function() { return true; }
			});
		}

		this.render();

		// timing issue fix: when index.js detects the invites add/remove, it
		// re-renders (mid-event). so the track() call resets the invite, then
		// the filtercollection catches the add event and the model is double
		// added. by adding a delay here, we don't reset/add in the middle of
		// the event fire, and don't double-add
		setTimeout(function() {
			this.track(this.filter, function(model, options) {
				return new BoardsShareItemController({
					inject: this.el_list,
					pending: this.pending,
					board: this.model,
					model: model
				});
			}.bind(this));
		}.bind(this));
	},

	render: function()
	{
		this.html('<ul class="item-list"></ul>');
	}
});

