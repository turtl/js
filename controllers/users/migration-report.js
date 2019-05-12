const UserMigrationReportController = Composer.Controller.extend({
	xdom: true,
	class_name: 'migration-report',

	elements: {
	},

	events: {
	},

	modal: null,
	model: null,

	errors: null,

	init: function()
	{
		const context = turtl.context.grab(this);
		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: i18next.t('Migration report'),
			actions: [],
			skip_close_on_pageload: true,
			context: context,
		}, this.modal_opts && this.modal_opts() || {}));
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
		this.with_bind(context, 'esc', close);
	},

	render: function()
	{
		return this.html(view.render('users/migration-report', {
			errors: this.errors,
		}));
	},
});

