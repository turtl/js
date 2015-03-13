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
			collection: 'Personas'
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
		this.bind('destroy', function(_1, _2, options) {
			turtl.profile.get('keychain').remove_key(this.id());
			this.get('boards').each(function(board) {
				board.destroy(options);
			});

			if(options.delete_notes)
			{
				// notes may not be loaded into memory, so we need to find them in
				// the local db
				var cnotes = turtl.profile.get('notes');
				turtl.db.notes.query('boards').only(this.id()).execute()
					.then(function(notes) {
						(notes || []).forEach(function(note) {
							var cnote = cnotes.find_by_id(note.id)
							if(cnote)
							{
								// if we have an existing note in-memory, destroy it.
								// this will also remove the note from any listening
								// collections
								cnote.destroy();
							}
							else
							{
								// we don't have an existing in-mem model, so create
								// one and then destroy it
								(new Note(note)).destroy();
							}
						});
					});
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
	}
});

var Boards = SyncCollection.extend({
	model: Board
});

var BoardsFilter = Composer.FilterCollection.extend({
	sortfn: function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }
});

