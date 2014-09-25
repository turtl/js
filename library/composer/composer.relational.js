/**
 * NOTE: RelationalModel is considered alpha/experimental and although this most
 * likely won't happen, it may be subject to substantial API changes. Use/depend
 * on at your own risk!
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
	"use strict";
	var global = typeof(global) != 'undefined' ? global :
						typeof(window) != 'undefined' ? window : this;
	var Composer = global.Composer;

	// set up relationship types
	// TODO: deprecate these...
	Composer.HasOne = 1;
	Composer.HasMany = 2;

	// very simple wrapper around Model to support relationships between data.
	// TODO: support reverse relationships
	var RelationalModel = new Class({
		Extends: Composer.Model,

		relations: false,
		relation_data: {},

		// if true, toJSON will just call Model.toJSON instead of serializing
		// the relational data
		skip_relational_serialize: false,

		initialize: function(data, options)
		{
			options || (options = {});

			if(this.relations)
			{
				// cache the model/collection strings to real objects
				Object.each(this.relations, function(relation, k) {
					// for each relation, make sure strings are referenced back to the catual
					// objects they refer to.
					if(relation.model && typeof(relation.model) == 'string')
					{
						relation.model = this._get_key(global, relation.model);
					}
					else if(relation.collection && typeof(relation.collection) == 'string')
					{
						relation.collection = this._get_key(global, relation.collection);
					}
					else if(relation.filter_collection && typeof(relation.filter_collection) == 'string')
					{
						// set up the filter collection. if one doesn't exist, create a function
						// that looks withing the keys of the relational data to pull a master
						// collection out of.
						relation.filter_collection = this._get_key(global, relation.filter_collection);
						var master = relation.master;
						if(typeof(master) == 'string')
						{
							var master_key = relation.master;
							relation.master = function()
							{
								var master = this._get_key(this.relation_data, master_key);
								if(!master)
								{
									master = new this.relations[master_key].collection();
									this._set_key(this.relation_data, master_key);
								}
								return master;
							}.bind(this);
							relation.master();
						}
					}

					// unless otherwise specified, load relational objects up-front
					if(!relation.delayed_init)
					{
						var obj = this._create_obj(relation, k, {set_parent: true});
					}
				}, this);
			}

			// call Model.initialize()
			return this.parent(data, options);
		},

		toJSON: function()
		{
			// modify the underlying data to match the data of the relational models
			if(!this.skip_relational_serialize)
			{
				Object.each(this.relations, function(relation, k) {
					var obj = this._get_key(this.relation_data, k);
					if(obj) this._set_key(this.data, k, obj.toJSON());
				}, this);
			}

			// call Model.toJSON()
			return this.parent();
		},

		toJSONAsync: function(finish_cb)
		{
			var result = {};
			var num_relations = 0;
			var num_results = 0;
			Object.each(this.relations, function(relation, k) {
				num_relations++;
				var obj = this._get_key(this.relation_data, k);
				if(obj)
				{
					obj.toJSONAsync(function(data) {
						// like RelationalModel.toJSON, works by populating this.data
						// then calling toJSON
						this._set_key(this.data, k, data);
						num_results++;
						if(num_results >= num_relations)
						{
							(function() {
								// disable relational serializing (otherwise
								// we'll just end up doing a sync serialization)
								this.skip_relational_serialize = true;
								var data = this.toJSON();
								this.skip_relational_serialize = false;
								finish_cb(data);
							}).delay(0, this);
						}
					}.bind(this));
				}
				else
				{
					// didn't get a real object, so don't count it
					num_relations--;
				}
			}, this);
		},

		set: function(data, options)
		{
			options || (options = {});

			if(this.relations && !options.skip_relational)
			{
				Object.each(this.relations, function(relation, k) {
					var d = this._get_key(data, k);
					if(typeof(d) == 'undefined') return;

					var options_copy = Object.clone(options);
					options_copy.data = d;
					var obj = this._create_obj(relation, k, options_copy);
				}, this);
			}

			// call Model.set()
			return this.parent(data, options);
		},

		get: function(key, def)
		{
			var obj = this._get_key(this.relation_data, key);
			if(typeof(obj) != 'undefined') return obj;

			// call Model.get()
			return this.parent(key, def);
		},

		bind_relational: function(key)
		{
			var relation = this.relations[key];
			if(!relation) return false;

			var obj = this._create_obj(relation, key);

			// bind the event to the object
			var args = Array.prototype.slice.call(arguments, 0);
			obj.bind.apply(obj, args.slice(1));
		},

		unbind_relational: function(key)
		{
			var relation = this.relations[key];
			if(!relation) return false;

			// grab the object and unbind the event
			var obj = this._get_key(this.relation_data, key);
			if(!obj) return false;
			var args = Array.prototype.slice.call(arguments, 0);
			obj.unbind.apply(obj, args.slice(1));
		},

		set_parent: function(parent, child)
		{
			child.get_parent = function() { return parent; };
		},

		get_parent: function(child)
		{
			return child.get_parent();
		},

		_create_obj: function(relation, obj_key, options)
		{
			options || (options = {});
			var _data = options.data;
			delete options.data;

			// check if the object being passed in is already a Composer object
			if(_data && _data.__composer_type && _data.__composer_type != '')
			{
				// yes, we passed in a composer object...set it directly into
				// the relational data as a replacement for the old one.
				// TODO: maybe provide an option to specify replace/update
				var obj = _data;
			}
			else
			{
				// data passed is just a plain old object (or, at least, not a
				// Composer object). set the data into the relation object.
				var obj = this._get_key(this.relation_data, obj_key);
				switch(relation.type)
				{
				case Composer.HasOne:
					obj || (obj = new relation.model());
					if(options.set_parent) this.set_parent(this, obj);	// NOTE: happens BEFORE setting data
					if(_data) obj.set(_data);
					break;
				case Composer.HasMany:
					if(!obj)
					{
						if(relation.collection)
						{
							obj = new relation.collection();
						}
						else if(relation.filter_collection)
						{
							obj = new relation.filter_collection(relation.master(), Object.merge({skip_initial_sync: true}, relation.options));
						}
					}
					if(options.set_parent) this.set_parent(this, obj);	// NOTE: happens BEFORE setting data
					if(_data) obj.reset(_data, options);
					break;
				}
			}

			// set the object back into our relational data objects
			this._set_key(this.relation_data, obj_key, obj);
			this.trigger('relation', obj, obj_key);
			this.trigger('relation:'+obj_key, obj);
			return obj;
		},


		/**
		 * wrapper around data[key] = value (equivelant:
		 *   _set_key(data, key, value)
		 * the VALUE ADD is that you can do things like:
		 *   _set_key(data, 'key.subkey', value)
		 * which yields:
		 *   {key: {subkey: value}}
		 */
		_set_key: function(object, key, value)
		{
			object || (object = {});
			var paths = key.split('.');
			var obj = object;
			for(var i = 0, n = paths.length; i < n; i++)
			{
				var path = paths[i];
				if(i == n - 1)
				{
					obj[path] = value;
					break;
				}

				if(!obj[path])
				{
					obj[path] = {};
				}
				else if(typeOf(obj[path]) != 'object')
				{
					obj[path] = {};
				}
				obj = obj[path];
			}
			return object;
		},

		_get_key: function(object, key)
		{
			object || (object = {});
			var paths = key.split('.');
			var obj = object;
			for(var i = 0, n = paths.length; i < n; i++)
			{
				var path = paths[i];
				var type = typeof(obj[path]);
				if(type == 'undefined')
				{
					return obj[path];
				}
				obj = obj[path];
			}
			return obj;
		}
	});
	RelationalModel.extend = function(obj, base)
	{
		obj || (obj = {});
		base || (base = this);

		// hijack _do_extend to not wrap our object in a class since we need to do
		// more mods before this happens
		var do_extend = this._do_extend;
		this._do_extend = function(obj, base) { return obj; };

		// call Model.extend (which would normally call Base._do_extend)
		obj = Composer.Base.extend.call(this, obj, base);

		// extend the base object's relations
		obj.relations = Object.merge(this.relations || {}, obj.relations);

		// restore Base._do_extend and call it, finalizing our class
		this._do_extend = do_extend;
		return this._do_extend(obj, base);
	};

	Composer.RelationalModel = RelationalModel;
	Composer._export(['RelationalModel']);
})();
