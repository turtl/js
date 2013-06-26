/**
 * NOTE: FilterCollection is considered alpha/experimental and although this
 * most likely won't happen, it may be subject to substantial API changes. Use/
 * depend on at your own risk!
 *
 * It's also completely undocumented...good luck!
 * -----------------------------------------------------------------------------
 *
 * Composer.js is an MVC framework for creating and organizing javascript 
 * applications. For documentation, please visit:
 *
 *     http://lyonbros.github.com/composer.js/
 * 
 * -----------------------------------------------------------------------------
 *
 * Copyright (c) 2011, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * 
 * Licensed under The MIT License. 
 * Redistributions of files must retain the above copyright notice.
 */
(function() {
	/**
	 * Collection that exists solely to be a "materialized view" of another
	 * "master" collection. Whenever items are added/removed from the master
	 * collection, the changes are filtered and applied to this collection as well.
	 * This is useful for keeping many collections in sync with one master list
	 * without having to manually update them all.
	 */
	var FilterCollection	=	new Class({
		Extends: Composer.Collection,

		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'filtercollection',

		master: null,
		filter: null,
		transform: null,
		limit: false,

		_do_match_action: null,

		forward_all_events: false,
		refresh_on_change: true,	// performance hit, but needed for backward compat

		initialize: function(master, options)
		{
			options || (options = {});

			Object.each(Object.clone(options), function(v, k) {
				if(typeof(v) == 'function') v = v.bind(this);
				this[k]	=	v;
			}, this);

			// assign the unique app id
			this._cid	=	Composer.cid();

			this.master	=	master;

			if(!this.master) return false;
			if(!this.filter) return false;

			this.attach(options);
			if(!options.skip_initial_sync) this.refresh();
		},

		attach: function()
		{
			if(!this._do_match_action) this._do_match_action = this.match_action.bind(this);
			this.master.bind('all', this._do_match_action, 'filtercollection:'+this._cid+':all');
			this.bind('reset', function(options) {
				options || (options = {});
				if(options.has_reload) return false;
				this.refresh(options);
			}.bind(this), 'filtercollection:reset');
		},

		detach: function()
		{
			this.master.unbind('all', 'filtercollection:'+this._cid+':all');
			this.unbind('reset', 'filtercollection:reset');
		},

		match_action: function(event, model)
		{
			switch(event)
			{
			case 'add':
				this.add_event(model, {from_event: true}); break;
			case 'reset':
				this.refresh(); break;
			case 'clear':
				this.clear(); break;
			case 'remove':
				this.remove_event(model, {from_event: true}); break;
			case 'change':
				this.change_event(model); break;
			case 'sort':
				this.refresh(); break;
			default:
				this.forward_event.apply(this, arguments); break;
			}
		},

		refresh: function(options)
		{
			options || (options = {});

			if(options.diff_events)
			{
				var old_models	=	this._models;
			}
			this._models	=	this.master._models.filter(this.filter);
			this.sort({silent: true});
			if(this.limit) this._models.splice(this.limit);
			if(options.diff_events)
			{
				var arrdiff	=	function(arr1, arr2) { return arr1.filter(function(el) { return !arr2.contains(el); }); };

				arrdiff(old_models, this._models).each(function(model) {
					this.fire_event('remove', options, model);
				}, this);

				arrdiff(this._models, old_models).each(function(model) {
					this.fire_event('add', options, model);
				}, this);
			}
			this.fire_event('reset', options, {has_reload: true});
		},

		change_event: function(model, options)
		{
			options || (options = {});

			// see if this model even belongs to this collection
			if(model && !this.filter(model)) return false;

			// track the current number of items and reloda the data
			var num_items	=	this._models.length;

			if(this.refresh_on_change)
			{
				// the brute force option (re-sort everything, re-filter everything)
				// VERY expensive
				this.refresh({silent: true});
			}
			else
			{
				// a more tactful approach
				var cur_index = this._models.indexOf(model);
				var new_index = this.sort_index(model);

				if(cur_index == -1 && this.filter(model))
				{
					// welcome to the team!
					this.add(model, options);
				}
				else if(cur_index > -1 && !this.filter(model))
				{
					// we feel that your interests no longer align with the team's
					// ...we're going to ahve to let you go.
					//
					// You BASTARDS I've poured my LIFE into this collection!!
					//
					// Yes and we're thankful for your hard work, but feel it's
					// time to move on. Your replacement is a potted plant (come
					// to think of it, so is your severance). Think of this as a
					// new beginning! Now get out of my office.
					this.remove(model, options);
				}
				else if(cur_index != new_index)
				{
					// sort order changed
					this.sort(options);
				}
			}

			// do nothing if no change
			if(this._models.length == num_items)
			{
				this.fire_event('change', options);
			}
			else
			{
				this.fire_event('reset', options);
			}
		},

		set_filter: function(fn, options)
		{
			if(!fn) return false;
			options || (options = {refresh: true});
			this.filter	=	fn.bind(this);
			if(!options.refresh) this.refresh();
		},

		add: function(data, options)
		{
			if (data instanceof Array)
			{
				return Object.each(data, function(model) { this.add(model, options); }, this);
			}
			
			options || (options = {});
			if(typeof(options.transform) == 'undefined') options.transform = true;

			// if we are passing raw data, create a new model from data
			var model		=	data.__composer_type == 'model' ? data : new this.master.model(data, options);

			if(this.transform && options.transform)
			{
				model	=	this.transform.call(this, model, 'add');
			}

			// model doesn't match filter. NICE TRY
			if(!this.filter(model)) return false;

			if(typeof(options.at) == 'number')
			{
				// find the correct insertion point in the master it options.at is set.
				var current		=	this.at(options.at);
				var master_idx	=	this.master.index_of(current);
				if(master_idx !== false)
				{
					options.at	=	master_idx;
				}
			}
			
			// add this model into the master (if it's not already in it)
			var add = this.master.upsert(model, options);
			if(this.limit) this._models.splice(this.limit);
			return add;
		},

		remove: function(model, options)
		{
			if (model instanceof Array)
			{
				return Object.each(model, function(m) { this.remove(m); }, this);
			}
			
			options || (options = {});
			if(typeof(options.transform) == 'undefined') options.transform = true;

			if(!this._models.contains(model)) return false;

			if(this.transform && options.transform)
			{
				model	=	this.transform.call(this, model, 'remove');
			}

			// remove the model
			this._models.erase(model);

			this.fire_event('remove', options, model);

			// remove the model from the collection
			this._remove_reference(model);
		},

		add_event: function(model, options)
		{
			if(!this.filter(model)) return false;
			this.refresh({silent: true});
			this.fire_event('add', options, model, this, options);
		},

		remove_event: function(model, options)
		{
			if(!this._models.contains(model)) return false;
			this.refresh({silent: true});
			this.fire_event('remove', options, model);
		},

		forward_event: function()
		{
			if(!this.forward_all_events) return false;
			this.trigger.apply(this, arguments);
		}
	});
	FilterCollection.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = FilterCollection);
		obj	=	Composer.Base.extend.call(this, obj, base);
		return this._do_extend(obj, base);
	};

	Composer.FilterCollection	=	FilterCollection;
	Composer._export(['FilterCollection']);
})();
