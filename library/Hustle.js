(function(window, undefined) {
	"use strict";
	var version		=	'0.1.0';
	var db_version	=	2;

    var indexedDB	=	window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
    var IDBKeyRange	=	window.IDBKeyRange || window.webkitIDBKeyRange

	if(!indexedDB) throw 'IndexedDB required';

	// define error(s) used by tcrypt
	var extend_error	=	function(extend, errname)
	{
		var err						=	function() {
			var tmp	=	extend.apply(this, arguments);
			tmp.name = this.name = errname;

			this.stack		=	tmp.stack
			this.message	=	tmp.message

			return this;
		};
		err.prototype	=	Object.create(extend.prototype, { constructor: { value: err } });
		return err;
	}
	var HustleError			=	extend_error(window.Error, 'HustleError');
	var HustleDBClosed		=	extend_error(HustleError, 'HustleDBClosed');
	var HustleDBOpened		=	extend_error(HustleError, 'HustleDBOpened');
	var HustleBadTube		=	extend_error(HustleError, 'HustleBadTube');
	var HustleBadID			=	extend_error(HustleError, 'HustleBadID');
	var HustleNotice		=	extend_error(window.Error, 'HustleNotice');
	var HustleNotFound		=	extend_error(HustleNotice, 'HustleNotFound');

	var Hustle	=	function(qoptions)
	{
		qoptions || (qoptions = {});
		if(!qoptions.tubes) qoptions.tubes = [];

		// define some system db vars
		var db_name	=	qoptions.db_name ? qoptions.db_name : 'hustle';
		var tbl		=	{
			ids: '_ids',
			reserved: '_reserved',
			buried: '_buried'
		};

		// always add a default tube
		if(qoptions.tubes.indexOf('default') < 0) qoptions.tubes.push('default');

		var db	=	null;

		// ---------------------------------------------------------------------
		// database-related functions
		// ---------------------------------------------------------------------

		var check_db	=	function()
		{
			if(!db) throw new HustleDBClosed('Closed database being operated on. Did you call Hustle.open()?');
			return true;
		};

		/**
		 * helper function, creates a table if it doesn't exist, otherwise grabs
		 * it. returns the store.
		 */
		var create_table_if_not_exists	=	function(e, tablename, options)
		{
			options || (options = {});
			var store	=	null;
			var udb		=	e.target.result;
			var keypath	=	options.keypath ? options.keypath : 'id';
			var autoinc	=	options.autoincrement ? options.autoincrement : false;
			// grab an existing object store or create a new one
			if(udb.objectStoreNames.contains(tablename))
			{
				store	=	e.currentTarget.transaction.objectStore(tablename);
			}
			else
			{
				store	=	udb.createObjectStore(tablename, {keyPath: keypath, autoIncrement: autoinc});
			}
			return store;
		};

		/**
		 * create a tube and index it
		 */
		var create_tube	=	function(e, tubename)
		{
			var store	=	create_table_if_not_exists(e, tubename);

			// create our primary index
			try
			{
				store.createIndex('priority', ['priority', 'id'], {unique: false});
			}
			// index probably exists already
			catch(e) {}

			return store;
		};

		/**
		 * create our buried table
		 */
		var create_buried_table	=	function(e)
		{
			var store	=	create_table_if_not_exists(e, tbl.buried, {keypath: '_id', autoincrement: true});

			// create our primary index
			try
			{
				store.createIndex('id', 'id', {unique: false});
			}
			// index probably exists already
			catch(e) {}

			return store;
		};

		/**
		 * open the queue database and make sure the schema is ship-shape
		 */
		var open	=	function(options)
		{
			options || (options = {});

			if(db) throw new HustleDBOpened('db is already open');

			var req		=	indexedDB.open(db_name, db_version);
			req.onerror	=	function(e)
			{
				if(options.error) options.error(e);
			}

			req.onsuccess	=	function(e)
			{
				db	=	req.result;
				if(options.success) options.success(e);
			};

			req.onupgradeneeded	=	function(e)
			{
				var store		=	null;
				var tubes		=	qoptions.tubes;

				create_table_if_not_exists(e, tbl.ids, {autoincrement: true});
				create_table_if_not_exists(e, tbl.reserved);
				create_buried_table(e);
				for(var i = 0; i < tubes.length; i++)
				{
					if([tbl.reserved, tbl.buried].indexOf(tubes[i]) >= 0) continue;
					create_tube(e, tubes[i]);
				}
			};
		};

		/**
		 * close the queue database
		 */
		var close	=	function()
		{
			if(!db) return false;
			db.close();
			db	=	null;
			return true;
		};

		/**
		 * convenience function to obliterate the queue
		 */
		var wipe	=	function()
		{
			close();
			indexedDB.deleteDatabase(db_name);
			return true;
		};

		/**
		 * generate a unique, auto-incrementing ID
		 */
		var new_id	=	function(options)
		{
			check_db();
			options || (options = {});

			var id	=	null;

			var trx		=	db.transaction([tbl.ids], 'readwrite');
			trx.oncomplete	=	function(e)
			{
				if(!id)
				{
					if(options.error) options.error('bad id');
					return;
				}
				if(options.success) options.success(id, e);
			};

			trx.onerror	=	function(e)
			{
				if(options.error) options.error(e);
			}
			// add a dummy object, grab its id, then delete it.
			// TODO: is this the best way?
			var store	=	trx.objectStore(tbl.ids);
			var req		=	store.add({counter: true});
			req.onsuccess	=	function(e)
			{
				id	=	e.target.result;
				store.delete(id);
			};
		};

		/**
		 * generic function to move a queue item from one table to another.
		 */
		var move_item	=	function(id, from, to, options)
		{
			options || (options = {});

			var trx			=	db.transaction([from, to], 'readwrite');
			trx.oncomplete	=	function(e) { if(options.success) options.success(e); };
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			var do_move_item	=	function(item, success)
			{
				if(options.transform)
				{
					item	=	options.transform(item);
				}
				var store		=	trx.objectStore(to);
				var req			=	store.add(item);
				req.onsuccess	=	success;
			};

			var store		=	trx.objectStore(from);
			var req;
			if(from == tbl.buried)
			{
				// if we're looking up the buried table, we use the "id" index
				var index	=	store.index('id');
				req			=	index.get(id);
			}
			else
			{
				req	=	store.get(id);
			}
			req.onsuccess	=	function(e)
			{
				var item	=	req.result;
				var item_id	=	item.id;
				// account for the buried table's IDs
				if(from == tbl.buried) item_id = item._id;

				if(!item)
				{
					if(options.error) options.error(new HustleNotFound('item '+ id +' wasn\'t found'));
					return;
				}
				do_move_item(item, function(e) {
					store.delete(item_id);
				});
			};
		};

		/**
		 * wrapper to create a new queue item for storage in the DB
		 *
		 * valid option values are 'priority'
		 * TODO: 'ttr', 'delay'
		 */
		var create_queue_item	=	function(data, options)
		{
			var item	=	{data: data};
			// TODO: ttr, delay
			var fields	=	[
				{name: 'priority', type: 'int', default: 1024}
			];

			// loop over our fields, making sure they are the correct type and
			// format.
			for(var i = 0; i < fields.length; i++)
			{
				var field	=	fields[i];
				if(options[field.name])
				{
					item[field.name] = options[field.name];
					switch(field.type)
					{
					case 'int':
						item[field.name]	=	parseInt(item[field.name]);
						break;
					case 'float':
						item[field.name]	=	parseFloat(item[field.name]);
						break;
					}
				}

				if(field.default && typeof item[field.name] == 'undefined')
				{
					item[field.name]	=	field.default;
				}
			}
			// some defaults
			item.age		=	0;
			item.reserves	=	0;
			item.releases	=	0;
			item.timeouts	=	0;
			item.buries		=	0;
			item.kicks		=	0;
			item.created	=	new Date().getTime();
			return item;
		};

		// ---------------------------------------------------------------------
		// queue interface functions
		// ---------------------------------------------------------------------

		/**
		 * grab an item by id from the queue
		 */
		var peek	=	function(id, options)
		{
			check_db();
			options || (options = {});
			if(!id)
			{
				if(options.error) options.error(new HustleBadId('bad id given'));
				return false;
			}

			var item	=	null;

			var tables		=	[tbl.reserved, tbl.buried].concat(qoptions.tubes);
			var trx			=	db.transaction(tables, 'readonly');
			trx.oncomplete	=	function(e)
			{
				if(!item && options.not_found_error)
				{
					if(options.error) options.error(new HustleNotFound('item '+ id +' not found'));
					return;
				}
				if(options.success) options.success(item, e);
			};
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			// scan all tables for this id
			for(var i = 0; i < tables.length; i++)
			{
				(function(table) {
					var req;
					if(table == tbl.buried)
					{
						var index	=	trx.objectStore(table).index('id');
						req			=	index.get(id);
					}
					else
					{
						req	=	trx.objectStore(table).get(id);
					}
					req.onsuccess	=	function(e)
					{
						var res	=	e && e.target && e.target.result;
						if(item || !res) return false;

						item		=	res;
						if(table == tbl.reserved)
						{
							item.state	=	'reserved';
						}
						else if(table == tbl.buried)
						{
							item.state	=	'buried';
						}
						else
						{
							item.state	=	'ready';
							if(!item.tube) item.tube = table;
						}
					}
				})(tables[i]);
			}
		};

		/**
		 * put a new item in the queue in the specified tube (or the "default"
		 * tube)
		 */
		var put	=	function(data, options)
		{
			check_db();
			options || (options = {});
			if(!data) return false;

			var tube	=	options.tube ? options.tube : 'default';
			if(qoptions.tubes.indexOf(tube) < 0) throw new HustleBadTube('tube '+ tube +' doesn\'t exist');

			var item	=	create_queue_item(data, options);
			// grab a unique ID for this item
			new_id({
				success: function(id) {
					item.id		=	id;

					var trx			=	db.transaction([tube], 'readwrite');
					trx.oncomplete	=	function(e) { if(options.success) options.success(item, e); };
					trx.onerror		=	function(e) { if(options.error) options.error(e); }

					var store		=	trx.objectStore(tube);
					var req			=	store.add(item);
					req.onsuccess	=	function(e)
					{
						item.id		=	e.target.result;
					};
				},
				error: function(e) {
					if(options.error) options.error(new HustleBadID('error generating id'));
				}
			});

		};

		/**
		 * grab one item off of the given tube (or "default" tube) and move it
		 * onto the reserved table.
		 */
		var reserve	=	function(options)
		{
			check_db();
			options || (options = {});

			var tube	=	options.tube ? options.tube : 'default';
			if(qoptions.tubes.indexOf(tube) < 0) throw new HustleBadTube('tube '+ tube +' doesn\'t exist');

			var item	=	null;

			var trx			=	db.transaction([tbl.reserved, tube], 'readwrite');
			trx.oncomplete	=	function(e) { if(options.success) options.success(item, e); };
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			// called once we have an item, puts the item in the reserved table
			var put_in_reserved	=	function(citem, success)
			{
				item		=	citem;
				item.reserves++;
				item.tube	=	tube;
				var store	=	trx.objectStore(tbl.reserved);
				var req		=	store.add(item);
				req.onsuccess	=	success;
			};

			// grab one item from the tube, and put it in reserved
			var store	=	trx.objectStore(tube);
			var index	=	store.index('priority');
			index.openCursor().onsuccess	=	function(e)
			{
				var cursor	=	e.target.result;
				if(cursor)
				{
					put_in_reserved(cursor.value, function(e) {
						// remove the item from the tube once we know it's reserved
						store.delete(cursor.value.id);
					});
				}
			};
		};

		/**
		 * delete a queue item by id. checks all tubes and the reserved/buried
		 * tables as well.
		 */
		var del	=	function(id, options)
		{
			check_db();
			options || (options = {});

			peek(id, {
				success: function(item) {
					if(!item)
					{
						if(options.success) options.success(null);
						return;
					}

					var table	=	item.tube;
					var item_id	=	item.id;
					if(item.state == 'reserved')
					{
						table	=	tbl.reserved;
					}
					else if(item.state == 'buried')
					{
						table	=	tbl.buried;
						// be mindful of the buried table's own IDs
						item_id	=	item._id;
					}

					var trx			=	db.transaction(table, 'readwrite');
					trx.oncomplete	=	function(e) { if(options.success) options.success(item, e); };
					trx.onerror		=	function(e) { if(options.error) options.error(e); }

					trx.objectStore(table).delete(item_id);
				},
				error: options.error
			});
		};

		/**
		 * release a reserved item back into the queue (from the tube it came
		 * from).
		 */
		var release	=	function(id, options)
		{
			check_db();
			options || (options = {});

			peek(id, {
				not_found_error: true,
				success: function(item) {
					if(item.state != 'reserved')
					{
						if(options.error) options.error(new HustleNotFound('item '+ id +' isn\'t reserved'));
						return;
					}

					move_item(id, tbl.reserved, item.tube, {
						transform: function(item) {
							item.releases++;
							if(options.priority)
							{
								var pri	=	parseInt(options.priority);
								if(pri) item.priority = pri;
							}
							delete item.tube;
							return item;
						},
						success: options.success,
						error: options.error
					});
				},
				error: options.error
			});
		};

		/**
		 * move an item to the buried table. this is a great way to track items
		 * that fail a lot and can't be ignored, allowing you to look over them
		 * later on and see what jobs are failing.
		 */
		var bury	=	function(id, options)
		{
			check_db();
			options || (options = {});

			peek(id, {
				not_found_error: true,
				success: function(item) {
					if(item.state == 'buried')
					{
						if(options.success) options.success();
						return;
					}
					var table	=	item.tube;
					if(item.state == 'reserved')
					{
						table	=	tbl.reserved;
					}

					move_item(id, table, tbl.buried, {
						transform: function(titem) {
							titem.buries++;
							titem.tube	=	item.tube;
							if(options.priority)
							{
								var pri	=	parseInt(options.priority);
								if(pri) titem.priority = pri;
							}
							return titem;
						},
						success: options.success,
						error: options.error
					});
				},
				error: options.error
			});
		};

		/**
		 * kick N many buried items back into their tubes
		 */
		var kick	=	function(num, options)
		{
			check_db();
			options || (options = {});

			var records	=	0;

			// open all tables since we may get a range of tubes when kicking
			var tables		=	[tbl.buried].concat(qoptions.tubes);
			var trx			=	db.transaction(tables, 'readwrite');
			trx.oncomplete	=	function(e) { if(options.success) options.success(records, e); };
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			var put_in_tube	=	function(item, success)
			{
				item.kicks++;
				var tube	=	item.tube;
				// remove the buried table's ID
				delete item._id;
				delete item.tube;
				var store		=	trx.objectStore(tube)
				var req			=	store.add(item);
				req.onsuccess	=	success;
			};

			// grab one item from the tube, and put it in reserved
			var store	=	trx.objectStore(tbl.buried);
			store.openCursor().onsuccess	=	function(e)
			{
				var cursor	=	e.target.result;
				if(cursor)
				{
					put_in_tube(cursor.value, function(e) {
						// remove the item from the tube once we know it's reserved
						store.delete(cursor.key);
					});
					records++;
					if(records < num) cursor.continue();
				}
			};
		};

		/**
		 * kick a job from the buried table by its id
		 */
		var kick_job	=	function(id, options)
		{
			check_db();
			options || (options = {});

			peek(id, {
				not_found_error: true,
				success: function(item) {
					if(item.state != 'buried')
					{
						if(options.error) options.error(new HustleNotFound('item '+ id +' isn\'t buried'));
						return;
					}

					move_item(id, tbl.buried, item.tube, {
						transform: function(item) {
							item.kicks++;
							delete item._id;
							delete item.tube;
							return item;
						},
						success: options.success,
						error: options.error
					});
				},
				error: options.error
			});
		};

		/* TODO: implement this once ttr is implemented
		var touch	=	function(id, options)
		{
			check_db();
			options || (options = {});
		};
		*/

		var count_ready	=	function(tube, options)
		{
			check_db();
			options || (options = {});

			if(qoptions.tubes.indexOf(tube) < 0) throw new HustleBadTube('tube '+ tube +' doesn\'t exist');

			var count		=	null;

			var trx			=	db.transaction(tube, 'readonly');
			trx.oncomplete	=	function(e) { if(options.success) options.success(count, e); };
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			var store		=	trx.objectStore(tube);
			var req			=	store.count();
			req.onsuccess	=	function(e)
			{
				count	=	req.result;
			};
		};

		// ---------------------------------------------------------------------
		// extras
		// ---------------------------------------------------------------------

		/**
		 * consume a tube by polling it. calls the passed function for each item
		 * that it reserves. returns a function that stops the consumer when
		 * called.
		 *
		 * returns a function that when called stops the consumer
		 */
		var consume	=	function(tube, fn, options)
		{
			options || (options = {});
			var quit	=	false;
			var delay	=	options.delay ? options.delay : 100;

			// poll the tube
			var poll	=	function()
			{
				if(quit && !db) return;

				// grab an item from the tube
				reserve({
					tube: tube,
					success: function(item) {
						if(!item) return;
						fn(item);
					}
				});

				// poll again
				setTimeout(poll, delay);
			};
			setTimeout(poll, delay);

			return function() { if(quit) { return false } return quit = true; };
		};

		// exports
		this.open			=	open;
		this.close			=	close;
		this.is_open		=	function() { return !!db; };
		this.peek			=	peek;
		this.put			=	put;
		this.reserve		=	reserve;
		this['delete']		=	del;
		this.release		=	release;
		this.bury			=	bury;
		this.kick			=	kick;
		this.kick_job		=	kick_job;
		this.count_ready	=	count_ready;
		//this.touch		=	touch;	// TODO
		this.consume		=	consume;
		this.wipe			=	wipe;

		return this;
	};
	window.Hustle	=	Hustle;
})(window);
