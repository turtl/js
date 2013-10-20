var Board = Composer.RelationalModel.extend({
	base_url: '/boards',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags',
			forward_events: true
		},
		categories: {
			type: Composer.HasMany,
			collection: 'Categories',
			forward_events: true
		},
		notes: {
			type: Composer.HasMany,
			filter_collection: 'NotesFilter',
			master: function() { return turtl.profile.get('notes'); },
			options: {
				filter: function(model, notesfilter) {
					return model.get('board_id') == notesfilter.get_parent().id();
				},
				forward_all_events: true
			},
			forward_events: true
		},
		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'keys',
		'privs',
		'personas',
		'body'
	],

	private_fields: [
		'title',
		'shared'
	],

	defaults: {
	},

	_track_tags: true,

	init: function()
	{
		this.bind_relational('notes', 'add', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').add_tags_from_note(note);
			this.get('tags').trigger('update');
			this.trigger('note_change');
		}.bind(this), 'board:model:notes:add');
		this.bind_relational('notes', 'remove', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').remove_tags_from_note(note);
			this.get('tags').trigger('update');
			this.trigger('note_change');
		}.bind(this), 'board:model:notes:remove');
		this.bind_relational('notes', 'reset', function() {
			if(!this._track_tags) return false;
			this.get('tags').refresh_from_notes(this.get('notes'));
			this.get('tags').trigger('update');
			this.trigger('note_change');
		}.bind(this), 'board:model:notes:reset');
		this.bind_relational('notes', 'change:tags', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').diff_tags_from_note(note);
			this.get('tags').trigger('update');
			this.trigger('note_change');
		}.bind(this), 'board:model:notes:change:tags');
		this.bind_relational('notes', 'change', function(note) {
			this.trigger('note_change');
		}.bind(this), 'board:model:notes:change');

		// make category tags auto-update when tags do
		this.bind_relational('tags', 'update', function() {
			if(!this._track_tags) return false;
			var cats = this.get('categories');
			var tags = this.get('tags');
			cats.each(function(c) {
				if(c.update_tags(tags))
				{
					c.trigger('update');
				}
			});
		}.bind(this));

		this.bind('destroy', function() {
			// remove the board from the user's keys (only if it's the only
			// instance of this board)
			var others	=	turtl.profile.get('boards').select({id: this.id()});
			if(others.length == 0) turtl.user.remove_user_key(this.id());

			// remove the project's sort from the user data
			var sort		=	Object.clone(turtl.user.get('settings').get_by_key('board_sort').value());
			sort[this.id()]	=	99999;
			turtl.user.get('settings').get_by_key('board_sort').value(sort);
		}.bind(this));

		this.bind('change', this.track_sync.bind(this));

		// if the privs change such that we are no longer a board member then
		// DESTROY the VALUE OF THE board (by not filing de patent! it is *very
		// important* that you file de patent and put de button on de website
		// or de VC not put de money in de company!!!)
		this.bind('change:privs', function() {
			if(this.get('shared', false))
			{
				// board was UNshared from us
				var persona	=	this.get_shared_persona();
				if(!persona)
				{
					barfr.barf('The board "'+ this.get('title') + '" is no longer shared with you.');
					this.destroy({skip_remote_sync: true});
				}
			}
			else
			{
				// this is our board, but let's make the personas match the privs
				var privs		=	this.get('privs');
				var personas	=	this.get('personas').filter(function(p) {
					return privs[p.id()] && !privs[p.id()].deleted && privs[p.id()].perms > 0;
				});
				this.get('personas').reset(personas);
			}
		}.bind(this));

		// MIGRATE: move board user keys into user data. this code should exist
		// as long as the database has ANY records with board.keys.u
		if(!turtl.user.find_user_key(this.id(true)) && !this.is_new() && this.key)
		{
			turtl.user.add_user_key(this.id(true), this.key);
			var keys	=	this.get('keys').toJSON();
			keys		=	keys.filter(function(k) {
				return k.u != turtl.user.id();
			});
			this.set({keys: keys});
			this.save();
		}
	},

	track_tags: function(yesno)
	{
		this._track_tags = yesno;
	},

	get_url: function()
	{
		var url	=	this.id(true) ?
			'/boards/'+this.id() :
			'/boards/users/'+turtl.user.id();
		return url;
	},

	share_with: function(from_persona, to_persona, permissions, options)
	{
		options || (options = {});

		// must be 0-2
		permissions	=	parseInt(permissions);

		turtl.api.put('/boards/'+this.id()+'/invites/persona/'+to_persona.id(), {
			permissions: permissions,
			from_persona: from_persona.id()
		}, {
			success: function(priv) {
				var privs	=	Object.clone(this.get('privs', {}));
				privs[to_persona.id()]	=	priv;
				this.set({privs: privs});
				this.get('personas').add(to_persona);
				turtl.profile.track_sync_changes(this.id());
				if(options.success) options.success.apply(this, arguments);
			}.bind(this),
			error: function(err) {
				if(options.error) options.error(err);
			}
		});
	},

	accept_share: function(persona, options)
	{
		options || (options = {});

		turtl.api.put('/boards/'+this.id()+'/persona/'+persona.id(), {}, {
			success: function(board) {
				if(turtl.profile.get('boards').find_by_id(board.id))
				{
					// board's already shared with them, must be a double invite.
					// ignore.
					if(options.success) options.success();
					return;
				}

				// save the board key into the user's data
				turtl.user.add_user_key(this.id(), this.key);
				var _notes = board.notes;
				delete board.notes;
				board.shared	=	true;
				this.set(board);

				// add this project to the end of the user's list
				var sort		=	Object.clone(turtl.user.get('settings').get_by_key('board_sort').value());
				sort[this.id()]	=	99999;
				turtl.user.get('settings').get_by_key('board_sort').value(sort);

				turtl.profile.get('boards').add(this);
				this.update_notes(_notes);
				// sync the new board as if it came through in a /sync POST
				if(window.port) window.port.send('profile-sync', {
					user: turtl.user.toJSON(),
					boards: [board],
					notes: _notes
				});
				if(options.success) options.success();
			}.bind(this),
			error: options.error
		});
	},

	leave_board: function(persona, options)
	{
		options || (options = {});

		turtl.api._delete('/boards/'+this.id()+'/persona/'+persona.id(), {}, {
			success: function() {
				// track the sync twice: once in a while wires will get crossed
				// and a board we *just left* will come through in a sync that
				// start just before leaving. this way, if we track the board
				// pre and post sync, if a second sync comes through right after
				// leaving with the board info AGAIN, it'll be ignored.
				this.track_sync();
				turtl.profile.bind('sync-post', function() {
					turtl.profile.unbind('sync-post', 'profile:track_sync:board:'+this.id());
					this.track_sync();
				}.bind(this), 'profile:track_sync:board:'+this.id());

				// destroy our local copy
				this.destroy({skip_remote_sync: true});

				if(options.success) options.success();
			}.bind(this),
			error: function(err) {
				if(options.error) options.error(err);
			}
		});
	},

	/**
	 * Pull out the persona, belonging to the currently logged-in user, that has
	 * the highest privileges on this board. If the only entries are ones with
	 * p == 0 then we return false.
	 */
	get_shared_persona: function()
	{
		var persona		=	false;
		var privs		=	this.get('privs');
		var high_priv	=	0;
		if(!privs) return false;
		turtl.user.get('personas').each(function(p) {
			if(!privs[p.id()]) return;
			var this_privs	=	privs[p.id()].perms;
			if(this_privs > high_priv)
			{
				persona		=	p;
				high_priv	=	this_privs;
			}
		});
		return persona;
	},

	share_enabled: function()
	{
		var shared	=	false;
		var privs	=	this.get('privs');
		Object.each(privs, function(v, k) {
			if(v && v.perms > 0 && !v.deleted) shared = true;
		});
		return shared;
	},

	destroy_submodels: function()
	{
		var notes = this.get('notes');
		var tags = this.get('tags');
		var cats = this.get('categories');

		notes.each(function(n) { n.destroy({skip_remote_sync: true}); n.unbind(); });
		tags.each(function(t) { t.destroy({skip_remote_sync: true}); t.unbind(); });
		cats.each(function(c) { c.destroy({skip_remote_sync: true}); c.unbind(); });
		notes.clear();
		tags.clear();
		cats.clear();
	},

	destroy: function(options)
	{
		options || (options = {});
		var success = options.success;
		options.success = function()
		{
			this.destroy_submodels();
			if(success) success.apply(this, arguments);
		}.bind(this);
		return this.parent.apply(this, [options]);
	},

	get_selected_tags: function()
	{
		return this.get('tags').select(function(tag) {
			return this.is_tag_selected(tag);
		}.bind(this));
	},

	get_excluded_tags: function()
	{
		return this.get('tags').select(function(tag) {
			return this.is_tag_excluded(tag);
		}.bind(this));
	},

	get_tag_by_name: function(tagname)
	{
		return this.get('tags').find(function(tag) { return tag.get('name') == tagname; });
	},

	is_tag_selected: function(tag)
	{
		return tag ? tag.get('selected') : false;
	},

	is_tag_excluded: function(tag)
	{
		return tag ? tag.get('excluded') : false;
	},

	track_sync: function()
	{
		turtl.profile.track_sync_changes(this.id());
	}
}, Protected);

