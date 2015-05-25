var MarkdownFormattingHelpController = Composer.Controller.extend({
	modal: null,

	init: function()
	{
		this.modal = new TurtlModal({
			show_header: true,
			title: 'Editing in markdown'
		});

		this.render();

		this.modal.open(this.el);

		var close = this.modal.close.bind(this.modal);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		this.html(view.render('help/markdown'));
	}
});

