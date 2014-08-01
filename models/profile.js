var Profile = Composer.RelationalModel.extend({
	relations: {
		keychain: {
			collection: 'Keychain'
		},
		personas: {
			collection: 'Personas'
		},
		boards: {
			collection: 'Boards'
		},
		notes: {
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
		this.bind('change:current_board', function(board) {
			this.get('boards').each(function(b) { b.unload(); });
			var board = this.get_current_board();
			if(board) board.load({
				success: function() {
					this.trigger('board-loaded');
				}.bind(this)
			});
		}.bind(this));
		this.bind('loaded', function() {
			this.profile_loaded = true;
		}.bind(this));
		this.bind('clear', function() {
			this.profile_loaded = false;
		}.bind(this));
	},

	/**
	 * Load everything but notes/files into the profile
	 */
	load: function()
	{
		turtl.remote.send('grab-profile', {}, {
			success: function(data) {
				this.set(data);
				this.trigger('loaded');
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

