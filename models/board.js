var Board = Protected.extend({
	base_url: '/boards',

	relations: {
		boards: {
			filter_collection: 'BoardsFilter',
			master: function() { return turtl.profile.get('boards'); },
			options: {
				filter: function(model, boardfilter) {
					return model.get('parent_id') == boardfilter.get_parent().id();
				}
			}
		},
		personas: {
			collection: 'BoardPersonas'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'parent_id',
		'keys',
		'privs',
		'personas',
		'meta',
		'shared'
	],

	private_fields: [
		'title'
	],

	init: function()
	{
		this.bind('destroy', turtl.search.unindex_board.bind(turtl.search, this, {full: true}));
		this.bind('change', function() {
			if(!this.id(true)) return;
			turtl.search.reindex_board(this);
		}.bind(this));

		this.bind('destroy', function(_1, _2, options) {
			turtl.profile.get('keychain').remove_key(this.id());
			this.get('boards').each(function(board) {
				board.destroy(options);
			});

			var boards = turtl.profile.get('boards');
			if(options.delete_notes)
			{
				this.each_note(function(note) { note.destroy(); });
			}
			else
			{
				var board_id = this.id();
				this.each_note(function(note) {
					var boards = note.get('boards').slice(0);
					boards = boards.erase(board_id);
					note.set({boards: boards});
					note.save();
				}.bind(this));
			}
		}.bind(this));
	},

	init_new: function(options)
	{
		options || (options = {});

		var parent_id = this.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		this.set({user_id: turtl.user.id()}, options);
		this.generate_key();
		keypromise = turtl.profile.get('keychain').add_key(this.id(), 'board', this.key);
		if(parent)
		{
			// if we have a parent board, make sure the child can decrypt
			// its key via the parent's
			this.generate_subkeys([{b: parent.id(), k: parent.key}]);
		}
		return keypromise;
	},

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		search.b || (search.b = []);

		var parent_id = this.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		if(parent)
		{
			search.b.push({id: parent.id(), k: parent.key});
		}
		return this.parent(keys, search, options);
	},

	each_note: function(callback)
	{
		var cnotes = turtl.profile.get('notes');
		turtl.db.notes.query('boards').only(this.id()).execute()
			.then(function(notes) {
				(notes || []).forEach(function(note) {
					var existing = true;
					// if we have an existing note in-memory, use it.
					// this will also apply our changes in any listening
					// collections
					var cnote = cnotes.find_by_id(note.id)
					if(!cnote)
					{
						// if we don't have an existing in-mem model,
						// create one and then apply our changes to it
						cnote = new Note(note);
						existing = false;
					}
					callback(cnote, {existing: existing});
				});
			});
	},

	note_count: function()
	{
		var child_board_ids = this.get_child_board_ids();
		var boards = [this.id()].concat(child_board_ids);
		return turtl.search.search({boards: boards}).bind(this)
			.spread(function(notes) {
				return notes.length;
			});
	},

	get_child_board_ids: function()
	{
		var children = [];
		turtl.profile.get('boards').each(function(board) {
			if(board.get('parent_id') == this.id())
			{
				children.push(board.id());
			}
		}.bind(this));
		return children;
	}
});

var Boards = SyncCollection.extend({
	model: Board,

	toJSON_hierarchical: function()
	{
		var boards = this.toJSON().sort(function(a, b) { return a.title.localeCompare(b.title); });
		var parents = boards.filter(function(b) { return !b.parent_id; });
		var children = boards.filter(function(b) { return !!b.parent_id; });

		// index the parents for easy lookup
		var idx = {};
		parents.forEach(function(b) { idx[b.id] = b; });

		children.forEach(function(b) {
			var parent = idx[b.parent_id];
			if(!parent) return;
			if(!parent.children) parent.children = [];
			parent.children.push(b);
		});

		return parents;
	},

	toJSON_named: function(board_ids)
	{
		return board_ids
			.map(function(bid) {
				var board = this.find_by_id(bid);
				if(!board) return false;
				var name = board.get('title');
				var parent_id = board.get('parent_id');
				if(parent_id)
				{
					var parent = this.find_by_id(parent_id);
					if(parent) name = parent.get('title') + '/' + name;
				}
				var json = board.toJSON();
				json.name = name;
				return json;
			}.bind(this))
			.filter(function(board) { return !!board; });
	}
});

var BoardsFilter = Composer.FilterCollection.extend({
	sortfn: function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }
});

