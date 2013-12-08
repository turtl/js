var NoteMoveController = Composer.Controller.extend({
	elements: {
		'select[name=board]': 'inp_select'
	},

	events: {
		'change select': 'select_board'
	},

	note: null,
	board: null,

	init: function()
	{
		if(!this.note || !this.board) return false;

		this.render();

		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var boards = turtl.profile.get('boards').map(function(p) {
			return {id: p.id(), title: p.get('title')};
		});
		//boards.sort(function(a, b) { return a.title.localeCompare(b.title); });
		var content = Template.render('notes/move', {
			note: toJSON(this.note),
			boards: boards
		});
		this.html(content);
	},

	select_board: function(e)
	{
		if(e) e.stop();
		var bid = this.inp_select.get('value');
		var curbid = this.note.get('board_id');
		if(curbid == bid) return false;

		var boardfrom = turtl.profile.get('boards').find_by_id(curbid);
		var boardto = turtl.profile.get('boards').find_by_id(bid);
		if(!boardfrom || !boardto) return false;

		// save our note's keys in case something goes...awry
		var keys		=	this.note.get('keys');

		this.note.set({board_id: bid}, {silent: true});
		this.note.generate_subkeys([
			{b: bid, k: boardto.key}
		], {silent: true});

		turtl.loading(true);
		this.note.save({
			success: function(note) {
				turtl.loading(false);
				modal.close();
			}.bind(this),
			error: function(e) {
				barfr.barf('There was a problem moving your note: '+ e);
				turtl.loading(false);
				// restore our note's keys
				this.note.set({keys: keys, board_id: curbid});
			}.bind(this)
		});
	}
});
