var Search = Composer.Model.extend({
	// stores JSON objects for each indexed object. this allows us to unindex an
	// object easily (for instance if we're re-indexing it, we need to unindex
	// the old version and index the new version...the old version is stored
	// here).
	index_json: {
		notes: {}
	},

	// tag_id -> note_id index
	index_tags: {},

	// board_id -> note_id index
	index_boards: {},

	// full-text search
	ft: null,

	init: function()
	{
		turtl.profile.bind_relational('boards', 'add', function(board) {
			this.watch_board(board);
		}.bind(this), 'search:board:add');

		this.ft = lunr(function() {
			this.ref('id');
			this.field('title', {boost: 5});
			this.field('url', {boost: 10});
			this.field('body');
			this.field('tags', {boost: 10});
		});
	},

	search: function(search)
	{
		// this will hold all search results, as an array of note IDs
		var res = false;

		// process full-text search first
		if(search.text && typeOf(search.text) == 'string' && search.text.length > 0 && this.ft)
		{
			// run the search and grab the IDs (throw out relevance for now)
			var res = this.ft.search(search.text).map(function(r) { return r.ref; });

			// sort the resulting IDs so the intersection functions later on
			// don't choke (they operate on sorted sets).
			res.sort(function(a, b) { return a.localeCompare(b); });
		}

		// don't want the index searches trying to use this.
		delete search.text;

		// pull out the indexes we're searching and narrow down the resulting
		// note id list as we go along. this continues until a) no notes are
		// left (empty result set) or b) we get a list of notes that match all
		// the search criteria.
		var searches = Object.keys(search);
		for(var i = 0, n = searches.length; i < n; i++)
		{
			var index = searches[i];
			var vals = search[index];
			if(typeOf(vals) != 'array') vals = [vals];

			// loop over all values passed for this index type and interset the
			// corresponding values.
			//
			// for now, there is ONLY an intersection (ie AND) search type, no
			// union (OR). we do, however, allow exclusions by prefixing a value
			// with "!"
			for(var ii = 0, nn = vals.length; ii < nn; ii++)
			{
				var val = vals[ii];
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
					res = this['index_'+index][val];
					continue;
				}

				// if the result set is empty, just return
				if(res.length == 0) return res;

				// intersect/exclude based on what kind of value search we're
				// doing.
				if(exclude)
				{
					res = this.exclude(res, this['index_'+index][val]);
				}
				else
				{
					res = this.intersect(res, this['index_'+index][val]);
				}
			}
		}
		return res;
	},

	/**
	 * Find the intersection between two sorted sets of string values.
	 */
	intersect: function(array1, array2)
	{
		var result = [];
		// Don't destroy the original arrays
		var a = array1.slice(0);
		var b = array2.slice(0);
		var aLast = a.length - 1;
		var bLast = b.length - 1;
		while(aLast >= 0 && bLast >= 0)
		{
			if(a[aLast].localeCompare(b[bLast]) > 0)
			{
				a.pop();
				aLast--;
			}
			else if(a[aLast].localeCompare(b[bLast]) < 0)
			{
				b.pop();
				bLast--;
			}
			else
			{
				result.push(a.pop());
				b.pop();
				aLast--;
				bLast--;
			}
		}
		return result.reverse();
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
		var json = toJSON(note);
		if(json.url && json.url.match(/^data:/)) json.url = '';
		this.index_json.notes[note.id()] = json;

		note.get('tags').each(function(tag) {
			console.log('tag: ', tag, tag.get('name'));
			this.index_type('tags', tag.get('name'), note.id());
		}.bind(this));
		this.index_type('boards', note.get('board_id'), note.id());

		// run full-text indexer
		var tags = json.tags.map(function(t) { return t.name; }).join(' ');
		this.ft.add({
			id: json.id,
			url: json.url,
			title: json.title,
			body: json.text,
			tags: tags
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
		json.tags.each(function(tag) {
			this.unindex_type('tags', tag, id);
		}.bind(this));
		this.unindex_type('boards', json.board_id, id);

		// undo full-text indexing
		var tags = json.tags.map(function(t) { return t.name; }).join(' ');
		this.ft.remove({
			id: json.id,
			url: json.url,
			title: json.title,
			body: json.text,
			tags: tags
		});
		delete this.index_json.notes[id];
	},

	reindex_note: function(note)
	{
		// not super graceful, but effective
		this.unindex_note(note);
		this.index_note(note);
	},

	index_type: function(type, index_id, item_id)
	{
		if(typeOf(this['index_'+type][index_id]) != 'array')
		{
			this['index_'+type][index_id] = [];
		}
		// make sure this is a set
		if(this['index_'+type][index_id].contains(item_id)) return;

		// save/sort the index
		this['index_'+type][index_id].push(item_id);
		this['index_'+type][index_id].sort(function(a, b) { return a.localeCompare(b); });
	},

	unindex_type: function(type, index_id, item_id)
	{
		var idx = this['index_'+type][index_id];
		if(idx) idx.erase(item_id);
	},

	/**
	 * Monitor a board for note changes.
	 */
	watch_board: function(board)
	{
		board.bind_relational('notes', 'add', function(note) {
			this.index_note(note);
		}.bind(this), 'search:notes:monitor:add');
		board.bind_relational('notes', 'change', function(note) {
			this.reindex_note(note);
		}.bind(this), 'search:notes:monitor:change');
		board.bind_relational('notes', 'remove', function(note) {
			this.unindex_note(note);
		}.bind(this), 'search:notes:monitor:remove');

		board.bind('destroy', function() {
			board.unbind_relational('notes', 'add', 'search:notes:monitor:add');
			board.unbind_relational('notes', 'change', 'search:notes:monitor:change');
			board.unbind_relational('notes', 'remove', 'search:notes:monitor:remove');
			board.unbind('destroy', 'search:board:cleanup');
		}.bind(this), 'search:board:cleanup');
	},

	/**
	 * Reindex all notes in the system.
	 */
	reindex: function()
	{
		turtl.profile.get('boards').each(function(board) {
			board.get('notes').each(function(note) {
				this.reindex_note(note);
			}.bind(this));
		}.bind(this));
	}
});
