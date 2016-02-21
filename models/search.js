var Search = Composer.Collection.extend({
	// stores JSON objects for each indexed object. this allows us to unindex an
	// object easily (for instance if we're re-indexing it, we need to unindex
	// the old version and index the new version...the old version is stored
	// here).
	index_json: {
		notes: {}
	},

	// tag_id -> note_id index
	index: {
		tags: {},
		boards: {},
		colors: {},
		all_notes: {},
		note_tags: {},
		urls: {}
	},

	// sort fields (tag_id -> sort val index)
	sort: {
		created: {},
		mod: {}
	},

	// full-text search
	ft: null,

	// when we do a reset, mark the TOTAL results from that search
	total: 0,

	init: function()
	{
	},

	reindex: function()
	{
		this.ft = lunr(function() {
			this.ref('id');
			this.field('title', {boost: 5});
			this.field('url', {boost: 10});
			this.field('body');
			this.field('tags', {boost: 10});
			this.field('file');
		});

		turtl.profile.get('boards').each(this.index_board.bind(this));
		return turtl.db.notes.query().all().execute().bind(this)
			.map(function(note) {
				var note = new Note(note);
				return note.deserialize()
					.then(function() { return note; })
					.catch(function(err) {
						if(note.is_crypto_error(err))
						{
							note.set({type: 'text', crypto_error: true});
						}
						else
						{
							throw err;
						}
					});
			})
			.then(function(notes) {
				var batch = 20;
				var next = function()
				{
					var slice = notes.splice(0, batch);
					if(slice.length == 0) return;
					slice.forEach(this.reindex_note.bind(this));
					setTimeout(next);
				}.bind(this);
				next();
			});
	},

	wipe: function()
	{
		[
			this.index_json,
			this.index,
			this.sort
		].forEach(function(obj) {
			Object.keys(obj).forEach(function(k) {
				obj[k] = {};
			}.bind(this));
		});

		this.ft = null;
		return this.clear();
	},

	search: function(search, options)
	{
		search || (search = {});
		options || (options = {});

		search = clone(search);
		if(search.sort && (search.sort[0] == 'id' || this.sort[search.sort[0]]))
		{
			var field = search.sort[0];
			var asc = !(search.sort[1] == 'desc');
			var lookup = this.sort[field];
			var sortfn = function(a, b)
			{
				a = a instanceof Composer.Model ? a.id() : a;
				b = b instanceof Composer.Model ? b.id() : b;
				var a1 = asc ? a : b;
				var b1 = asc ? b : a;
				if(field == 'id') return a1.localeCompare(b1);

				var va = lookup[a1];
				var vb = lookup[b1];
				if(typeof(va) == 'number' && typeof(vb) == 'number')
				{
					return va - vb;
				}
				return va.toString().localeCompare(vb.toString());
			}.bind(this)
			this.sortfn = sortfn;
		}

		return new Promise(function(resolve, reject) {
			// this will hold all search results, as an array of note IDs
			var res = false;

			var res_intersect = function(arr)
			{
				if(!res) res = arr;
				else if(res.length === 0) res = [];
				else res = this.intersect(res, arr);
			}.bind(this);

			// loop over the search criteria and narrow down the results
			var keys = Object.keys(search);
			for(var i = 0; i < keys.length; i++)
			{
				var index = keys[i];
				var val = search[index];
				if(!val) continue;
				if(res && res.length == 0) break;
				var lookup_options = {};
				switch(index)
				{
					case 'text':
						res_intersect(this.ft.search(val).map(function(r) { return r.ref; }));
						break;
					case 'boards':
						lookup_options.or = true;
						// NO BREAK
					case 'tags':
						res_intersect(this.index_lookup(res, index, val, lookup_options));
						break;
					case 'colors':
						res_intersect(this.index_lookup(res, 'colors', val, {or: true}));
						break;
					case 'url':
						res_intersect(this.index_lookup(res, 'urls', [val]));
						break;
				}
			}

			if(!res)
			{
				res = Object.keys(this.index.all_notes);
			}

			if(this.sortfn) res.sort(sortfn);

			// calculate our tags
			var tags = {};
			res.forEach(function(note_id) {
				var note_tags = JSON.parse(this.index.note_tags[note_id]);
				note_tags.forEach(function(tag) {
					if(!tags[tag]) tags[tag] = 0;
					tags[tag]++;
				});
			}.bind(this));
			tags = Object.keys(tags).map(function(tag) {
				return {name: tag, count: tags[tag]};
			});

			// do our offsetting/limiting
			var per_page = search.per_page || 100;
			var offset = ((search.page || 1) - 1) * per_page;
			var total = res.length;
			var res = res.slice(offset, offset + per_page);
			if(options.do_reset)
			{
				this.total = total;
				this.reset(res.map(function(id) { return {id: id}; }), options);
				this.trigger('search-tags', tags);
			}

			resolve([res, tags, total]);
		}.bind(this));
	},

	index_lookup_and: function(res, index, vals)
	{
		// loop over all values passed for this index type and interset the
		// corresponding values.
		//
		// for now, there is ONLY an intersection (ie AND) search type, no
		// union (OR). we do, however, allow exclusions by prefixing a value
		// with "!"
		for(var ii = 0, nn = vals.length; ii < nn; ii++)
		{
			var val = vals[ii];
			if(!val) continue;
			var exclude = false;
			if(val.substr(0, 1) == '!')
			{
				val = val.substr(1);
				exclude = true;
			}

			// check if there is no result set yet. if not, create it using
			// the first set of index data.
			if(!res)
			{
				res = this.index[index][val] || [];
				continue;
			}

			// if the result set is empty, just return
			if(res.length == 0) return res;

			// intersect/exclude based on what kind of value search we're
			// doing.
			if(exclude)
			{
				res = this.exclude(res, this.index[index][val]);
			}
			else
			{
				res = this.intersect(res, this.index[index][val]);
			}
		}
		return res;
	},

	index_lookup_or: function(res, index, vals)
	{
		if(vals.length == 0) return res;

		var or_res = [];
		for(var ii = 0, nn = vals.length; ii < nn; ii++)
		{
			var val = vals[ii];
			if(!val) continue;

			or_res = this.union(or_res, this.index[index][val]);
		}
		var ret = [];
		if(res) ret = this.intersect(res || [], or_res); 
		else ret = or_res;
		return ret;
	},

	index_lookup: function(res, index, vals, options)
	{
		options || (options = {});
		if(res.length == 0) return res;

		if(options.or)
		{
			return this.index_lookup_or(res, index, vals);
		}
		else
		{
			return this.index_lookup_and(res, index, vals);
		}
	},

	/**
	 * Find the intersection between two sets of string values.
	 */
	intersect: function(array1, array2)
	{
		var result = [];
		if(array1.length == 0 || array2.length == 0) return [];

		var hash = {};
		for(var i = 0; i < array1.length; i++)
		{
			hash[array1[i]] = 1;
		}

		for(var i = 0; i < array2.length; i++)
		{
			var val = array2[i];
			var exists = hash[val];
			if(exists && exists == 1)
			{
				result.push(val);
				// remove dupes
				hash[val]++;
			}
		}

		return result;
	},

	/**
	 * union two arrays
	 */
	union: function(array1, array2)
	{
		var filterfn = function(item) { return !!item; };
		return (array1 || []).filter(filterfn).concat((array2 || []).filter(filterfn));
	},

	/**
	 * Find all string items in array1 that DO NOT EXIST in array2.
	 */
	exclude: function(array1, array2)
	{
		// create an index
		var idx = {};
		array2.each(function(item) { idx[item] = true; });

		var result = [];
		array1.each(function(item) {
			if(idx[item]) return;
			result.push(item);
		});
		return result;
	},

	/**
	 * Given a Note model, index it.
	 */
	index_note: function(note)
	{
		var json = note.toJSON({get_file: true});
		// replace "words" longer than 2048 chars
		if(json.text) json.text = json.text.replace(/[^ ]{2048,}/, '');
		if(json.url && json.url.match(/^data:/)) json.url = '';
		this.index_json.notes[note.id()] = json;

		(note.get('tags') || []).each(function(tag) {
			this.index_type('tags', tag.get('name'), note.id());
		}.bind(this));
		(note.get('boards') || []).forEach(function(board_id) {
			this.index_type('boards', board_id, note.id());
		}.bind(this));

		var color = note.get('color');
		this.index_type('colors', color, note.id());

		var tags = JSON.stringify(note.get('tags').map(function(t) { return t.get('name', '').toLowerCase(); }));
		this.index_type('note_tags', note.id(), tags);

		var url = note.get('url');
		if(url) this.index_type('urls', url, note.id());

		this.index.all_notes[note.id()] = true;

		// index the sorting fields
		Object.keys(this.sort).forEach(function(field) {
			this.sort[field][note.id()] = note.get(field);
		}.bind(this));

		// run full-text indexer
		var tags = json.tags.join(' ');
		this.ft.add({
			id: json.id,
			url: json.url,
			title: json.title,
			body: json.text,
			tags: tags,
			file: (json.file || {}).name
		});
	},

	/**
	 * Given a Note model, unindex it.
	 */
	unindex_note: function(note)
	{
		var id = note.id();
		var json = this.index_json.notes[id];
		if(!json) return false;
		(json.tags || []).each(function(tag) {
			this.unindex_type('tags', tag, id);
		}.bind(this));
		(json.boards || []).each(function(board_id) {
			this.unindex_type('boards', board_id, id);
		}.bind(this));

		var color = json.color;
		this.unindex_type('colors', color, id);

		var tags = JSON.stringify(json.tags.map(function(t) { return t.toLowerCase(); }));
		this.unindex_type('note_tags', note.id(), tags);

		var url = json.url;
		if(url) this.unindex_type('urls', url, id);

		delete this.index.all_notes[note.id()];

		// unindex the sorting fields
		Object.keys(this.sort).forEach(function(field) {
			delete this.sort[field][note.id()];
		}.bind(this));

		// undo full-text indexing
		var tags = json.tags.join(' ');
		this.ft.remove({
			id: json.id,
			url: json.url,
			title: json.title,
			body: json.text,
			tags: tags,
			file: (json.file || {}).name
		});
		delete this.index_json.notes[id];
	},

	reindex_note: function(note)
	{
		// not super graceful, but effective
		this.unindex_note(note);
		this.index_note(note);
	},

	index_board: function(board)
	{
		if(!this.index.boards[board.id()]) this.index.boards[board.id()] = [];
	},

	unindex_board: function(board, options)
	{
		options || (options = {});

		if(options.full)
		{
			delete this.index.boards[board.id()];
		}
	},

	reindex_board: function(board)
	{
		this.unindex_board(board);
		this.index_board(board);
	},

	index_type: function(type, index_id, item_id)
	{
		if(typeOf(this.index[type][index_id]) != 'array')
		{
			this.index[type][index_id] = [];
		}
		// make sure this is a set
		if(this.index[type][index_id].contains(item_id)) return;

		// save/sort the index
		this.index[type][index_id].push(item_id);
	},

	unindex_type: function(type, index_id, item_id)
	{
		var idx = this.index[type][index_id];
		if(idx) idx.erase(item_id);
	}
});
