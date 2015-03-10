var BoardsDeleteController = FormController.extend({
	elements: {
		'input[name=notes]': 'inp_delete_notes'
	},

	events: {
		'click .button.delete': 'submit',
		'click a.cancel': 'cancel'
	},

	buttons: false,
	formclass: 'boards-delete',

	init: function()
	{
		if(!this.model) return this.release();
		this.action = 'Delete';
		this.parent();
		this.render();

		var url = '/boards/' + this.action.toLowerCase() + '/' + this.model.id();
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		turtl.push_title(this.action + ' board', turtl.last_url);
		this.bind('release', turtl.pop_title.bind(null, false));
		this.bind(['cancel', 'close'], close);
		this.with_bind(this.model, 'destroy', close);
	},

	render: function()
	{
		var bid = this.model.id();
		var children = turtl.profile.get('boards')
			.filter(function(board) {
				return board.get('parent_id') == bid;
			})
			.map(function(board) { return board.toJSON(); });
		this.html(view.render('boards/delete', {
			board: this.model.toJSON(),
			children: children,
			count: children.length + 1
		}));
	},

	submit: function(e)
	{
		if(e) e.stop();
		var delete_notes = this.inp_delete_notes.get('checked');
		this.model.destroy({delete_notes: delete_notes})
			.catch(function(err) {
				log.error('board: delete: ', derr(err));
				barfr.barf('There was a problem deleting your board: '+ err.message);
			});
	}
});

