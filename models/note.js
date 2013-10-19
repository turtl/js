var Note = Composer.RelationalModel.extend({
	base_url: '/notes',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'board_id',
		'keys',
		'body',
		'meta'
	],

	private_fields: [
		'type',
		'title',
		'tags',
		'url',
		'text',
		'embed',
		'color',
		'sort'
	],

	init: function()
	{
		var save_old = function() {
			// keep a delayed record of the last tag set
			(function() {
				this.set({old_tags: this.get('tags').map(function(t) {
					return t.get('name');
				})}, {silent: true});
			}).delay(0, this);
		}.bind(this);
		this.bind('change:tags', save_old);
		this.bind('change', this.track_sync.bind(this));
		save_old();
	},

	add_tag: function(tag)
	{
		var tags = this.get('tags');
		if(tags.find(function(t) { return t.get('name') == tag; })) return false;
		tags.add({name: tag});
		return true;
	},

	remove_tag: function(tag)
	{
		var tags = this.get('tags');
		var found = tags.select({name: tag});
		found.each(function(t) {
			tags.remove(t);
		});
	},

	has_tag: function(tagname)
	{
		return this.get('tags').find(function(t) {
			return t.get('name') == tagname;
		});
	},

	get_url: function()
	{
		var url	=	this.id(true) ?
						'/notes/'+this.id() :
						'/boards/'+this.get('board_id')+'/notes';
		return url;
	},

	save: function(options)
	{
		if(options.api_save)
		{
			var args	=   {};
			var meta	=   this.get('meta');
			if(meta && meta.persona)
			{
				args.persona	=   meta.persona;
			}
			return this.parent.call(this, options);
		}
		else
		{
			options.table	=	'notes';

			var board	=	turtl.profile.get('boards').find_by_id(this.get('board_id'));
			if(!board)
			{
				options.error('Problem finding board for that note.');
				return false;
			}

			if(board.get('shared', false) && this.get('user_id') != turtl.user.id())
			{
				var persona		=	board.get_shared_persona();
				args.persona	=	persona.id();
			}
		}

		return this.parent.call(this, options);
	},

	destroy: function(options)
	{
		options || (options = {});
		var args		=	{};

		// some hacky shit that allows us to ref Model.destroy async
		var name		=	this.$caller.$name;
		var parent		=	this.$caller.$owner.parent;
		var previous	=	(parent) ? parent.prototype[name] : null;

		var do_destroy	=	function()
		{
			options.args	=	args;
			previous.apply(this, [options]);
		}.bind(this);

		var board	=	turtl.profile.get('boards').find_by_id(this.get('board_id'));
		if(!board)
		{
			if(options.error) options.error('Problem finding board for that note.');
			return false;
		}

		if(board.get('shared', false) && !options.skip_remote_sync)
		{
			var persona		=	board.get_shared_persona();
			args.persona	=	persona.id();
		}
		do_destroy();
	},

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		var board_id = this.get('board_id');
		var board_key = turtl.profile.get('boards').find_by_id(board_id).key;
		if(!search.b && board_id && board_key)
		{
			search.b = [{id: board_id, k: board_key}];
		}
		var ret = this.parent(keys, search, options);
		return ret;
	},

	track_sync: function()
	{
		turtl.profile.track_sync_changes(this.id());
	}
}, Protected);

var Notes = SyncCollection.extend({
	model: Note,
	local_table: 'notes',

	sortfn: function(a, b) { return a.id().localeCompare(b.id()); },

	// used for tracking batch note saves
	batch_track: null,

	start_batch_save: function()
	{
		this.batch_track	=	[];
		this.bind('change', function(note) {
			this.batch_track.push(note);
		}.bind(this), 'notes:collection:batch_track:change');
	},

	finish_batch_save: function(options)
	{
		options || (options = {});
		this.unbind('change', 'notes:collection:batch_track:change');
		if(this.batch_track.length == 0) return;

		var save	=	this.batch_track.map(function(note) {
			// we really only care about the id/body
			return {id: note.id(), body: note.toJSON().body};
		});
		// corpses
		var args	=	{data: save};
		if(options.shared && options.persona)
		{
			args.persona	=	options.persona.id();
		}
		turtl.api.put('/notes/batch', args, {
			success: options.success,
			error: options.error
		});

		this.batch_track	=	[];
	},

	process_local_sync: function(note_data, note)
	{
		if(note_data.deleted)
		{
			if(note) note.destroy({skip_remote_sync: true});
		}
		else if(note)
		{
			note.set(note_data);
		}
		else
		{
			var note	=	new Note(note_data);
			if(note_data.cid) note._cid	=	note_data.cid;
			this.upsert(note);
		}
	}
});

var NotesFilter = Composer.FilterCollection.extend({
});
