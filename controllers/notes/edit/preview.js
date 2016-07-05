var NotesEditPreviewController = Composer.Controller.extend({
	model: null,
	modal_opts: null,

	init: function()
	{
		if(!this.model) return;
		this.render();
	},

	render: function()
	{
		this.track_subcontroller('note', function() {
			return new NotesViewController({
				model: this.model,
				modal_opts: this.modal_opts,
				title: i18next.t('Note preview'),
				hide_actions: true
			});
		}.bind(this));
	}
});

