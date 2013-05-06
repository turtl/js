/**
 * This is a controll used to manage a list of sub-controllers (for instance,
 * you may have a Notes controller, but each note will have its own NoteItem
 * controller).
 *
 * TrackController automatically binds add/remove/reset/etc events and displays
 * the subcontrollers accordingly (taking sort order into account).
 *
 * All you need to specify is the collection you wish to track and the type of
 * subcontroller (and its args) to create
 *
 * Meant to be extended (for instance the Notes controller would extend this).
 */
var TrackController = Composer.Controller.extend({

	sub_controllers: [],
	sub_controller_index: {},
	collection: null,
	model_key: 'model',

	setup_tracking: function(collection, model_key)
	{
		if(!collection) return false;
		this.collection = collection;
		if(model_key) this.model_key = model_key;

		this.collection.bind('add', this.add_subcontroller.bind(this), 'tracker:add');
		this.collection.bind('remove', this.remove_subcontroller.bind(this), 'tracker:remove');
		this.collection.bind('clear', this.release_subcontrollers.bind(this), 'tracker:clear');
		this.collection.bind('reset', this.refresh_subcontrollers.bind(this), 'tracker:reset');

		if(this.collection.models().length != this.sub_controllers.length)
		{
			this.refresh_subcontrollers();
		}

		return this;
	},

	stop_tracking: function()
	{
		this.collection.unbind('add', 'tracker:add');
		this.collection.unbind('remove', 'tracker:remove');
		this.collection.unbind('clear', 'tracker:clear');
		this.collection.unbind('reset', 'tracker:reset');
	},

	release_subcontrollers: function()
	{
		this.sub_controllers.each(function(c) {
			c.release();
		});
		this.sub_controllers = [];
		this.sub_controller_index = {};
	},

	release: function()
	{
		this.release_subcontrollers();
		if(this.collection)
		{
			this.stop_tracking();
		}
		return this.parent.apply(this, arguments);
	},

	add_subcontroller: function(model)
	{
		var sub = this.create_subcontroller(model);
		var sort_index = this.collection.sort_index(model);
		var list = sub.inject;
		if(sort_index !== false && list)
		{
			var sub_el = sub.el;
			// remove the controller from the DOM
			if(list.getChildren().length > 1)
			{
				sub_el.dispose();
				var children = list.getChildren();
				var position = 'before';
				var el = children[sort_index];
				if(!el)
				{
					el = children.getLast();
					position = 'after';
				}
				sub_el.inject(el, position);
			}
		}
		this.sub_controllers.push(sub);
		this.sub_controller_index[model.id()] = sub;
		sub.bind('release', function() {
			this.do_remove_subcontroller(sub, model.id());
		}.bind(this));
	},

	do_remove_subcontroller: function(sub, model_id)
	{
		// remove the above subcontrollers from our tracking list
		this.sub_controllers = this.sub_controllers.filter(function(c) {
			if(sub == c) return false;
			return true;
		});
		// delete the index entry
		delete this.sub_controller_index[model_id];
	},

	remove_subcontroller: function(model)
	{
		// find all subcontrollers that hold this model
		var sub = this.sub_controller_index[model.id()];

		// release the matching subcontrollers
		sub.release();
	},

	refresh_subcontrollers: function()
	{
		this.release_subcontrollers();
		this.collection.each(function(model) {
			this.add_subcontroller(model);
		}.bind(this));
		/*
		if(this.sub_controllers.length == 0) return;

		this.sub_controllers.sort(function(a, b) {
			var m1 = a[this.model_key];
			var m2 = b[this.model_key];
			if(this.collection.sortfn) return this.collection.sortfn(m1, m2);
			else return 0;
		}.bind(this));

		// remove all from the dom, and add them back in in the correct order
		var list = this.sub_controllers[0].inject;
		this.sub_controllers.each(function(c) { c.el.dispose(); });
		this.sub_controllers.each(function(c) {
			c.el.inject(list, 'bottom');
		});
		*/
	}
});
