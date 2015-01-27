var BoardEditController = FormController.extend({
	elements: {
		'input[type="text"]': 'inp_title'
	},

	events: {
		'click .settings a[href=#delete]': 'delete_board'
	},

	board: null,

	// if true, brings up an inline-editing interface
	show_settings: false,

	modal: true,
	title: false,
	formclass: 'board-edit',
	action: 'Save',

	init: function()
	{
		if(!this.board) this.board = new Board();
		var action = this.board.is_new() ? 'Add' : 'Edit';
		this.title = [this.title ? this.title : action + ' board', '/'];
		this.parent();
	},

	render: function()
	{
		var content = view.render('boards/edit', {
			board: toJSON(this.board),
			action: this.board.is_new() ? 'Add' : 'Edit',
			title: this.title,
			show_settings: this.show_settings
		});
		this.html(content);
		(function() { this.inp_title.focus(); }).delay(100, this);
	},

	submit: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value');
		if(title.clean() == '') return false;

		var success = null;
		var promise = null;
		if(this.board.is_new())
		{
			this.board = new Board({title: title});
			this.board.generate_key();
			this.board.generate_subkeys();
			// save the board key to the keychain *before* we save the board
			promise = turtl.profile.get('keychain').add_key(this.board.id(), 'board', this.board.key);

			success = function() {
				var boards = turtl.profile.get('boards');
				if(boards) boards.add(this.board);
				this.trigger('new-board', this.board);
			}.bind(this);
		}
		else
		{
			this.board.set({title: title});
			promise = Promise.resolve(true);
		}
		turtl.loading(true);
		promise.bind(this)
			.then(function() {
				return this.board.save();
			})
			.then(function() {
				if(success) success();
				this.release();
			})
			.catch(function(err) {
				log.error('Problem saving the board: ', err);
				barfr.barf('There was a problem saving your board: '+ err);
			})
			.finally(function() {
				turtl.loading(false);
			});
	},

	delete_board: function(e)
	{
		if(!e) return;
		e.stop();
		if(!this.board) return;
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		turtl.loading(true);
		this.board.destroy()
			.then(this.releae.bind(this))
			.catch(function(err) {
				log.error('Problem deleting the board: ', err);
			})
			.finally(function() {
				turtl.loading(false);
			});
	},

	cancel: function(e)
	{
		if(e) e.stop();
		this.release();
	}
});

