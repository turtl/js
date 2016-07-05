var MarkdownFormattingHelpController = Composer.Controller.extend({
	modal: null,
	modal_opts: null,

	init: function()
	{
		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: i18next.t('Editing in markdown')
		}, this.modal_opts && this.modal_opts() || {}));

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

