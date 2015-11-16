var NotesEditPreviewController = Composer.Controller.extend({
	model: null,

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
				title: 'Note preview',
				hide_actions: true
			});
		}.bind(this));
	}
});

