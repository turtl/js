const NotesEditEditorController = Composer.Controller.extend({
	xdom: true,

	elements: {
		'textarea[name=text]': 'inp_text',
		'.editor': 'el_editor',
	},

	model: null,
	skip_resize_text: false,
	use_wysiwyg: false,
	editor: false,
	view_state: {
		text_height: null,
	},

	init: function() {
		if(!this.model) throw new Error('note editor: bad model given');
		this.render()
			.bind(this)
			.then(function() {
				setTimeout(this.resize_text.bind(this), 50);
				if(!this.skip_resize_text) {
					var resizer = this.resize_text.bind(this);
					window.addEvent('resize', resizer);
					this.bind('release', window.removeEvent.bind(window, 'resize', resizer));
				}

				if(this.use_wysiwyg) {
					this.editor = new Quill(this.el_editor, {
						theme: 'snow',
					});
				}
			});
	},

	render: function() {
		return this.html(view.render('notes/edit/editor', {
			state: this.view_state,
			wysiwyg: this.use_wysiwyg,
			note: this.model.toJSON(),
		}));
	},

	text: function() {
		if(this.use_wysiwyg) {
			return this.editor.root.innerHTML;
		} else {
			return this.inp_text.get('value');
		}
	},

	resize_text: function() {
		const form = Composer.find_parent('form', this.el);
		if(!form) return;
		const form_bottom = form.getCoordinates().bottom;
		const button_row = form.getElement('.button-row');
		const btn_top = button_row.getCoordinates().top;

		if(this.use_wysiwyg) {
			const ql_editor = this.el_editor.getElement('.ql-editor');
			var diff = btn_top - form_bottom;
			var txt_height = ql_editor.getCoordinates().height;
			var height = txt_height + diff;
			if(height < 80) height = 80;
			ql_editor.setStyle('height', height+'px');

		} else {
			var diff = btn_top - form_bottom;
			var txt_height = this.inp_text.getCoordinates().height;
			var height = txt_height + diff;
			if(height < 80) height = 80;
			this.view_state.text_height = height;
			this.render();
		}
	},
});

