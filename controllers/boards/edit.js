var BoardsEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
	},

	modal: null,

	model: null,
	formclass: 'boards-edit',

	init: function()
	{
		if(!this.model) this.model = new Board();
		this.action = this.model.is_new() ? 'Create': 'Edit';
		this.parent();

		var child = '';
		if(this.model.get('parent_id')) child = ' child';

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action + child + ' board'
		});

		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));

		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		var parent = null, parent_id = null;
		if(parent_id = this.model.get('parent_id'))
		{
			parent = turtl.profile.get('boards').find_by_id(parent_id).toJSON();
		}
		this.html(view.render('boards/edit', {
			action: this.action,
			board: this.model.toJSON(),
			parent: parent
		}));
		if(this.model.is_new())
		{
			this.inp_title.focus.delay(300, this.inp_title);
		}
	},

	submit: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value').toString().trim();

		var errors = [];
		if(!title) errors.push('Please give your board a title');

		if(errors.length)
		{
			barfr.barf(errors.join('<br>'));
			return;
		}

		var keypromise = Promise.resolve();
		if(this.model.is_new())
		{
			keypromise = this.model.init_new({silent: true})
		}

		var clone = this.model.clone();
		clone.set({title: title});
		keypromise.bind(this)
			.then(function() {
				return clone.save();
			})
			.then(function() {
				this.model.set(clone.toJSON());

				// add the board to our main board list
				turtl.profile.get('boards').upsert(this.model);

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem updating that board', err);
				log.error('board: edit: ', this.model.id(), derr(err));
			});
	}
});

