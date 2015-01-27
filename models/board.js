var Board = Composer.RelationalModel.extend({
	base_url: '/boards',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		},
		notes: {
			type: Composer.HasMany,
			filter_collection: 'NotesFilter',
			master: function() { return turtl.profile.get('notes'); },
			options: {
				filter: function(model, notesfilter) {
					return model.get('board_id') == notesfilter.get_parent().id();
				},
				forward_all_events: true,
				refresh_on_change: false
			}
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
		'meta',
		'shared'
	],

	private_fields: [
		'title'
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
			// remove the project's sort from the user data
			var sort = Object.clone(turtl.user.get('settings').get_by_key('board_sort').value());
			sort[this.id()] = 99999;
			turtl.user.get('settings').get_by_key('board_sort').value(sort);
		}.bind(this));

		// if the privs change such that we are no longer a board member then
		// DESTROY the VALUE OF THE board (by not filing de patent! it is *very
		// important* that you file de patent and put de button on de website
		// or de VC not put de money in de company!!!)
		this.bind('change:privs', function() {
			if(this.get('shared', false))
			{
				// board was UNshared from us
				var persona = this.get_shared_persona({privs_only: true});
				if(!persona)
				{
					barfr.barf('The board "'+ this.get('title') + '" is no longer shared with you.');
					this.destroy({skip_remote_sync: true});
				}
			}
			else
			{
				// this is our board, but let's make the personas match the privs
				var privs = this.get('privs');
				var personas = this.get('personas').filter(function(p) {
					return privs[p.id()] && !privs[p.id()].deleted && privs[p.id()].perms > 0;
				});
				this.get('personas').reset(personas);
			}
		}.bind(this));

		// MIGRATE: move board user keys into user data. this code should exist
		// as long as the database has ANY records with board.keys.u
		if(!turtl.profile.get('keychain').find_key(this.id(true)) && !this.is_new() && this.key)
		{
			turtl.profile.get('keychain').add_key(this.id(true), 'board', this.key);
			var keys = this.get('keys').toJSON();
			keys = keys.filter(function(k) {
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

	/**
	 * Given a set of note data, reset this board's notes, async, with said
	 * data.
	 */
	update_notes: function(note_data, options)
	{
		options || (options = {});
		this.get('notes').clear();
		this.track_tags(false);
		return this.get('notes').reset_async(note_data, { silent: true }).bind(this)
			.then(function() {
				this.get('notes').trigger('reset');
				this.track_tags(true);
				this.get('tags').refresh_from_notes(this.get('notes'), {silent: true});
				this.get('tags').trigger('reset');
				this.trigger('notes_updated');
			});
	},

	share_with: function(from_persona, to_persona, permissions, options)
	{
		options || (options = {});

		// must be 0-2
		permissions = parseInt(permissions);

		return turtl.api.put('/boards/'+this.id()+'/invites/persona/'+to_persona.id(), {
			permissions: permissions,
			from_persona: from_persona.id()
		}).bind(this)
			.tap(function(priv) {
				var privs = Object.clone(this.get('privs', {}));
				privs[to_persona.id()] = priv;
				this.set({privs: privs});
				this.get('personas').add(to_persona);
			});
	},

	from_share: function(board_data)
	{
		// add this project to the end of the user's list
		var sort = Object.clone(turtl.user.get('settings').get_by_key('board_sort').value());
		sort[this.id()] = 99999;
		turtl.user.get('settings').get_by_key('board_sort').value(sort);
		turtl.profile.get('keychain').add_key(this.id(), 'board', this.key);

		var _notes = board_data.notes;
		delete board_data.notes;
		board_data.shared = true;
		this.set(board_data);

		turtl.profile.get('boards').add(this);
		return this.save({skip_remote_sync: true}).bind(this)
			.then(function() {
				// save the notes into the board (really, this just adds them to the
				// global turtl.profile.notes collection). once done, we *make sure*
				// the notes are persisted to the local db
				_notes = turtl.sync.process_data({notes: _notes}).notes;
				return this.update_notes(_notes);
			})
			.then(function() {
				this.get('notes').each(function(note) {
					note.save({ skip_remote_sync: true })
						.catch(function(err) {
							log.error('error: boards: from_share: save note: ', err);
						});
				});
				// force a refresh on the board in case it doesn't pick
				// up the changed notes
				(function() {
					turtl.sync.notify_local_change('boards', 'refresh', {id: this.id()}, {track: true});
				}).delay(200, this);
			})
			.catch(function(e) {
				log.error('error: board: from_share: ', e);
				throw e;
			});
	},

	accept_share: function(persona, options)
	{
		options || (options = {});

		return turtl.api.put('/boards/'+this.id()+'/persona/'+persona.id(), {}).bind(this)
			.then(function(board) {
				if(turtl.profile.get('boards').find_by_id(board.id))
				{
					// board's already shared with them, must be a double invite.
					// ignore.
					return;
				}

				// save the board key into the user's data
				turtl.profile.get('keychain').add_key(this.id(), 'board', this.key);

				return this.from_share(board);
			});
	},

	leave_board: function(persona, options)
	{
		options || (options = {});

		return turtl.api._delete('/boards/'+this.id()+'/persona/'+persona.id(), {}).bind(this)
			.then(function(sync_ids) {
				// track the sync twice: once in a while wires will get crossed
				// and a board we *just left* will come through in a sync that
				// start just before leaving. this way, if we track the board
				// pre and post sync, if a second sync comes through right after
				// leaving with the board info AGAIN, it'll be ignored.
				// destroy our local copy
				this.destroy({skip_remote_sync: true});

				// ignore syncs after this UNshare
				if(sync_ids && sync_ids.sync_ids)
				{
					sync_ids.sync_ids.each(function(sync_id) {
						turtl.sync.ignore_on_next_sync(sync_id, {type: 'remote'});
					});
				}
			});
	},

	/**
	 * Pull out the persona, belonging to the currently logged-in user, that has
	 * the highest privileges on this board. If the only entries are ones with
	 * p == 0 then we return false.
	 */
	get_shared_persona: function(options)
	{
		options || (options = {});

		if(!options.privs_only)
		{
			var meta = this.get('meta');
			if(meta && meta.persona)
			{
				var persona = turtl.user.get('personas').find_by_id(meta.persona);
			}
			if(persona) return persona;
		}

		persona = false;
		var privs = this.get('privs');
		var high_priv = 0;
		if(!privs) return false;
		turtl.user.get('personas').each(function(p) {
			if(!privs[p.id()]) return;
			var this_privs = privs[p.id()].perms;
			if(this_privs > high_priv)
			{
				persona = p;
				high_priv = this_privs;
			}
		});
		return persona;
	},

	share_enabled: function()
	{
		var shared = false;
		var privs = this.get('privs');
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

		notes.each(function(n) { n.destroy({skip_remote_sync: true, force_save: true}); n.unbind(); });
		tags.each(function(t) { t.destroy({skip_remote_sync: true}); t.unbind(); });
		cats.each(function(c) { c.destroy({skip_remote_sync: true}); c.unbind(); });
		notes.clear();
		tags.clear();
		cats.clear();
	},

	destroy: function()
	{
		return this.parent.apply(this, arguments)
			.tap(function() {
				this.destroy_submodels();
			}.bind(this));
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
	}
}, Protected);

var Boards = SyncCollection.extend({
	model: Board,
	local_table: 'boards',

	/*
	sortfn: function(a, b)
	{
		var psort = turtl.user.get('settings').get_by_key('board_sort').value() || {};
		var a_sort = psort[a.id()] || psort[a.id()] === 0 ? psort[a.id()] : 99999;
		var b_sort = psort[b.id()] || psort[b.id()] === 0 ? psort[b.id()] : 99999;
		var sort = a_sort - b_sort;
		if(sort != 0)
		{
			return sort;
		}
		else
		{
			return a.id().localeCompare(b.id());
		}
	},
	*/

	init: function()
	{
		this.bind('change:title', function() { this.sort() }.bind(this), 'boards:change:resort');
	},

	sortfn: function(a, b)
	{
		return a.get('title').toLowerCase().localeCompare(b.get('title').toLowerCase());
	},

	clear: function(options)
	{
		options || (options = {});
		this.each(function(board) {
			board.clear(options);
		});
		return this.parent.apply(this, arguments);
	},

	process_local_sync: function(board_data, model, msg)
	{
		var action = msg.action;
		if(_sync_debug_list.contains(this.local_table))
		{
			//log.debug('sync: process_local_sync: '+ this.local_table +': '+ msg.id+ ' ' + action, board_data, model);
			log.info('sync: process_local_sync: '+ this.local_table +': '+ msg.sync_id+ ' ' + action);
		}

		// process some user/board key stuff. when the user first adds a board,
		// its key is saved in the user's data with the board's CID. it stays
		// this way until the board is posted to the API and gets a real ID. we
		// need to sniff out this situation and flip the cid to an id for the
		// board key (if detected)
		var keychain = turtl.profile.get('keychain');
		var key = keychain.find_key(board_data.cid);
		if(key && board_data.id && !board_data.deleted)
		{
			log.debug('board: got CID key, adding ID key (and removing CID key)');
			keychain.add_key(board_data.id, 'board', key);
			keychain.remove_key(board_data.cid);
		}

		if(action == 'delete')
		{
			if(model) model.destroy({skip_local_sync: true, skip_remote_sync: true});
		}
		else if(action == 'refresh')
		{
			var current = turtl.profile.get_current_board();
			if(current && model.id() == current.id())
			{
				current.get('notes').refresh();
			}
		}
		else if(action == 'update')
		{
			if(model)
			{
				if(board_data.user_id && board_data.user_id != turtl.user.id())
				{
					board_data.shared = true;
				}
				model.set(board_data);
				model.trigger('change:privs');
			}
		}
		else if(action == 'create')
		{
			// make sure this isn't a rogue/shared board sync. sometimes a
			// shared board will sync AFTER it's deleted, bringing us here.
			// luckily, we can detect it via board.shared == true, and
			// board.privs.does_not_contain(any_of_my_personas).
			if(board_data.shared)
			{
				var persona_ids = turtl.user.get('personas').map(function(p) { return p.id(); });
				var has_my_persona = false;
				Object.keys(board_data.privs).each(function(pid) {
					if(persona_ids.contains(pid)) has_my_persona = true;
				});

				// board is shared, and I'm not on the guest list. not sure
				// why I got an invite telling me to join a board I'm not
				// actually invited to, but let's save ourselves the heart-
				// break and skip out on this one
				if(!has_my_persona) return false;
			}
			var model = new Board(board_data);
			if(board_data.cid) model._cid = board_data.cid;
			this.upsert(model);
		}
	}
});
