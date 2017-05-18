var Board = Protected.extend({
	base_url: '/boards',

	public_fields: [
		'id',
		'space_id',
		'user_id',
		'keys',
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

			// remove the keychain entry only after the notes have been saved or
			// destroyed
			return this.each_note(function(note) { return note.destroy(options); });
		}.bind(this));
	},

	update_keys: function(options)
	{
		options || (options = {});

		this.set({user_id: turtl.user.id()}, options);

		var space_id = this.get('space_id');
		var subkeys = [];
		var space = turtl.profile.get('spaces').get(space_id);
		if(space) subkeys.push({s: space.id(), k: space.key});

		// is this needed? copied from Note model's update_keys() fn
		var key = this.ensure_key_exists();
		if(!key) return Promise.reject(new Error('board: missing key: '+ this.id()));

		// ok, we have a key, we can update our subkeys now
		this.generate_subkeys(subkeys);
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

	get_key_search: function()
	{
		var space_ids = [this.get('space_id')];
		// also look in keys for space ids. they really shouldn't be in here if
		// not in note.spaces, but it's much better to find a key and be wrong
		// than to have a note you cannot decrypt and be right.
		this.get('keys').each(function(key) {
			var space_id = key.get('s');
			if(space_id && space_ids.indexOf(space_id) < 0)
			{
				space_ids.push(space_id);
			}
		});

		var search = new Keychain();
		var keychain = turtl.profile.get('keychain');
		var spaces = turtl.profile.get('spaces');
		space_ids.forEach(function(space_id) {
			var space = spaces.get(space_id);
			if(!space || !space.key) return;
			search.upsert_key(space.id(), 'space', space.key, {skip_save: true});
		});
		return search;
	},

	each_note: function(callback, options)
	{
		options || (options = {});
		var cnotes = turtl.profile.get('notes');
		return turtl.db.notes.query('board_id').only(this.id()).execute()
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
		return turtl.search.search({board: this.id()}).bind(this)
			.spread(function(notes) {
				var unique_notes  = notes.filter(function(note, i) { return i == notes.lastIndexOf(note); });
				return unique_notes.length;
			});
	},

	get_space: function()
	{
		var space_id = this.get('space_id');
		if(!space_id) return false;
		return turtl.profile.get('spaces').get(space_id) || false;
	},

	move_spaces: function(new_space_id) {
		this.set({space_id: new_space_id});
		return this.save({custom_method: 'move-space'})
			.bind(this)
			.then(function() {
				return this.each_note(function(note) {
					return note.move_spaces(new_space_id);
				}, {decrypt: true});
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

