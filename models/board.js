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
			collection: 'Notes',
			forward_events: true
		},
		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		}
	},

	public_fields: [
		'id',
		'keys',
		'privs',
		'personas',
		'body',
		'sort'
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
				barfr.barf('The board "'+ this.get('title') + '" is no longer shared with you.');
				if(!persona) this.destroy({skip_sync: true});
			}
			else
			{
				// this is our board, but let's make the personas match the privs
				var privs		=	this.get('privs');
				var personas	=	this.get('personas').filter(function(p) {
					return privs[p.id()] && !privs[p.id()].d && privs[p.id()].p > 0;
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
			this.save_keys();
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
		this.get('notes').reset_async(note_data, {
			silent: true,
			complete: function() {
				this.get('notes').trigger('reset');
				this.track_tags(true);
				this.get('tags').refresh_from_notes(this.get('notes'), {silent: true});
				this.get('tags').trigger('reset');
				this.trigger('notes_updated');
				if(options.complete) options.complete();
			}.bind(this)
		})
	},

	save: function(options)
	{
		options || (options = {});
		var url	=	this.id(true) ?
			'/boards/'+this.id() :
			'/boards/users/'+turtl.user.id();
		var fn		=	(this.id(true) ? turtl.api.put : turtl.api.post).bind(turtl.api);
		var data	=	this.toJSON();
		if(!data.keys || (data.keys.length == 0))
		{
			// empty string gets converted to enpty array by the API for the keys
			// type (this is the only way to serialize an empty array via 
			// mootools' Request AJAX class)
			data.keys	=	'';
		}
		fn(url, {data: data}, {
			success: function(data) {
				this.set(data);
				if(options.success) options.success(data);
			}.bind(this),
			error: function(e) {
				if(options.error) options.error(e);
			}
		});
	},

	save_keys: function(options)
	{
		options || (options = {});
		var data	=	{};
		data.keys	=	this.toJSON().keys;
		if(!data.keys || data.keys.length == 0)
		{
			// empty string gets converted to enpty array by the API for the keys
			// type (this is the only way to serialize an empty array via 
			// mootools' Request AJAX class)
			data.keys	=	'';
		}

		turtl.api.put('/boards/'+this.id(), {data: data}, {
			success: function(data) {
				this.set(data);
				if(options.success) options.success(data);
			}.bind(this),
			error: function(e) {
				barfr.barf('Error saving board: '+ e);
				if(options.error) options.error(e);
			}
		});
	},

	share_with: function(persona, permissions, options)
	{
		options || (options = {});

		// must be 0-2
		permissions	=	parseInt(permissions);

		turtl.api.put('/boards/'+this.id()+'/invites/persona/'+persona.id(), {permissions: permissions}, {
			success: options.success,
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
				this.destroy({skip_sync: true});

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
			var this_privs	=	privs[p.id()].p;
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
			if(v.p > 0 && !v.d) shared	=	true;
		});
		return shared;
	},

	destroy_submodels: function()
	{
		var notes = this.get('notes');
		var tags = this.get('tags');
		var cats = this.get('categories');

		notes.each(function(n) { n.destroy({skip_sync: true}); n.unbind(); });
		tags.each(function(t) { t.destroy({skip_sync: true}); t.unbind(); });
		cats.each(function(c) { c.destroy({skip_sync: true}); c.unbind(); });
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

var Boards = Composer.Collection.extend({
	model: Board,

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

	load_boards: function(boards, options)
	{
		options || (options = {});
		var tally	=	0;
		var nboards	=	boards.length;

		// tracks the completion of note updating for each board.
		var complete	=	function()
		{
			tally++;
			if(tally >= nboards && options.complete)
			{
				options.complete();
			}
		};

		if(nboards > 0)
		{
			boards.each(function(bdata) {
				var notes = bdata.notes;
				delete bdata.notes;
				var board = new Board(bdata);
				bdata.notes = notes;
				this.add(board, options);
				// this is async (notes added one by one), so track completion
				board.update_notes(notes, Object.merge({}, options, {complete: complete}));
			}.bind(this));
		}
		else
		{
			complete();
		}
	}
});
