var BoardsMoveController = FormController.extend({
	elements: {
		'select[name=space_id]': 'inp_space',
	},

	events: {
	},

	modal: null,
	model: null,
	formclass: 'boards-move',

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('boards: move: no model passed');
		}
		this.space = this.model.get_space();
		if(!this.space) {
			this.release();
			throw new Error('boards: move: no space found');
		}

		if(!permcheck(this.space, Permissions.permissions.delete_board)) return this.release();
		if(!permcheck(this.space, Permissions.permissions.delete_note)) return this.release();

		var title = i18next.t('Move board to another space');
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
		var board = this.model.toJSON();
		var spaces = turtl.profile.get('spaces').toJSON()
			.filter(function(space) { return space.id != board.space_id; });
		this.html(view.render('boards/move', {
			board: board,
			spaces: spaces,
		}));
	},

	submit: function(e) {
		if(e) e.stop();
		var cur_space_id = this.model.get('space_id');
		var space_id = this.inp_space.get('value');
		var space = turtl.profile.get('spaces').get(space_id);
		if(!space_id || !space) {
			barfr.barf(i18next.t('There was a problem moving that board.'));
			return;
		}
		if(!space.can_i(Permissions.permissions.add_board) || !space.can_i(Permissions.permissions.add_note)) {
			barfr.barf(i18next.t('You do not have permissions to move boards/notes to that space.'));
			return;
		}
		if(cur_space_id == space_id) {
			this.trigger('close');
			return;
		}
		var clone = this.model.clone();
		barfr.barf('This process can take a while.');
		turtl.loading(true);
		this.disable(true);
		clone.move_spaces(space_id)
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());
				var cur_board_id = turtl.param_router.get().board_id;
				var board_id = this.model.id();
				this.trigger('close');
				if(cur_board_id == board_id) {
					turtl.route('/spaces/'+space_id+'/boards/'+board_id+'/notes');
				}
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem moving that board.'), err);
				log.error('board: move: ', this.model.id(), derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.disable(false);
			});
	},
});


