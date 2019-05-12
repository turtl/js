const NotesEmbedController = Composer.Controller.extend({
	class_name: 'embed-note',
	xdom: true,

	elements: {
		'.note-container': 'note_container',
	},

	model: null,
	prohibit_open: false,

	init: function() {
		this.render()
			.bind(this)
			.then(function() {
				this.sub('embed', function() {
					return new NotesItemController({
						tag: 'div',
						inject: this.note_container,
						model: this.model,
						// we want embedded notes to display like view notes
						extra_class: 'view',
						prohibit_open: this.prohibit_open,
					});
				}.bind(this));
			});
	},

	render: function() {
		return this.html(view.render('notes/embed', {}));
	},
});

