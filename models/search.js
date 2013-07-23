var Search	=	Composer.Model.extend({
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

	init: function()
	{
		tagit.profile.get('boards').bind('add', function(board) {
			this.watch_board(board);
		}.bind(this), 'search:board:add');
	},

	search: function(search)
	{
		var res			=	false;
		var searches	=	Object.keys(search);
		for(var i = 0, n = searches.length; i < n; i++)
		{
			var index	=	searches[i];
			var vals	=	search[index];
			if(typeOf(vals) != 'array') vals = [vals];
			for(var ii = 0, nn = vals.length; ii < nn; ii++)
			{
				var val		=	vals[ii];
				var exclude	=	false;
				if(val.substr(0, 1) == '!')
				{
					val		=	val.substr(1);
					exclude	=	true;
				}

				if(!res)
				{
					res	=	this['index_'+index][val];
					continue;
				}
				if(res.length == 0) return res;

				if(exclude)
				{
					res	=	this.exclude(res, this['index_'+index][val]);
				}
				else
				{
					res	=	this.intersect(res, this['index_'+index][val]);
				}
			}
		}
		return res;
	},

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

	exclude: function(array1, array2)
	{
		// create an index
		var idx	=	{};
		array2.each(function(item) { idx[item] = true; });

		var result	=	[];
		array1.each(function(item) {
			if(idx[item]) return;
			result.push(item);
		});
		return result;
	},

	index_note: function(note)
	{
		var json	=	toJSON(note);
		this.index_json.notes[note.id()]	=	json;

		note.get('tags').each(function(tag) {
			this.index_type('tags', tag.get('name'), note.id());
		}.bind(this));
		this.index_type('boards', note.get('board_id'), note.id());
	},

	unindex_note: function(note)
	{
		var id		=	note.id();
		var json	=	this.index_json.notes[id];
		if(!json) return false;
		json.tags.each(function(tag) {
			this.unindex_type('tags', tag.name, id);
		}.bind(this));
		this.unindex_type('boards', json.board_id, id);

		delete this.index_json.notes[id];
	},

	reindex_note: function(note)
	{
		this.unindex_note(note);
		this.index_note(note);
	},

	index_type: function(type, index_id, item_id)
	{
		if(typeOf(this['index_'+type][index_id]) != 'array')
		{
			this['index_'+type][index_id]	=	[];
		}
		// make sure this is a set
		if(this['index_'+type][index_id].contains(item_id)) return;

		// save/sort the index
		this['index_'+type][index_id].push(item_id);
		this['index_'+type][index_id].sort(function(a, b) { return a.localeCompare(b); });
	},

	unindex_type: function(type, index_id, item_id)
	{
		this['index_'+type][index_id].erase(item_id);
	},

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

	reindex: function()
	{
		tagit.profile.get('boards').each(function(board) {
			board.get('notes').each(function(note) {
				this.reindex_note(note);
			}.bind(this));
		}.bind(this));
	}
});
