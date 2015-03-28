var BoardsDeleteController = FormController.extend({
	elements: {
		'input[name=notes]': 'inp_delete_notes'
	},

	events: {
		'click .button.delete': 'submit',
		'click .button.cancel': 'cancel'
	},

	modal: null,

	buttons: true,
	formclass: 'boards-delete',

	init: function()
	{
		if(!this.model) return this.release();
		this.action = 'Delete';
		this.parent();

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action + ' board'
		});

		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));

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

		var parent_name = '';
		var parent_id = this.model.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		if(parent) parent_name = parent.get('title') + '/';

		this.html(view.render('boards/delete', {
			board: this.model.toJSON(),
			parentname: parent_name,
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

