var NotesMoveController = FormController.extend({
	xdom: true,

	elements: {
		'select[name=space_id]': 'inp_space',
		'select[name=board_id]': 'inp_board',
	},

	events: {
		'input select[name=space_id]': 'select_space',
		'input select[name=board_id]': 'select_board',
	},

	modal: null,
	model: null,
	formclass: 'notes-move',

	viewstate: {
		selected_space_id: null,
		selected_board_id: null,
	},

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('notes: move: no model passed');
		}
		this.space = this.model.get_space();
		if(!this.space) {
			this.release();
			throw new Error('notes: move: no space found');
		}

		if(!permcheck(this.space, Permissions.permissions.delete_note)) return this.release();

		var title = i18next.t('Move note to another space');
		this.action = i18next.t('Move');

		this.modal = new TurtlModal({
			show_header: true,
			title: title,
		});

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function() {
		var note = this.model.toJSON();
		var spaces = turtl.profile.get('spaces').toJSON()
			.filter(function(space) { return space.id != note.space_id; });
		if(!this.viewstate.selected_space_id) {
			this.viewstate.selected_space_id = spaces[0].id;
		}
		var selected_space = this.viewstate.selected_space_id;
		var boards = turtl.profile.get('boards').toJSON()
			.filter(function(b) { return b.space_id == selected_space; });
		this.html(view.render('notes/move', {
			note: note,
			spaces: spaces,
			boards: boards,
			selected_space: selected_space,
			selected_board: this.viewstate.selected_board_id,
		}));
	},

	submit: function(e) {
		if(e) e.stop();
		var cur_space_id = this.model.get('space_id');
		var space_id = this.inp_space.get('value');
		var board_id = this.inp_board.get('value');
		var space = turtl.profile.get('spaces').get(space_id);
		if(!space_id || !space) {
			barfr.barf(i18next.t('There was a problem moving that note.'));
			return;
		}
		if(!space.can_i(Permissions.permissions.add_note)) {
			barfr.barf(i18next.t('You do not have permissions to move notes to that space.'));
			return;
		}
		if(cur_space_id == space_id) {
			this.trigger('close');
			return;
		}
		this.disable(true);
		var clone = this.model.clone();
		turtl.loading(true);
		clone.move_spaces(space_id, board_id || null)
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());
				this.trigger('close');
				barfr.barf(i18next.t('Note moved successfully.'));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem moving that note.'), err);
				log.error('note: move: ', this.model.id(), derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.disable(false);
			});
	},

	select_space: function(e) {
		var space_id = this.inp_space.get('value');
		if(!space_id) return;
		this.viewstate.selected_space_id = space_id;
		this.render();
	},

	select_board: function(e) {
		var board_id = this.inp_board.get('value');
		if(!board_id) return;
		this.viewstate.selected_board_id = board_id;
		this.render();
	},
});


