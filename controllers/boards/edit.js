var BoardsEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
	},

	model: null,
	formclass: 'boards-edit',

	init: function()
	{
		if(!this.model) this.model = new Board();
		this.action = this.model.is_new() ? 'Create': 'Edit';
		this.parent();
		this.render();

		var url = '/boards/' + this.action.toLowerCase() + '/' + (this.model.is_new() ? '' : this.model.id());
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		var child = '';
		if(this.model.get('parent_id')) child = ' child';

		turtl.push_title(this.action + child + ' board', '/');
		this.bind('release', turtl.pop_title.bind(null, false));
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
		if(this.model.is_new()) this.inp_title.focus.delay(10, this.inp_title);
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

		var parent_id = this.model.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		var keypromise = Promise.resolve();
		if(this.model.is_new())
		{
			this.model.generate_key();
			keypromise = turtl.profile.get('keychain').add_key(this.model.id(), 'board', this.model.key);
			if(parent)
			{
				// if we have a parent board, make sure the child can decrypt
				// its key via the parent's
				this.model.generate_subkeys([
					{b: parent.id(), k: parent.key}
				]);
			}
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

				// also add the board ot our parent's board list, if we have one
				if(parent) parent.get('boards').upsert(this.model);

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem update that board', err);
				log.error('board: edit: ', this.model.id(), derr(err));
			});
	}
});

