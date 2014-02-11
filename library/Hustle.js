(function(window, undefined) {
	"use strict";
	var version		=	'0.1.1';
	var db_version	=	3;

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

		var housekeeping_delay	=	qoptions.housekeeping_delay ? qoptions.housekeeping_delay : 1000;
		var msg_lifetime		=	qoptions.message_lifetime ? qoptions.message_lifetime : 10000;

		// define some system db vars
		var db_name	=	qoptions.db_name ? qoptions.db_name : 'hustle';
		var tbl		=	{
			ids: '_ids',
			reserved: '_reserved',
			buried: '_buried',
			pubsub: '_pubsub'
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
		 * this function does database cleanup. only runs while db is open.
		 */
		var start_housekeeping	=	function()
		{
			/**
			 * remove old messages
			 */
			var cleanup_messages	=	function(options)
			{
				if(!db) return false;

				options || (options = {});

				var trx			=	db.transaction(tbl.pubsub, 'readwrite');
				trx.oncomplete	=	function(e) { if(options.success) options.success(e); };
				trx.onerror		=	function(e) { if(options.error) options.error(e); }

				var store	=	trx.objectStore(tbl.pubsub);
				store.openCursor().onsuccess	=	function(e)
				{
					var cursor	=	e.target.result;
					if(cursor)
					{
						if(cursor.value.created < (new Date().getTime() - msg_lifetime))
						{
							store.delete(cursor.value.id);
						}
						cursor.continue();
					}
				}
			};

			var do_cleanup	=	function()
			{
				cleanup_messages();
				setTimeout(do_cleanup, housekeeping_delay);
			};
			setTimeout(do_cleanup, housekeeping_delay);
		};

		/**
		 * helper function, creates a table if it doesn't exist, otherwise grabs
		 * it. returns the store.
		 */
		var update_table_schema	=	function(e, tablename, options)
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

			if(options.indexes)
			{
				var keys	=	Object.keys(options.indexes);
				for(var i = 0; i < keys.length; i++)
				{
					(function(key, idx) {
						var index_val	=	idx.index ? idx.index : key;
						var unique		=	idx.unique ? true : false;
						try
						{
							store.createIndex(key, index_val, { unique: unique });
						}
						// index probably exists already
						// TODO: check store.indexNames
						catch(e) {}
					})(keys[i], options.indexes[keys[i]]);
				}
			}
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
				start_housekeeping();
			};

			req.onupgradeneeded	=	function(e)
			{
				var store		=	null;
				var tubes		=	qoptions.tubes;

				update_table_schema(e, tbl.ids, { autoincrement: true });
				update_table_schema(e, tbl.reserved);
				update_table_schema(e, tbl.buried, {
					indexes: { id: { unique: false } }
				});
				update_table_schema(e, tbl.pubsub, {
					autoincrement: true,
					indexes: { channel: { index: 'channel', unique: false } }
				});

				for(var i = 0; i < tubes.length; i++)
				{
					if([tbl.reserved, tbl.buried].indexOf(tubes[i]) >= 0) continue;
					update_table_schema(e, tubes[i], {
						indexes: { priority: { index: ['priority', 'id'], unique: false } }
					});
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

		/**
		 * A class that makes consumption of a tube more manageable. For each
		 * reserved item, calls the given handler function.
		 *
		 * Has two public methods: start and stop. The consumer is started by
		 * default on instantiation.
		 */
		var Consumer	=	function(fn, coptions)
		{
			coptions || (coptions = {});

			var tube	=	coptions.tube ? coptions.tube : 'default';
			var delay	=	coptions.delay ? coptions.delay : 100;
			var do_stop	=	false;

			var poll	=	function(options)
			{
				options || (options = {});

				if(do_stop || !db) return;
				if(coptions.enable_fn)
				{
					var res	=	coptions.enable_fn();
					if(!res)
					{
						do_stop	=	true;
						return false;
					}
				}

				// grab an item from the tube
				reserve({
					tube: tube,
					success: function(item) {
						if(!item) return;
						fn(item);
						// immediately poll for new items
						setTimeout( function() { poll({skip_recurse: true}); }, 0 );
					}
				});

				// poll again
				if(!options.skip_recurse) setTimeout(poll, delay);
			};

			var start	=	function()
			{
				if(!do_stop) return false;
				do_stop	=	false;
				setTimeout(poll, delay);
				return true;
			};

			var stop	=	function()
			{
				if(do_stop) return false;
				do_stop	=	true;
				return true;
			};

			setTimeout(poll, delay);

			this.start	=	start;
			this.stop	=	stop;

			return this;
		};

		// ---------------------------------------------------------------------
		// pubsub functions
		// ---------------------------------------------------------------------

		/**
		 * Publish a message into a channel
		 */
		var publish	=	function(channel, msg, options)
		{
			check_db();
			options || (options = {});

			var item	=	{
				channel: channel,
				data: msg,
				created: new Date().getTime()
			};

			var trx			=	db.transaction(tbl.pubsub, 'readwrite');
			trx.oncomplete	=	function(e) { if(options.success) options.success(item, e); };
			trx.onerror		=	function(e) { if(options.error) options.error(e); }

			var store		=	trx.objectStore(tbl.pubsub);
			var req			=	store.add(item);
			req.onsuccess	=	function(e)
			{
				item.id		=	e.target.result;
			};
		};

		/**
		 * Class to make subscribing to a channel easy. Calls the given function
		 * for each message that comes through on the specified channel.
		 *
		 * Holds two public methods: start and stop (subscriber is started by
		 * default).
		 */
		var Subscriber	=	function(channel, fn, soptions)
		{
			soptions || (soptions = {});

			var delay			=	soptions.delay ? soptions.delay : 100;
			var do_stop			=	false;
			var seen_messages	=	{};

			var housekeeping	=	function()
			{
				// clean up seen_messages keys
				var keys	=	Object.keys(seen_messages);
				var curr	=	new Date().getTime();
				for(var i = 0, n = keys.length; i < n; i++)
				{
					var time	=	seen_messages[keys[i]];
					if(time < (curr - (1000 + msg_lifetime))) delete seen_messages[keys[i]];
				}
			};

			var poll	=	function(options)
			{
				options || (options = {});

				if(do_stop || !db) return;
				if(soptions.enable_fn)
				{
					var res	=	soptions.enable_fn();
					if(!res)
					{
						do_stop	=	true;
						return false;
					}
				}

				housekeeping();

				var item	=	null;

				var trx		=	db.transaction(tbl.pubsub, 'readonly');
				trx.oncomplete	=	function(e) {
					if(!item) return;
					fn(item);
				};
				trx.onerror		=	function(e) { if(options.error) options.error(e); }

				var store	=	trx.objectStore(tbl.pubsub);
				var index	=	store.index('channel');
				index.openCursor(IDBKeyRange.only(channel)).onsuccess	=	function(e)
				{
					var cursor	=	e.target.result;
					if(cursor)
					{
						if(seen_messages[cursor.value.id])
						{
							cursor.continue();
						}
						else
						{
							item	=	cursor.value;
							seen_messages[item.id]	=	new Date().getTime();
							// immediately check for more messages
							setTimeout( function() { poll({skip_recurse: true}); }, 0 );
						}
					}
				}

				if(!options.skip_recurse) setTimeout(poll, delay);
			};

			var start	=	function()
			{
				if(!do_stop) return false;
				do_stop	=	false;
				setTimeout(poll, delay);
				return true;
			};

			var stop	=	function()
			{
				if(do_stop) return false;
				do_stop	=	true;
				return true;
			};

			setTimeout(poll, delay);

			this.start	=	start;
			this.stop	=	stop;

			return this;
		};

		// ---------------------------------------------------------------------
		// exports
		// ---------------------------------------------------------------------
		var Queue	=	{
			peek: peek,
			put: put,
			reserve: reserve,
			'delete': del,
			release: release,
			bury: bury,
			kick: kick,
			kick_job: kick_job,
			count_ready: count_ready,
			Consumer: Consumer
		};
		var Pubsub	=	{
			publish: publish,
			Subscriber: Subscriber
		}
		var debug	=	{
			get_db: function() { return db; }
		};
		this.open		=	open;
		this.close		=	close;
		this.is_open	=	function() { return !!db; };
		this.wipe		=	wipe;
		this.Pubsub		=	Pubsub;
		this.Queue		=	Queue;
		this.debug		=	debug;

		return this;
	};
	window.Hustle	=	Hustle;
})(window);