var Boards = SyncCollection.extend({
	model: Board,
	local_table: 'boards',

	sortfn: function(a, b)
	{
		var psort	=	turtl.user.get('settings').get_by_key('board_sort').value() || {};
		var a_sort	=	psort[a.id()] || psort[a.id()] === 0 ? psort[a.id()] : 99999;
		var b_sort	=	psort[b.id()] || psort[b.id()] === 0 ? psort[b.id()] : 99999;
		var sort	=	a_sort - b_sort;
		if(sort != 0)
		{
			return sort;
		}
		else
		{
			return a.id().localeCompare(b.id());
		}
	},

	clear: function(options)
	{
		options || (options = {});
		this.each(function(board) {
			board.clear(options);
		});
		return this.parent.apply(this, arguments);
	},

	save: function()
	{
		console.log('save: board: mem -> db');
		return this.parent.apply(this, arguments);
	},

	sync_record_to_api: function()
	{
		console.log('sync: board: db -> api');
		return this.parent.apply(this, arguments);
	},
	sync_from_api: function(_, data)
	{
		if(data && data.length > 0) console.log('sync: board: api -> db');
		return this.parent.apply(this, arguments);
	},

	process_local_sync: function(board_data, board)
	{
		console.log('sync: board: db -> mem', board_data.id, board_data.cid);
		// process some user/board key stuff. when the user first adds a board,
		// its key is saved in the user's data with the board's CID. it stays
		// this way until the board is posted to the API and gets a real ID. we
		// need to sniff out this situation and flip the cid to an id for the
		// board key (if detected)
		var key	=	turtl.user.find_user_key(board_data.cid);
		if(key && board_data.id && !board_data.deleted)
		{
			console.log('board: got key, write settings');
			turtl.user.remove_user_key(board_data.cid);
			turtl.user.add_user_key(board_data.id, key);
		}

		if(board_data.deleted)
		{
			if(board) board.destroy({skip_remote_sync: true});
		}
		else if(board)
		{
			if(board_data.user_id && board_data.user_id != turtl.user.id())
			{
				board_data.shared	=	true;
			}
			board.set(board_data);
		}
		else
		{
			// make sure this isn't a rogue/shared board sync. sometimes a
			// shared board will sync AFTER it's deleted, bringing us here.
			// luckily, we can detect it via board.shared == true, and
			// board.privs.does_not_contain(any_of_my_personas).
			if(board_data.shared)
			{
				var persona_ids		=	turtl.user.get('personas').map(function(p) { return p.id(); });
				var has_my_persona	=	false;
				Object.keys(board_data.privs).each(function(pid) {
					if(persona_ids.contains(pid)) has_my_persona = true;
				});

				// board is shared, and I'm not on the guest list. not sure
				// why I got an invite telling me to join a board I'm not
				// actually invited to, but let's save ourselves the heart-
				// break and skip out on this one
				if(!has_my_persona) return false;
			}
			var board	=	new Board(board_data);
			if(board_data.cid) board._cid = board_data.cid;
			this.upsert(board);
		}
	}
});
