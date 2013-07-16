var NoteMoveController = Composer.Controller.extend({
	elements: {
		'select[name=board]': 'inp_select'
	},

	events: {
		'change select': 'select_board',
		'click select': 'select_board'  	// keeps modal from closing on select
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

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var boards = tagit.profile.get('boards').map(function(p) {
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
		if(e.type == 'click') return false;		// fuck you, click
		var bid = this.inp_select.get('value');
		var curbid = this.note.get('board_id');
		if(curbid == bid) return false;

		var boardfrom = tagit.profile.get('boards').find_by_id(curbid);
		var boardto = tagit.profile.get('boards').find_by_id(bid);
		if(!boardfrom || !boardto) return false;

		this.note.set({board_id: bid});
		this.note.generate_subkeys([
			{b: bid, k: boardto.key}
		]);

		tagit.loading(true);
		this.note.save({
			success: function(note_data) {
				modal.close();
				tagit.loading(false);
				this.note.set(note_data);
				boardfrom.get('notes').remove(this.note);
				//boardfrom.get('tags').trigger('change:selected');
				boardto.get('notes').add(this.note);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was a problem moving your note: '+ e);
				tagit.loading(false);
			}
		});
	}
});
