var BoardsEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
		'click a[rel=move]': 'move_board',
		'click a[rel=delete]': 'delete_board',
	},

	modal: null,
	model: null,
	space: null,
	formclass: 'boards-edit',

	init: function() {
		if(!this.model) {
			this.model = new Board();
			this.bind('release', this.model.unbind.bind(this.model));
		}
		this.space = this.model.get_space() || turtl.profile.current_space();

		var perm_map = {
			add: Permissions.permissions.add_board,
			edit: Permissions.permissions.edit_board,
		};
		if(!permcheck(this.space, perm_map[this.model.is_new() ? 'add' : 'edit'])) return this.release();

		var title = this.model.is_new() ?
			i18next.t('Create board in {{space}}', {space: this.space.get('title')}) :
			i18next.t('Edit board');
		this.action = i18next.t('Save');

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
		var show_move = !this.model.is_new()
			&& this.space.can_i(Permissions.permissions.delete_board);
		var show_delete = !this.model.is_new()
			&& this.space.can_i(Permissions.permissions.delete_board);
		this.html(view.render('boards/edit', {
			action: this.action,
			board: this.model.toJSON(),
			show_move: show_move,
			show_delete: show_delete,
		}));
		if(this.model.is_new()) {
			this.inp_title.focus.delay(300, this.inp_title);
		}
	},

	submit: function(e) {
		if(e) e.stop();
		var title = this.inp_title.get('value').toString().trim();

		var clone = this.model.clone();
		clone.set({title: title});
		clone.save()
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());
				turtl.profile.get('boards').upsert(this.model);
				this.trigger('close');
				turtl.route('/spaces/'+this.space.id()+'/boards/'+this.model.id()+'/notes');
				clone.unbind();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that board'), err);
				log.error('board: edit: ', this.model.id(), derr(err));
			});
	},

	move_board: function(e) {
		if(e) e.stop();
		this.trigger('close');
		new BoardsMoveController({
			model: this.model,
		});
	},

	delete_board: function(e) {
		if(e) e.stop();
		if(!permcheck(this.space, Permissions.permissions.delete_board)) return;
		if(!confirm(i18next.t('Really delete this board and all of its notes?'))) return;
		var board_id = this.model.id();
		this.model.destroy({delete_notes: true})
			.bind(this)
			.then(function() {
				if(turtl.param_router.get().board_id == board_id) {
					turtl.route('/spaces/'+this.space.id()+'/notes');
				}
				this.trigger('close');
			})
			.catch(function(err) {
				log.error('board: delete: ', derr(err));
				barfr.barf(i18next.t('There was a problem deleting your board: {{message}}', {message: err.message}));
			});
	},
});

