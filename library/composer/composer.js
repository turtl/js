/**
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
	"use strict";
	var Composer	=	{};
	var global	=	typeof(global) != 'undefined' ? global :
						typeof(window) != 'undefined' ? window : this;

	/**
	 * You must override this function in your app.
	 */
	Composer.sync	=	function(method, model, options) { return options.success(); };

	// an option to suppress those annoying warnings when overriding initialize and extend methods
	Composer.suppress_warnings = false;

	// a closure that returns incrementing integers. these will be unique across
	// the entire app since only one counter is instantiated
	Composer.cid	=	(function() {
		var counter	=	1;
		return function(inc) { return 'c'+counter++; };
	})();

	/**
	 * The events class provides bindings to objects (Models and Collections,
	 * mainly) and allows triggering of those events. For instance, a controller
	 * can bind its "removeItemFromView" function to its model's "destroy" event.
	 * Now when that model is destroyed, the destroyer doesn't have to remember to
	 * also trigger the "removeItemFromView" function, but it will happen
	 * automatically as a result of the binding.
	 *
	 * Note that this class is meant to be extended and doesn't provide much use on
	 * its own.
	 *
	 * Certain events are used by the framework itself:
	 *   Models:
	 *     "change" - called when a model's values are changed vie its set()
	 *       function.
	 *     "change:[key]" - called when [key] is changed under model's data. For
	 *       instance, if you did :
	 *         model.bind("change:name", myfn);
	 *         model.set({name: 'leonard'});    // <-- this will trigger the event
	 *     "destroy" - called when model.destroy() is called.
	 *     "error" - triggered when an error happens saving/reading/validating the
	 *       model
	 *   Collections:
	 *     "add" - Called when a model is added to a collection via
	 *       collection.add()
	 *     "clear" - Called when all models are cleared out of a via
	 *       collection.clear()
	 *     "reset" - Called when collection is reset with new model data via
	 *       collection.reset()
	 *     "remove" - Called when collection.remove() is used to remove a model
	 *       from the collection
	 *   Controllers:
	 *     "release" - Called when controller.release() is called to remove the
	 *       controller from the view.
	 *
	 * Note that the "all" event will bubble up from model to collection...when a
	 * model is added to a collection via collection.add(), the collection binds
	 * an 'all' event to that model so that any events that happen on that model
	 * will be triggered in the collection as well. This makes it easy for a
	 * controller to monitor changes on collections of items instead of each item
	 * individually.
	 */
	var Events	=	new Class({
		_events: {},
		_named_events: {},

		/**
		 * Bind a callback to a specific event for this object. Adds the callback to
		 * an array instead of replacing other callbacks, so many callbacks can exist
		 * under the same event for this object.
		 *
		 * Example: mymodel.bind("change", this.render.bind(this));
		 *
		 * Whenever mymodel is changed in any way, the "render" function for the
		 * current object (probably a controller in this instance) will be called.
		 */
		bind: function(ev, callback, callback_name)
		{
			if(typeof(ev) == 'object' && ev.length)
			{
				// it's an array, process each binding separately
				return ev.each(function(evname) {
					this.bind(evname, callback, callback_name);
				}, this);
			}
			callback_name || (callback_name = null);

			if(callback_name)
			{
				// prepend event type to callback name
				callback_name	=	ev+':'+callback_name;

				if(!this._named_events[callback_name])
				{
					// assign the callback into the named collection so it can be retrieved
					// later by name if required.
					this._named_events[callback_name]	=	callback;
				}
				else
				{
					// don't bother with duplicate event names
					return false;
				}
			}

			this._events[ev] || (this._events[ev] = []);
			if(!this._events[ev].contains(callback))
			{
				this._events[ev].push(callback);
			}

			return this;
		},

		/**
		 * Trigger an event for this object, which in turn runs all callbacks for that
		 * event WITH all parameters passed in to this function.
		 *
		 * For instance, you could do:
		 * mymodel.bind("destroy", this.removeFromView.bind(this));
		 * mymodel.trigger("destroy", "omg", "lol", "wtf");
		 *
		 * this.removeFromView will be called with the arguments "omg", "lol", "wtf".
		 *
		 * Note that any trigger event will also trigger the "all" event. the idea
		 * being that you can subscribe to anything happening on an object.
		 */
		trigger: function(ev)
		{
			var args	=	Array.prototype.slice.call(arguments, 0);
			[ev, 'all'].each(function(type) {
				if(!this._events[type]) return;
				Array.clone(this._events[type]).each(function(callback) {
					callback.apply(this, (type == 'all') ? args : args.slice(1));
				}, this);
			}, this);

			return this;
		},

		/**
		 * Unbinds an event from the current object.
		 */
		unbind: function(ev, callback)
		{
			if(typeof(ev) == 'object' && ev.length)
			{
				// it's an array, process each item individually
				return ev.each(function(evname) {
					this.unbind(evname, callback);
				}, this);
			}

			if(typeof(ev) == 'undefined')
			{
				// no event passed, unbind everything
				this._events		=	{};
				this._named_events	=	{};
				return this;
			}

			if(typeof(this._events[ev]) == 'undefined' || this._events[ev].length == 0)
			{
				// event isn't bound
				return this;
			}

			if(typeof(callback) == 'undefined')
			{
				// no callback specified, remove all events of the given type
				Object.each(this._named_events, function(cb, ev_key) {
					// clear out all named events for this event type
					var match	=	ev_key.substr(0, ev.length + 1);
					if(ev+':' != match) return;
					delete this._named_events[ev_key];
				}, this);
				// empty out the event type
				this._events[ev].empty();
			}
			else
			{
				if(typeof(callback) == 'string')
				{
					// load the function we assigned the name to and assign it to "callback",
					// also removing the named reference after we're done.
					callback	=	ev+':'+callback;
					var fn		=	this._named_events[callback];
					delete this._named_events[callback];
					var callback	=	fn;
				}

				// remove all callback matches for the event type ev
				this._events[ev].erase(callback);
			}

			return this;
		}
	});

	/**
	 * The base class is inherited by models, collections, and controllers. It
	 * provides some nice common functionality.
	 */
	var Base	=	new Class({
		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'base',

		/**
		 * Every Composer object has an assigned unique id (regardless of the
		 * object's actual app ID). It is stored here.
		 */
		_cid: false,

		/**
		 * Pull out the object's unique Composer ID
		 */
		cid: function()
		{
			return this._cid;
		},

		/**
		 * fire_event dtermines whether or not an event should fire. given an event
		 * name, the passed-in options, and any arbitrary number of arguments,
		 * determine whether or not the given event should be triggered.
		 */
		fire_event: function()
		{
			var args	=	Array.prototype.slice.call(arguments, 0);
			var evname	=	args.shift();
			var options	=	args.shift();

			options || (options = {});

			// add event name back into the beginning of args
			args.unshift(evname);
			if(!options.silent && !options.not_silent)
			{
				// not silent, fire the event
				return this.trigger.apply(this, args);
			}
			else if(
				options.not_silent &&
				(options.not_silent == evname ||
				 (options.not_silent.contains && options.not_silent.contains(evname)))
			)
			{
				// silent, BUT the given event is allowed. fire it.
				return this.trigger.apply(this, args);
			}
			else if(
				options.silent &&
				((typeof(options.silent) == 'string' && options.silent != evname) ||
				 (options.silent.contains && !options.silent.contains(evname)))
			)
			{
				// the current event is not marked to be silent, fire it
				return this.trigger.apply(this, args);
			}
			return this;
		}
	});
	/**
	 * allows one object to extend another. since controllers, models, and
	 * collections all do this differently, it is up to each to have their own
	 * extend function and call this one for validation.
	 */
	Base.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = null);
		if(obj.initialize && !Composer.suppress_warnings)
		{
			var str	=	'You are creating a Composer object with an "initialize" method/' +
						'parameter, which is reserved. Unless you know what you\'re doing ' +
						'(and call this.parent.apply(this, arguments)), please rename ' +
						'your parameter to something other than "initialize"! Perhaps you' +
						'were thinking of init()?';
			console.log('----------WARNING----------');
			console.log(str);
			console.log('---------------------------');
		}

		if(obj.extend && !Composer.suppress_warnings)
		{
			var str	=	'You are creating a Composer object with an "extend" method/' +
						'parameter, which is reserved. Unless you know what you\'re doing ' +
						'(and call this.parent.apply(this, arguments)), please rename ' +
						'your parameter to something other than "extend"!';
			console.log('----------WARNING----------');
			console.log(str);
			console.log('---------------------------');
		}

		return obj;
	};


	/**
	 * Models are the data class. They deal with loading and manipulating data from
	 * various sources (ajax, local storage, etc). They make wrapping your actual
	 * data easy, and tie in well with collections/controllers via events to allow
	 * for easy updating and rendering.
	 *
	 * They also tie in with the Composer.sync function to provide a central place
	 * for saving/updating information with a server.
	 */
	var Model	=	new Class({
		Extends: Base,
		Implements: [Events],

		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'model',

		// for internal object testing
		// NOTE: deprecated in favor of __composer_type
		__is_model: true,

		options: {},

		// default values for the model, merged with the data passed in on CTOR
		defaults: {},

		// holds the model's data
		data: {},

		// whether or not the model has changed since the last save/update via sync
		_changed: false,

		// reference to the collections the model is in (yes, multiple). urls are
		// pulled from the collection via a "priority" parameter. the highest
		// priority collection will have its url passed to the model's sync function.
		collections: [],

		// what key to look under the data for the primary id for the object
		id_key: 'id',

		// can be used to overwrite all url generation for syncing (if you have a url
		// that doesn't fit into the "/[collection url]/[model id]" scheme.
		url: false,

		// can be used to manually set a base url for this model (in the case it
		// doesn't have a collection or the url needs to change manually).
		base_url: false,

		/**
		 * CTOR, allows passing in of data to set that data into the model.
		 */
		initialize: function(data, options)
		{
			data || (data = {});
			var _data	=	{};

			// merge in the defaults/data
			var merge_fn = function(v, k) { _data[k] = v; };
			Object.each(Object.clone(this.defaults), merge_fn);
			Object.each(data, merge_fn);

			// assign the unique app id
			this._cid	=	Composer.cid();

			// set the data into the model (but don't trigger any events)
			this.set(_data, options);

			// call the init fn
			this.init(options);
		},

		/**
		 * override me, if needed
		 */
		init: function() {},

		/**
		 * wrapper to get data out of the model. it's bad form to access model.data
		 * directly, you must always go through model.get('mykey')
		 */
		get: function(key, def)
		{
			if(typeof(def) == 'undefined') def	=	null;
			if(typeof(this.data[key]) == 'undefined')
			{
				return def;
			}
			return this.data[key];
		},

		/**
		 * like Model.get(), but if the data is a string, escape it for HTML output.
		 */
		escape: function(key)
		{
			var data	=	this.get(key);
			if(data == null || typeof(data) != 'string')
			{
				return data;
			}

			// taken directly from backbone.js's escapeHTML() function... thanks!
			return data
				.replace(/&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#x27;')
				.replace(/\//g,'&#x2F;');
		},

		/**
		 * whether or not a key exists in this.data
		 */
		has: function(key)
		{
			return this.data[key] != null;
		},

		/**
		 * set data into the model. triggers change events for individual attributes
		 * that change, and also a general change event if the model has changed. it
		 * only triggers these events if the model has indeed changed, setting an
		 * attribute to the same value it currently is will not trigger events:
		 *
		 *   model.set({name: "fisty", age: 21});
		 *
		 * this will trigger the events:
		 *   "change:name"
		 *   "change:age"
		 *   "change"
		 *
		 * if the model belongs to a collection, the events will bubble up to that
		 * collection as well, so as to notify the collection of any display changes
		 * needed.
		 */
		set: function(data, options)
		{
			options || (options = {});

			if(!options.silent && !this.perform_validation(data, options)) return false;

			var already_changing	=	this.changing;
			this.changing			=	true;
			Object.each(data, function(val, key) {
				if(!Composer.eq(val, this.data[key]))
				{
					this.data[key]	=	val;
					this._changed	=	true;
					this.fire_event('change:'+key, options, this, val, options);
				}
			}.bind(this));

			if(!already_changing && this._changed)
			{
				this.fire_event('change', options, this, options, data);
				this._changed	=	false;
			}

			this.changing	=	false;
			return this;
		},

		/**
		 * unset a key from the model's data, triggering change events if needed.
		 */
		unset: function(key, options)
		{
			if(!(key in this.data)) return this;
			options || (options = {});

			var obj		=	{};
			obj[key]	=	void(0);
			if(!options.silent && !this.perform_validation(obj, options)) return false;

			delete this.data[key];
			this._changed	=	true;
			this.fire_event('change:'+key, options, this, void 0, options);
			this.fire_event('change', options, this, options);
			this._changed	=	false;
			return this;
		},

		/**
		 * clear all data out of a model, triggering change events if needed.
		 */
		clear: function(options)
		{
			options || (options = {});

			var old		=	this.data;
			var obj		=	{};
			for(var key in old) obj[key] = void(0);
			if(!options.silent && !this.perform_validation(obj, options)) return false;

			this.data	=	{};
			if(!options.silent)
			{
				for(var key in old)
				{
					this._changed	=	true;
					this.fire_event('change'+key, options, this, void 0, options);
				}

				if(this._changed)
				{
					this.fire_event('change', options, this, options);
					this._changed	=	false;
				}
			}
			return this;
		},

		/**
		 * fetch this model from the server, via its id.
		 */
		fetch: function(options)
		{
			options || (options = {});

			var success	=	options.success;
			options.success	=	function(res)
			{
				this.set(this.parse(res), options);
				if(success) success(this, res);
			}.bind(this);
			options.error	=	wrap_error(options.error ? options.error.bind(this) : null, this, options).bind(this);
			return (this.sync || Composer.sync).call(this, 'read', this, options);
		},

		/**
		 * save this model to the server (update if exists, add if doesn't exist (uses
		 * id to detemrine if exists or note).
		 */
		save: function(options)
		{
			options || (options = {});

			if(!this.perform_validation(this.data, options)) return false;

			var success	=	options.success;
			options.success	=	function(res)
			{
				if(!this.set(this.parse(res), options)) return false;
				if(success) success(this, res);
			}.bind(this);
			options.error	=	wrap_error(options.error ? options.error.bind(this) : null, this, options).bind(this);
			return (this.sync || Composer.sync).call(this, (this.is_new() ? 'create' : 'update'), this, options);
		},

		/**
		 * delete this item from the server
		 */
		destroy: function(options)
		{
			options || (options = {});

			var success	=	options.success;
			options.success	=	function(res)
			{
				this.fire_event('destroy', options, this, this.collections, options);
				if(success) success(this, res);
			}.bind(this);

			// if the model isn't saved yet, just mark it a success
			if(this.is_new() && !options.force) return options.success();

			options.error	=	wrap_error(options.error ? options.error.bind(this) : null, this, options).bind(this);
			return (this.sync || Composer.sync).call(this, 'delete', this, options);
		},

		/**
		 * overridable function that gets called when model data comes back from the
		 * server. use it to perform any needed transformations before setting data
		 * into the model.
		 */
		parse: function(data)
		{
			return data;
		},

		/**
		 * get this model's id. if it doesn't exist, return the cid instead.
		 */
		id: function(no_cid)
		{
			if(typeof(no_cid) != 'boolean') no_cid = false;

			var id	=	this.get(this.id_key);
			if(id) return id;
			if(no_cid) return false;
			return this.cid();
		},

		/**
		 * test whether or not the model is new (checks if it has an id)
		 */
		is_new: function()
		{
			return !this.id(true);
		},

		/**
		 * create a new model with this models data and return it
		 */
		clone: function()
		{
			return new this.$constructor(this.toJSON());
		},

		/**
		 * return the raw data for this model (cloned, not referenced).
		 */
		toJSON: function()
		{
			return Object.clone(this.data);
		},

		/**
		 * generally called by Collection.toJSONAsync. just wraps Model.toJSON,
		 * async, but can be extended.
		 */
		toJSONAsync: function(finish_cb)
		{
			(function() {
				finish_cb(this.toJSON());
			}).delay(0, this);
		},

		/**
		 * validate the model using its validation function (if it exists)
		 */
		perform_validation: function(data, options)
		{
			if(typeof(this.validate) != 'function') return true;

			var error	=	this.validate(data, options);
			if(error)
			{
				if(options.error)
				{
					options.error(this, error, options);
				}
				else
				{
					this.fire_event('error', options, this, error, options);
				}
				return false;
			}
			return true;
		},

		/**
		 * loops over the collections this model belongs to and gets the highest
		 * priority one. makes for easier url extraction during syncing.
		 */
		highest_priority_collection: function()
		{
			var collections	=	shallow_array_clone(this.collections);
			collections.sort( function(a, b) { return b.priority - a.priority; } );
			return collections.length ? collections[0] : false;
		},

		/**
		 * get the endpoint url for this model.
		 */
		get_url: function()
		{
			if(this.url)
				// we are overriding the url generation.
				return this.url;

			// pull from either overridden "base_url" param, or just use the highest
			// priority collection's url for the base.
			if (this.base_url)
				var base_url = this.base_url;
			else
			{
				var collection = this.highest_priority_collection();

				// We need to check that there actually IS a collection...
				if (collection)
					var base_url	=	collection.get_url();
				else
					var base_url	=	'';
			}

			// create a /[base url]/[model id] url.
			var id	=	this.id(true);
			if(id) id = '/'+id;
			else id = '';
			var url	=	base_url ? '/' + base_url.replace(/^\/+/, '').replace(/\/+$/, '') + id : id;
			return url;

		}
	});
	Model.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = this);
		obj	=	Base.extend.call(this, obj, base);
		return this._do_extend(obj, base);
	};


	/**
	 * Collections hold lists of models and contain various helper functions for
	 * finding and selecting subsets of model data. They are basically a wrapper
	 * around an array, thats function is dealing with large amounts of model data.
	 *
	 * Collections can also sync with the server like models. They tie into model
	 * events in such a way that if a model's data changes, the collection will be
	 * notified, and anybody listinging to the collection (ie, a controller) can
	 * react to that event (re-display the view, for instance).
	 */
	var Collection	=	new Class({
		Extends: Base,
		Implements: [Events],

		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'collection',

		// the TYPE of model in this collection
		model: Model,

		// "private" array holding all the models in this collection
		_models: [],

		// function used for sorting. override to sort on a criteria besides order of
		// addition to collection
		sortfn: null,

		// the base url for this collection. if you update a model, the default url
		// sent to the sync function would be PUT /[collection url]/[model id].
		url: '/mycollection',

		// when a model belongs to many collections, it will generate its url from the
		// collection having the highest priority. if all have the same priority, then
		// the first collection from the list will have its url used for the model's
		// sync operation.
		priority: 1,

		/**
		 * allow the passing in of an array of data to instantiate a collection with a
		 * pre-set number of models. models will be created via this.model.
		 */
		initialize: function(models, params, options)
		{
			params || (params = {});
			for(var x in params)
			{
				this[x]	=	params[x];
			}

			// assign the unique app id
			this._cid	=	Composer.cid();

			// allow Collection.model to be a string so load-order dependencies can be
			// kept to a minimum. here, we convert the string to an object on collection
			// instantiation and store it back into Collection.model.
			//
			// NOTE: this happens before the initial reset =]
			this.model	=	typeof(this.model) == 'string' ? global[this.model] : this.model;

			if(models)
			{
				this.reset(models, options);
			}

			this.init();
		},

		/**
		 * override me
		 */
		init: function() {},

		/**
		 * for each model in this collection, get its raw data, then return all of the
		 * raw data in an array
		 */
		toJSON: function()
		{
			return this.models().map( function(model) { return model.toJSON(); } );
		},

		/**
		 * clone each model in this collection aynchronously, passing the final
		 * result to the given finish cb.
		 */
		toJSONAsync: function(finish_cb)
		{
			// clone models
			var models	=	this.models().slice(0);
			var results	=	[];
			var local_finish_cb	=	function(obj)
			{
				results.push(obj);
				if(results.length >= models.length)
				{
					finish_cb(results);
				}
			};

			// do it!
			if(models.length > 0)
			{
				models.each(function(model) {
					model.toJSONAsync(local_finish_cb);
				});
			}
			else
			{
				finish_cb([]);
			}
		},

		/**
		 * wrapper to get the models under this collection for direct selection (often
		 * via MooTools' array helper/selection functions)
		 */
		models: function()
		{
			return this._models;
		},

		/**
		 * add a model to this collection, and hook up the correct wire in doing so
		 * (events and setting the model's collection).
		 */
		add: function(data, options)
		{
			if (data instanceof Array)
			{
				return Object.each(data, function(model) { this.add(model, options); }, this);
			}

			options || (options = {});

			// if we are passing raw data, create a new model from data
			var model	=	data.__composer_type == 'model' ? data : new this.model(data, options);

			// reference this collection to the model
			if(!model.collections.contains(this))
			{
				model.collections.push(this);
				options.is_new	=	true;
			}

			if(this.sortfn)
			{
				// if we have a sorting function, get the index the model should exist at
				// and add it to that position
				var index	=	options.at ? parseInt(options.at) : this.sort_index(model);
				this._models.splice(index, 0, model);
			}
			else
			{
				if (typeof(options.at) == 'number')
					this._models.splice(options.at, 0, model);
				else
					this._models.push(model);
			}

			// listen to the model's events so we can propogate them
			model.bind('all', this._model_event.bind(this), 'collection:'+this.cid()+':listen:model:all');

			this.fire_event('add', options, model, this, options);

			return model;
		},

		/**
		 * remove a model(s) from the collection, unhooking all necessary wires (events, etc)
		 */
		remove: function(model, options)
		{
			if (model instanceof Array)
			{
				return Object.each(model, function(m) { this.remove(m); }, this);
			}

			options || (options = {});

			// remove this collection's reference(s) from the model
			model.collections.erase(this);

			// save to trigger change event if needed
			var num_rec	=	this._models.length;

			// remove hte model
			this._models.erase(model);

			// if the number actually change, trigger our change event
			if(this._models.length != num_rec)
			{
				this.fire_event('remove', options, model);
			}

			// remove the model from the collection
			this._remove_reference(model);
		},

		/**
		 * given a model, check if its ID is already in this collection. if so,
		 * replace is with the given model, otherwise add the model to the collection.
		 */
		upsert: function(model, options)
		{
			options || (options = {});

			var existing	=	this.find_by_id(model.id(), options);
			if(existing)
			{
				// reposition the model if necessary
				var existing_idx	=	this.index_of(existing);
				if(typeof(options.at) == 'number' && existing_idx != options.at)
				{
					this._models.splice(existing_idx, 1);
					this._models.splice(options.at, 0, existing);
					this.fire_event('sort', options);
				}

				// replace the data in the existing model with the new model's
				existing.set(model.toJSON(), Object.merge({}, {silent: true, upsert: true}, options));
				this.fire_event('upsert', options, existing, options);

				return existing;
			}

			// model is not in this collection, add it
			this.add(model, options);
			return model;
		},

		/**
		 * remove all the models from the collection
		 */
		clear: function(options)
		{
			options || (options = {});

			// save to trigger change event if needed
			var num_rec	=	this._models.length;

			/*
			 * AL - What was I thinking?
			 *  1. collection.remove can work on an array of items already
			 *  2. it's stupid to call _remove_reference instead of remove...why
			 *     not use existing remove code??
			 *  3. it's stupid to fire the remove event *on the model*
			 *
			 * I'm leaving this here in case there's *actually* a reason for
			 * what I did.
			this._models.each(function(model) {
				this._remove_reference(model);
				if(options.fire_remove_events) model.trigger('remove');
			}, this);
			*/

			this.remove(this._models, options);
			this._models	=	[];

			// if the number actually change, trigger our change event
			if(this._models.length != num_rec)
			{
				this.fire_event('clear', options);
			}
		},

		/**
		 * reset the collection with all new data. it can also be appended to the
		 * current set of models if specified in the options (via "append").
		 */
		reset: function(data, options)
		{
			options || (options = {});

			if(!options.append) this.clear(options);
			this.add(data, options);

			this.fire_event('reset', options, options);
		},

		/**
		 * reset the collection with all new data. it does this asynchronously
		 * for each item in the data array passed. this is good for setting
		 * large amounts of data into a collection whose models may do heavy
		 * processing. this way, the browser is able to process other events (ie
		 * not freeze) while adding the models to the collection.
		 *
		 * data can be appended by setting the {append: true} flag in the
		 * options.
		 *
		 * when ALL models have been added, this function calls the
		 * options.complete callback.
		 */
		reset_async: function(data, options)
		{
			options || (options = {});

			if(data == undefined) return;
			if(typeOf(data) != 'array') data = [data];

			data = shallow_array_clone(data);

			if(!options.append) this.clear();
			if(data.length > 0)
			{
				this.add(data[0], options);
				data.shift();
			}
			if(data.length == 0)
			{
				this.fire_event('reset', options, options);
				if(options.complete) options.complete()
				return;
			}
			(function() {
				this.reset_async(data, Object.merge({append: true}, options));
			}).delay(0 ,this);
		},

		/**
		 * not normally necessary to call this, unless collection.sortfn changes after
		 * instantiation of the data. sort order is normall maintained upon adding of
		 * data viw Collection.add().
		 *
		 * However, since the sorting criteria for the models can be modified manually
		 * and it's not always desired to sort automatically, you can call this method
		 * to re-sort the data in the collection via the bubble-up eventing:
		 *
		 * mycollection.bind('change:sort_order', mycollection.sort.bind(mycollection))
		 */
		sort: function(options)
		{
			if(!this.sortfn) return false;

			this._models.sort(this.sortfn);
			this.fire_event('reset', options, this, options);
		},

		/**
		 * given the current for function and a model passecd in, determine the index
		 * the model should exist at in the colleciton's model list.
		 */
		sort_index: function(model)
		{
			if(!this.sortfn) return false;

			if(this._models.length == 0) return 0;

			for(var i = 0; i < this._models.length; i++)
			{
				if(this.sortfn(this._models[i], model) > 0)
				{
					return i;
				}
			}
			var index = this._models.indexOf(model);
			if(index == this._models.length - 1) return index;
			return this._models.length;
		},

		/**
		 * overridable function called when the collection is synced with the server
		 */
		parse: function(data)
		{
			return data;
		},

		/**
		 * convenience function to loop over collection's models
		 */
		each: function(cb, bind)
		{
			if(bind)
			{
				this.models().each(cb, bind);
			}
			else
			{
				this.models().each(cb);
			}
		},

		/**
		 * convenience function to execute a function on a collection's models
		 */
		map: function(cb, bind)
		{
			if(bind)
			{
				return this.models().map(cb, bind);
			}
			else
			{
				return this.models().map(cb);
			}
		},

		/**
		 * Find the first model that satisfies the callback. An optional sort function
		 * can be passed in to order the results of the find, which uses the usual
		 * fn(a,b){return (-1|0|1);} syntax.
		 */
		find: function(callback, sortfn)
		{
			if(sortfn)
			{
				var models	=	shallow_array_clone(this.models()).sort(sortfn);
			}
			else
			{
				var models	=	this.models();
			}

			for(var i = 0; i < models.length; i++)
			{
				var rec	=	models[i];
				if(callback(rec))
				{
					return rec;
				}
			}
			return false;
		},

		/**
		 * given a callback, returns whether or not at least one of the models
		 * satisfies that callback.
		 */
		exists: function(callback)
		{
			return this.models().some(callback);
		},

		/**
		 * convenience function to find a model by id
		 */
		find_by_id: function(id, options)
		{
			options || (options = {});
			return this.find(function(model) {
				if(model.id(options.strict) == id)
				{
					return true;
				}
				if(options.allow_cid && model.cid() == id)
				{
					return true;
				}
			});
		},

		/**
		 * convenience function to find a model by cid
		 */
		find_by_cid: function(cid)
		{
			return this.find(function(model) {
				if(model.cid() == cid)
				{
					return true;
				}
			});
		},

		/**
		 * get the index of an item in the list of models. useful for sorting items.
		 */
		index_of: function(model_or_id)
		{
			var id	=	model_or_id.__composer_type == 'model' ? model_or_id.id() : model_or_id;
			for(var i = 0; i < this._models.length; i++)
			{
				if(this._models[i].id() == id)
				{
					return i;
				}
			}
			return false;
		},

		/**
		 * Filter this collection's models by the given callback. Works just
		 * like Array.filter in JS.
		 */
		filter: function(callback, bind)
		{
			if(bind)
			{
				return this._models.filter(callback, bind);
			}
			else
			{
				return this._models.filter(callback);
			}
		},

		/**
		 * query the models in the collection with a callback and return ALL that
		 * match. takes either a function OR a key-value object for matching:
		 *
		 * mycol.select(function(data) {
		 *		if(data.get('name') == 'andrew' && data.get('age') == 24)
		 *		{
		 *			return true
		 *		}
		 * });
		 *
		 * is the same as:
		 *
		 * mycol.select({
		 *		name: andrew,
		 *		age: 24
		 * });
		 *
		 * in other words, it's a very simple version of MongoDB's selection syntax,
		 * but with a lot less functionality. the only selection is direct value
		 * matching. still nice, though.
		 */
		select: function(selector)
		{
			if(typeof(selector) == 'object')
			{
				var qry	=	[];
				for(var key in selector)
				{
					var val	=	selector[key];
					if(typeof(val) == 'string') val = '"'+val+'"';
					qry.push('data.get("'+key+'") == ' + val);
				}
				var fnstr	=	'if(' + qry.join('&&') + ') { return true; }';
				selector	=	new Function('data', fnstr);
			}
			return this._models.filter(selector);
		},

		/**
		 *	Convenience functon to just select one model from a collection
		 */
		select_one: function(selector)
		{
			var result = this.select(selector);

			if (result.length)
				return result[0];

			return null;
		},

		/**
		 * return the first model in the collection. if n is specified, return the
		 * first n models.
		 */
		first: function(n)
		{
			var models	=	this.models();
			return (typeof(n) != 'undefined' && parseInt(n) != 0) ? models.slice(0, n) : models[0];
		},

		/**
		 * returns the last model in the collection. if n is specified, returns the
		 * last n models.
		 */
		last: function(n)
		{
			var models	=	this.models();
			return (typeof(n) != 'undefined' && parseInt(n) != 0) ? models.slice(models.length - n) : models[models.length - 1];
		},

		/**
		 * returns the model at the specified index. if there is no model there,
		 * return false
		 */
		at: function(n)
		{
			var model	=	this._models[n];
			return (model || false);
		},

		/**
		 * sync the collection with the server.
		 */
		fetch: function(options)
		{
			options || (options = {});

			var success	=	options.success;
			options.success	=	function(res)
			{
				this.reset(this.parse(res), options);
				if(success) success(this, res);
			}.bind(this);
			options.error	=	wrap_error(options.error ? options.error.bind(this) : null, this, options).bind(this);
			return (this.sync || Composer.sync).call(this, 'read', this, options);
		},

		/**
		 * simple wrapper to get the collection's url
		 */
		get_url: function()
		{
			return this.url;
		},

		/**
		 * remove all ties between this colleciton and a model
		 */
		_remove_reference: function(model)
		{
			model.collections.erase(this);

			// don't listen to this model anymore
			model.unbind('all', 'collection:'+this.cid()+':listen:model:all');
		},

		/**
		 * bound to every model's "all" event, propagates or reacts to certain events.
		 */
		_model_event: function(ev, model, collections, options)
		{
			if((ev == 'add' || ev == 'remove') && !collections.contains(this)) return;
			if(ev == 'destroy')
			{
				this.remove(model, options);
			}
			this.trigger.apply(this, arguments);
		}
	});
	Collection.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = this);
		obj	=	Base.extend.call(this, obj, base);
		return this._do_extend(obj, base);
	};


	/**
	 * The controller class sits between views and your models/collections.
	 * Controllers bind events to your data objects and update views when the data
	 * changes. Controllers are also responsible for rendering views.
	 */
	var Controller	=	new Class({
		Extends: Base,
		Implements: [Events],

		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'controller',

		// the DOM element to tie this controller to (a container element)
		el: false,

		// if this is set to a DOM *selector*, then this.el will be ignored and
		// instantiated as a new Element(this.tag), then injected into the element
		// referened by the this.inject selector. this allows you to inject
		// controllers into the DOM
		inject: false,

		// don't worry about it
		event_splitter:	/^(\w+)\s*(.*)$/,

		// if tihs.el is empty, create a new element of this type as the container
		tag: 'div',

		// elements to assign to this controller
		elements: {},

		// events to bind to this controllers sub-items.
		events: {},

		/**
		 * CTOR. instantiate main container element (this.el), setup events and
		 * elements, and call init()
		 */
		initialize: function(params, options)
		{
			options || (options = {});

			for(var x in params)
			{
				this[x]	=	params[x];
			}

			// assign the unique app id
			this._cid	=	Composer.cid();

			// make sure we have an el
			this._ensure_el();

			if(this.inject)
			{
				this.attach(options);
			}

			if(this.className)
			{
				this.el.addClass(this.className);
			}

			this.refresh_elements();
			this.delegate_events();

			this.init();
		},

		/**
		 * override
		 */
		init: function() {},		// lol

		/**
		 * override. not OFFICIALLY used by the framework, but it's good to use it AND
		 * return "this" when you're done with it.
		 */
		render: function() { return this; },

		/**
		 * replace this.el's html with the given test, also refresh the controllers
		 * elements.
		 */
		html: function(obj)
		{
			if(!this.el)
			{
				this._ensure_el();
			}

			if(typeOf(obj) == 'element')
			{
				this.el.set('html', '');
				obj.inject(this.el);
			}
			else
			{
				this.el.set('html', obj);
			}
			this.refresh_elements();
		},

		/**
		 * injects to controller's element into the DOM.
		 */
		attach: function(options)
		{
			options || (options = {});

			// make sure we have an el
			this._ensure_el();

			var container	=	typeof(this.inject) == 'string' ?
									document.getElement(this.inject):
									$(this.inject);
			if(!container)
			{
				return false;
			}

			if(options.clean_injection) container.set('html', '');
			this.el.inject(container);
		},

		/**
		 * make sure el is defined as an HTML element
		 */
		_ensure_el: function() {
			// allow this.el to be a string selector (selecting a single element) instad
			// of a DOM object. this allows the defining of a controller before the DOM
			// element the selector refers to exists, but this.el will be updated upon
			// instantiation of the controller (presumably when the DOM object DOES
			// exist).
			if(typeof(this.el) == 'string')
			{
				this.el = document.getElement(this.el);
			}

			// if this.el is null (bad selector or no item given), create a new DOM
			// object from this.tag
			this.el || (this.el = new Element(this.tag));
		},

		/**
		 * remove the controller from the DOM and trigger its release event
		 */
		release: function(options)
		{
			options || (options = {});
			if(this.el && this.el.destroy)
			{
				if(options.dispose)
				{
					this.el.dispose();
				}
				else
				{
					this.el.destroy();
				}
			}

			this.el	=	false;
			this.fire_event('release', options, this);

			// remove all events from controller
			if(!options.keep_events) this.unbind();
		},

		/**
		 * replace this controller's container element (this.el) with another element.
		 * also refreshes the events/elements associated with the controller
		 */
		replace: function(element)
		{
			if(this.el.parentNode)
			{
				element.replaces(this.el);
			}
			this.el	=	element;

			this.refresh_elements();
			this.delegate_events();

			return element;
		},

		/**
		 * set up the events (by delegation) to this controller (events are stored
		 * under this.events).
		 */
		delegate_events: function()
		{
			// setup the events given
			for(var ev in this.events)
			{
				var fn			=	this[this.events[ev]];
				if(typeof(fn) != 'function')
				{
					// easy, easy, whoa, you gotta calm down there, chuck
					continue;
				}
				fn	=	fn.bind(this);

				var match		=	ev.match(this.event_splitter);
				var evname		=	match[1].trim();
				var selector	=	match[2].trim();

				if(selector == '')
				{
					this.el.removeEvent(evname, fn);
					this.el.addEvent(evname, fn);
				}
				else
				{
					this.el.addEvent(evname+':relay('+selector+')', fn);
				}
			}
		},

		/**
		 * re-init the elements into the scope of the controller (uses this.elements)
		 */
		refresh_elements: function()
		{
			// setup given elements as instance variables
			for(var selector in this.elements)
			{
				var iname	=	this.elements[selector];
				this[iname]	=	this.el.getElement(selector);
			}
		}
	});
	Controller.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = this);
		obj	=	Base.extend.call(this, obj, base);

		// have to do some annoying trickery here to get the actual events/elements
		var base_events		=	base.events || {};
		var base_elements	=	base.elements || {};

		// extend the base object's events and elements
		// NOTE: the first {} in the object is there because the merge is destructive
		//       to the first argument (we don't want that).
		obj.events		=	Object.merge({}, base_events, obj.events);
		obj.elements	=	Object.merge({}, base_elements, obj.elements);

		var cls			=	this._do_extend(obj, base);
		cls.events		=	obj.events;
		cls.elements	=	obj.elements;
		return cls;
	};


	/**
	 * The Router class is a utility that helps in the routing of requests to
	 * certain parts of your application. It works either by history.pushState
	 * (which is highly recommended) or by falling back onto hashbang url
	 * support (not recommended).
	 *
	 * Note that if you do want to use pushState, you have to include History.js
	 * before instantiating the Router class:
	 *
	 *   https://github.com/balupton/History.js/
	 */
	var Router	=	new Class({
		Implements: [Options, Events],

		/**
		 * Track this object's type. Useful for debugging, mainly
		 */
		__composer_type: 'router',

		last_path:	false,
		_last_url:	null,
		routes:		{},

		options: {
			redirect_initial: true,
			suppress_initial_route: false,
			enable_cb: function() { return true; },
			on_failure: function() {},
			hash_fallback: true,
			process_querystring: false
		},

		/**
		 * initialize the routes your app uses. this is really the only public
		 * function that exists in the router, since it takes care of everything for
		 * you after instantiation.
		 */
		initialize: function(routes, options)
		{
			this.setOptions(options);

			this.routes	=	routes;
			this.register_callback(this._do_route.bind(this));

			// in case History.js isn't loaded
			if(!global.History) global.History = {enabled: false};

			if(History.enabled)
			{
				// bind our pushstate event
				History.Adapter.bind(global, 'statechange', this.state_change.bind(this));

				if(!this.options.suppress_initial_route)
				{
					// run the initial route
					History.Adapter.trigger(global, 'statechange', [global.location.pathname]);
				}
			}
			else if(this.options.hash_fallback)
			{
				// load the initial hash value
				var path	=	window.location.pathname;
				var hash	=	path == '' || path == '/' ? this.cur_path() : path;

				// if redirect_initial is true, then whatever page a user lands on, redirect
				// them to the hash version, ie
				//
				// gonorrhea.com/users/display/42
				// becomes:
				// gonorrhea.com/#!/users/display/42
				//
				// the routing system will pick this new hash up after the redirect and route
				// it normally
				if(this.options.redirect_initial && !(hash == '/' || hash == ''))
				{
					global.location	=	'/#!' + hash;
				}

				// SUCK ON THAT, HISTORY.JS!!!!
				// NOTE: this fixes a hashchange double-firing in IE, which
				// causes some terrible, horrible, no-good, very bad issues in
				// more complex controllers.
				delete Element.NativeEvents.hashchange;

				// set up the hashchange event
				global.addEvent('hashchange', this.state_change.bind(this));

				if(!this.options.suppress_initial_route)
				{
					// run the initial route
					global.fireEvent('hashchange', [hash]);
				}
			}
			else if(!this.options.suppress_initial_route)
			{
				this._do_route(new String(global.location.pathname).toString());
			}
		},

		/**
		 * add a callback that runs whenever the router "routes"
		 */
		register_callback: function(cb, name)
		{
			name || (name = null);
			return this.bind('route', cb, name);
		},

		/**
		 * remove a router callback
		 */
		unregister_callback: function(cb)
		{
			return this.unbind('route', cb);
		},

		/**
		 * get the current url path
		 */
		cur_path: function()
		{
			if(!History.enabled)
			{
				return '/' + new String(global.location.hash).toString().replace(/^[#!\/]+/, '');
			}
			else
			{
				return new String(global.location.pathname+global.location.search).toString();
			}
		},

		/**
		 * Get a value (by key) out of the current query string
		 */
		get_param: function(key)
		{
			key			=	key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regex	=	new RegExp("[\\?&]" + key + "=([^&#]*)");
			var results	=	regex.exec(location.search);
			return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
		},

		/**
		 * wrapper around the routing functionality. basically, instead of doing a
		 *   window.location = '/my/route';
		 * you can do
		 *   router.route('/my/route');
		 *
		 * Note that the latter isn't necessary, but it provides a useful abstraction.
		 */
		route: function(url, options)
		{
			url || (url = this.cur_path());
			options || (options = {});
			options.state || (options.state = {});

			var href	=	'/' + url.trim().replace(/^[a-z]+:\/\/.*?\//, '').replace(/^[#!\/]+/, '');
			var old		=	this.cur_path();
			if(old == href)
			{
				if(History.enabled)
				{
					History.Adapter.trigger(global, 'statechange', [href, true]);
				}
				else if(this.options.hash_fallback)
				{
					global.fireEvent('hashchange', [href, true]);
				}
			}
			else
			{
				if(History.enabled)
				{
					if(options.replace_state)
					{
						History.replaceState(options.state, '', href);
					}
					else
					{
						History.pushState(options.state, '', href);
					}
				}
				else if(this.options.hash_fallback)
				{
					global.location	=	'/#!'+href;
				}
				else
				{
					global.location	=	href;
				}
			}
		},

		/**
		 * given a url, route it within the given routes the router was instantiated
		 * with. if none fit, do nothing =]
		 *
		 * *internal only* =]
		 */
		_do_route: function(url, routes)
		{
			if(!this.options.enable_cb(url))
			{
				return false;
			}

			// allow passing in of routes manually, otherwise default to internal route table
			routes || (routes = this.routes);

			var routematch	=	this.find_matching_route(url, routes);
			if(!routematch) return this.options.on_failure({url: url, route: false, handler_exists: false, action_exists: false});

			var route	=	routematch.route;
			var match	=	routematch.args;

			var obj	=	route[0];
			var action	=	route[1];
			if (typeof(obj) != 'object') {
				if(!global[obj]) return this.options.on_failure({url: url, route: route, handler_exists: false, action_exists: false});
				var obj		=	global[obj];
			}
			if(!obj[action] || typeof(obj[action]) != 'function') return this.options.on_failure({url: url, route: route, handler_exists: true, action_exists: false});
			var args	=	match;
			args.shift();
			this._last_url	=	url;	// save the last successfully routed url
			obj[action].apply(obj, args);
		},

		/**
		 * Stateless function for finding the best matching route for a URL and given
		 * set of routes.
		 */
		find_matching_route: function(url, routes)
		{
			var url		=	'/' + url.replace(/^!?\//g, '');
			var route	=	false;
			var match	=	[];
			var regex	=	null;
			for(var re in routes)
			{
				regex	=	new RegExp('^' + re.replace(/\//g, '\\\/') + '$');
				match	=	regex.exec(url);
				if(match)
				{
					route	=	routes[re];
					break;
				}
			}
			if(!route) return false;

			return {route: route, args: match, regex: regex};
		},

		/**
		 * stupid function, not worth the space it takes up. oh well.
		 */
		setup_routes: function(routes)
		{
			this.routes	=	routes;
		},

		/**
		 * attached to the pushState event. runs all the callback assigned with
		 * register_callback().
		 */
		state_change: function(path, force)
		{
			if(path && path.stop != undefined) path = false;
			path || (path = this.cur_path());
			force	=	!!force;

			// check if we are routing to the same exact page. if we are, return
			// (unless we force the route)
			if(this.last_path == path && !force)
			{
				// no need to reload
				return false;
			}

			this.last_path	=	path;

			// remove querystring from the url if we have set the Router to
			// ignore it. Note that this happens after the same-page check since
			// we still want to take QS into account when comparing URLs.
			if(!this.options.process_querystring) path = path.replace(/\?.*/, '');

			// allow URL to be modifyable within the "preroute" callback, ie
			// mimick mutable strings, kind of. this affords an opportunity for
			// a preroute callback to "rewrite" the URL such that the address
			// bar stays the same, but the actual route loaded is for the
			// new, rewritten URL.
			path			=	new String(path);
			path.rewrite	=	function(str) {
				this._string_value	=	str;
			}.bind(path);
			path.rewrite(null);
			this.trigger('preroute', path);
			// grab rewritten url, if any
			if(path._string_value) path = path._string_value;

			this.trigger('route', path.toString());
		},

		/**
		 * Returns the full, last successfully routed URL that the Router found
		 * a match for.
		 */
		last_url: function()
		{
			return this._last_url;
		},

		/**
		 * Bind the pushState to any links that don't have the options.exclude_class
		 * className in them.
		 */
		bind_links: function(options)
		{
			options || (options = {});

			// build a selector that work for YOU.
			if(options.selector)
			{
				// specific selector......specified. use it.
				var selector	=	options.selector;
			}
			else
			{
				// create a CUSTOM selector tailored to your INDIVIDUAL needs.
				if(options.exclude_class)
				{
					// exclusion classname exists, make sure to not listen to <a>
					// tags with that class
					var selector	=	'a:not([class~="'+options.exclude_class+'"])';
				}
				else
				{
					// bind all <a>'s
					var selector	=	'a';
				}
			}

			// convenience function, recursively searches up the DOM tree until
			// it finds an element with tagname ==  tag.
			var next_tag_up = function(tag, element)
			{
				return element.get('tag') == tag ? element : next_tag_up(tag, element.getParent());
			};

			// bind our heroic pushState to the <a> tags we specified. this
			// hopefully be that LAST event called for any <a> tag because it's
			// so high up the DOM chain. this means if a composer event wants to
			// override this action, it can just call event.stop().
			$(document.body).addEvent('click:relay('+selector+')', function(e) {
				if(e.control || e.shift || e.alt) return;

				var a		=	next_tag_up('a', e.target);
				var button	=	typeof(e.button) != 'undefined' ? e.button : e.event.button;

				// don't trap links that are meant to open new windows, and don't
				// trap middle mouse clicks (or anything more than left click)
				if(a.target == '_blank' || button > 0) return;

				var curhost		=	new String(global.location).replace(/[a-z]+:\/\/(.*?)\/.*/i, '$1');
				var linkhost	=	a.href.match(/^[a-z]+:\/\//) ? a.href.replace(/[a-z]+:\/\/(.*?)\/.*/i, '$1') : curhost;
				if(
					curhost != linkhost ||
					(typeof(options.do_state_change) == 'function' && !options.do_state_change(a))
				)
				{
					return;
				}

				if(e) e.stop();

				if(History.enabled)
				{
					var href	=	a.href.replace(/^[a-z]+:\/\/.*?\//, '').replace(/^[#!\/]+/, '');
					if(options.filter_trailing_slash) href = href.replace(/\/$/, '');
					href	=	'/'+href;

					History.pushState(options.global_state, '', href);
					return false;
				}
				else
				{
					var href	=	a.href.replace(/^[a-z]+:\/\/.*?\//, '');
					if(options.filter_trailing_slash) href = href.replace(/\/$/, '');
					href	=	'/#!/'+href;

					global.location	=	href;
				}
			});
		}
	});

	/*
	---
	description: Added the onhashchange event

	license: MIT-style

	authors:
	- sdf1981cgn
	- Greggory Hernandez

	requires:
	- core/1.2.4: '*'

	provides: [Element.Events.hashchange]

	...
	*/
	Element.Events.hashchange = {
		onAdd: function() {
			var hash = self.location.hash;

			var hashchange = function(){
				if (hash == self.location.hash) return;
				else hash = self.location.hash;

				var value = (hash.indexOf('#') == 0 ? hash.substr(1) : hash);
				global.fireEvent('hashchange', value);
				document.fireEvent('hashchange', value);
			};

			if ("onhashchange" in global && !(Browser.ie && Browser.version < 8)){
				global.onhashchange = hashchange;
			} else {
				hashchange.periodical(50);
			}
		}
	};

	// wraps error callbacks for syncing functions
	var wrap_error	=	function(callback, model, options)
	{
		return function(resp)
		{
			if(callback)
			{
				callback(model, resp, options);
			}
			else
			{
				this.fire_event('error', options, model, resp, options);
			}
		};
	};

	// do a shallow clone of an array
	var shallow_array_clone	=	function(from)
	{
		return from.slice(0);
	};

	// Composer equality function. It replaces _.eq, which wasn't able to tell
	// non-equality between {key1: 3} and {key1: 3, key2: 5} (said they were
	// equal). This was causing some events to not fire in Composer, prompting
	// me to write our own equality function. It might have just been the release
	// we were using, but I'm too lazy to go in and re-update _.eq to not have
	// other _ dependencies. Writing our own is a bit easier.
	//
	// This is a work in progress.
	var eq	=	function(a, b)
	{
		if ( a === b ) return true;
		if(a instanceof Function) return false;
		if(typeOf(a) != typeOf(b)) return false;
		if(a instanceof Array)
		{
			if(a.length != b.length) return false;
			// TODO: check if array indexes are always sequential
			for(var i = 0, n = a.length; i < n; i++)
			{
				if(!b.hasOwnProperty(i)) return false;
				if(!eq(a[i], b[i])) return false;
			}
		}
		else if(a instanceof Object)
		{
			if ( a.constructor !== b.constructor ) return false;
			for( var p in b )
			{
				if( b.hasOwnProperty(p) && ! a.hasOwnProperty(p) ) return false;
			}
			for( var p in a )
			{
				if ( ! a.hasOwnProperty( p ) ) continue;
				if ( ! b.hasOwnProperty( p ) ) return false;
				if ( a[ p ] === b[ p ] ) continue;
				if ( typeof( a[ p ] ) !== "object" ) return false;
				if ( ! eq( a[ p ],  b[ p ] ) ) return false;
			}
		}
		else if(a != b)
		{
			return false;
		}
		return true;
	};
	Composer.eq	=	eq;


	/**
	 * Provides wrapping of extending via function (as opposed to
	 * Extend: Composer.Model) for Composer objects (and objects that extend
	 * them).
	 */
	Composer._export	=	function(exports)
	{
		exports.each(function(name) {
			// TODO: eliminate eval here
			name		=	name.replace(/[^a-z]/gi, '');	// make eval not so bad for now
			var _do_try	=	function(classname) { return 'try{'+classname+'}catch(e){false}'; };
			var cls		=	eval(_do_try(name)) || eval(_do_try('Composer.'+name));
			if(!cls) return false;

			// This function creates a new class with the given attributes that
			// extends the given base. If no base is given, it uses the object's
			// default constructor.
			//
			// The resulting class is also assigned extend/_do_extend functions
			// (which are added to the class, NOT insteances of the class).
			var do_extend	=	function(obj, base)
			{
				var classobj		=	Object.merge({Extends: base}, obj);
				var newclass		=	new Class(classobj);
				newclass.extend		=	base.extend;
				newclass._do_extend	=	do_extend;
				return newclass;
			};
			cls._do_extend	=	do_extend;
			Composer[name]	=	cls;
		}, this);
	}.bind(this);

	Composer._export(['Model', 'Collection', 'Controller']);

	Composer.Base	=	Base;
	Composer.Events	=	Events;
	Composer.Router	=	Router;

	global.Composer	=	Composer;
})();
