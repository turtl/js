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

		var parent_id = this.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		this.set({user_id: turtl.user.id()}, options);
		if(parent)
		{
			// if we have a parent board, make sure the child can decrypt
			// its key via the parent's
			this.generate_subkeys([{b: parent.id(), k: parent.key}]);
		}

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

		var parent_id = this.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		if(parent && parent.key)
		{
			search.b.push({id: parent_id, k: parent.key});
		}
		else
		{
			// didn't find our parent, so search for him/her in the keychain
			var parent_key = turtl.profile.get('keychain').find_key(parent_id);
			if(parent_key)
			{
				search.b.push({id: parent_id, k: parent_key});
			}
		}
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
	},

	remove_persona: function(persona)
	{
		return turtl.api._delete(this.get_url() + '/persona/'+persona.id())
			.then(function(board) {
				// do nothing, the sync system will update the board for us,
				// probably before the sync call even returns
			});
	}
});

var Boards = SyncCollection.extend({
	model: Board,

	toJSON_hierarchical: function()
	{
		var boards = this.toJSON().sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
		var parents = boards.filter(function(b) { return !b.parent_id; });
		var children = boards.filter(function(b) { return !!b.parent_id; });

		// index the parents for easy lookup
		var idx = {};
		parents.forEach(function(b) {
			idx[b.id] = b;
			// fix any bad titles while we're looping
			if(!b.title) b.title = i18next.t('(untitled board)');
		});

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
				var name = board.get('title') || i18next.t('(untitled board)');
				var parent_id = board.get('parent_id');
				if(parent_id)
				{
					var parent = this.find_by_id(parent_id);
					if(parent) name = parent.get('title') + '/' + name;
				}
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

