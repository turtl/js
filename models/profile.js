var Profile = Composer.RelationalModel.extend({
	relations: {
		keychain: {
			type: Composer.HasMany,
			collection: 'Keychain'
		},
		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		},
		boards: {
			type: Composer.HasMany,
			collection: 'Boards'
		},
		notes: {
			type: Composer.HasMany,
			collection: 'Notes',
			options: {
				forward_all_events: true,
				refresh_on_change: false
			}
		}
	},

	// stores whether or not all profile data has been downloaded
	profile_loaded: false,

	init: function()
	{
		this.bind_relational('boards', ['remove', 'destroy'], function(board) {
			if(this.get_current_board() == board)
			{
				this.set_current_board(this.get('boards').first());
			}
		}.bind(this));
		this.bind_relational('boards', 'add', function(board) {
			if(this.get('boards').models().length == 1)
			{
				this.set_current_board(board);
			}
		}.bind(this));
	},

	/**
	 * Load everything but notes/files into the profile
	 */
	load: function()
	{
		turtl.remote.send('grab-profile', {}, {
			success: function(ev) {
				this.set(ev.data);
			}.bind(this)
		});
	},

	get_current_board: function()
	{
		var cur = this.get('current_board', false);
		if(!cur) cur = this.get('boards').first();
		return cur;
	},

	set_current_board: function(obj, options)
	{
		options || (options = {});
		return this.set({current_board: obj}, options);
	}
});

