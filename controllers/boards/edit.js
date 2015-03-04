var BoardsEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
	},

	model: null,

	init: function()
	{
		if(!this.model) this.model = new Board();
		this.action = this.model.is_new() ? 'Add': 'Edit';
		this.parent();
		this.render();

		var url = '/boards/' + this.action.toLowerCase() + '/' + (this.model.is_new() ? '' : this.model.id());
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		turtl.push_title(this.action + ' board', '/');
		this.bind('release', turtl.pop_title.bind(turtl, false));
		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		this.html(view.render('boards/edit', {
			action: this.action,
			board: this.model.toJSON()
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

		var keypromise = Promise.resolve();
		if(this.model.is_new())
		{
			this.model.generate_key();
			keypromise = turtl.profile.get('keychain').add_key(this.model.id(), 'board', this.model.key);
		}

		var clone = this.model.clone();
		clone.set({title: title});
		keypromise.bind(this)
			.then(function() {
				return clone.save();
			})
			.then(function() {
				this.model.set(clone.toJSON());
				turtl.profile.get('boards').upsert(this.model);
				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem update that board', err);
				log.error('board: edit: ', this.model.id(), derr(err));
			});
	}
});

