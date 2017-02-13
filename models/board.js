var Board = Protected.extend({
	base_url: '/boards',

	public_fields: [
		'id',
		'user_id',
		'keys',
		'privs',
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
			options || (options = {});

			// NOTE: if we're skipping remote sync, this is coming from a sync
			// item (almost assuredly) and we don't want to edit/remove the
			// notes
			var note_promise = Promise.resolve();
			if(!options.skip_remote_sync)
			{
				// whether we delete the notes or not, we loop over them all and
				// wait on the promise for them to finish. we have to do this
				// before the keychain entry is deleted below or else there's a
				// chance if the note is old and doesn't have its own keychain
				// entry it will not be able to sfind its own key when it tries
				// to create that entry
				if(options.delete_notes)
				{
					note_promise = this.each_note(function(note) {
						return note.destroy(options);
					});
				}
				else
				{
					var board_id = this.id();
					note_promise = this.each_note(function(note, opts) {
						var existing = (opts || {}).existing;
						var boards = note.get('boards').slice(0);
						boards = boards.erase(board_id);
						note.set({boards: boards}, options);
						return note.save(options);
					}.bind(this), {decrypt: true});
				}
			}

			// remove the keychain entry only after the notes have been saved or
			// destroyed
			note_promise.bind(this)
				.then(function() {
					// kill the keychain entry
					turtl.profile.get('keychain').remove_key(this.id(), options);

					// remove child boards, if any
					this.get('boards').each(function(board) {
						board.destroy(options);
					});
				});
		}.bind(this));
	},

	update_keys: function(options)
	{
		options || (options = {});

		this.set({user_id: turtl.user.id()}, options);

		var keychain = turtl.profile.get('keychain');
		var existing = keychain.find_key(this.id());
		if(!existing || (this.key && JSON.stringify(existing) != JSON.stringify(this.key)))
		{
			// key needs an add/update
			return keychain.upsert_key(this.id(), 'board', this.key);
		}
		return Promise.resolve();
	},

	save: function(options)
	{
		var parentfn = this.$get_parent();
		return this.update_keys(options).bind(this)
			.then(function() {
				return parentfn.call(this, options);
			});
	},

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		search.b || (search.b = []);

		// TODO: find space key

		return this.parent(keys, search, options);
	},

	each_note: function(callback, options)
	{
		options || (options = {});
		var cnotes = turtl.profile.get('notes');
		return turtl.db.notes.query('boards').only(this.id()).execute()
			.then(function(notes) {
				var promises = (notes || []).map(function(note) {
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
						if(options.decrypt)
						{
							return cnote.deserialize()
								.then(function() {
									return callback(cnote, {existing: true});
								})
								.catch(function(err) {
									log.error('board.each_note(): deserialize: ', err, note);
									throw err;
								});
						}
					}
					return callback(cnote, {existing: existing});
				});
				return Promise.all(promises);
			});
	},

	note_count: function()
	{
		var child_board_ids = this.get_child_board_ids();
		var boards = [this.id()].concat(child_board_ids);
		return turtl.search.search({boards: boards}).bind(this)
			.spread(function(notes) {
				var unique_notes  = notes.filter(function(note, i) { return i == notes.lastIndexOf(note); });
				return unique_notes.length;
			});
	},
});

var Boards = SyncCollection.extend({
	model: Board,

	toJSON_hierarchical: function()
	{
		var boards = this.toJSON()
			.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
		return boards;
	},

	toJSON_named: function(board_ids)
	{
		return board_ids
			.map(function(bid) {
				var board = this.find_by_id(bid);
				if(!board) return false;
				var name = board.get('title') || i18next.t('(untitled board)');
				var json = board.toJSON();
				json.name = name;
				if(!json.title) json.title = i18next.t('(untitled board)');
				return json;
			}.bind(this))
			.filter(function(board) { return !!board; });
	}
});

var BoardsFilter = Composer.FilterCollection.extend({
	sortfn: function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }
});

