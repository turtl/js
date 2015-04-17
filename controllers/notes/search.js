var NotesSearchController = Composer.Controller.extend({
	class_name: 'search',

	modal: null,
	search: {},

	init: function()
	{
		this.modal = new TurtlModal({
			class_name: 'turtl-modal search',
			show_header: true,
			title: 'Search notes'
		});
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		this.html(view.render('notes/search', {
		}));
	}
});

