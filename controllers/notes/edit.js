var NotesEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'textarea[name=text]': 'inp_text'
	},

	events: {
	},

	model: null,
	formclass: 'notes-edit',
	button_tabindex: 9,

	type: 'text',
	board_id: null,

	init: function()
	{
		if(this.board_id == 'all') this.board_id = null;

		if(!this.model) this.model = new Note({
			boards: (this.board_id ? [this.board_id] : []),
			type: this.type || 'text'
		});
		this.action = this.model.is_new() ? 'Add' : 'Edit';
		this.parent();
		this.render();

		var url = '/notes/' + this.action.toLowerCase() + '/' + (this.model.is_new() ? '' : this.model.id());
		var close = turtl.push_modal_url(url, {prefix: 'modal2', add_url: true});
		modal2.open(this.el);
		this.with_bind(modal2, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		turtl.push_title(this.action + ' ' + this.type + ' note', turtl.last_url);
		this.bind('release', turtl.pop_title.bind(null, false));
		this.bind('release', function() {
			Autosize.destroy(this.inp_text);
		}.bind(this));

		var focus = null;
		switch(this.type)
		{
			case 'text': focus = this.inp_text; break;
			case 'link': focus = this.inp_url; break;
			case 'image': focus = this.inp_url; break;
		}
		if(focus) setTimeout(focus.focus.bind(focus), 10);
	},

	render: function()
	{
		var type = this.model.get('type') || this.type;
		Autosize.destroy(this.inp_text);
		this.html(view.render('notes/edit', {
			note: this.model.toJSON(),
			show_url: ['image', 'link'].contains(type),
			type: this.model.get('type') || this.type
		}));

		if(this.inp_text) setTimeout(function() { autosize(this.inp_text); }.bind(this), 10);
	},

	submit: function(e)
	{
		if(e) e.stop();

		var errors = [];

		var title = this.inp_title.get('value');
		var url = this.inp_url && this.inp_url.get('value');
		var text = this.inp_text.get('value');

		var data = {
			title: title,
			url: url,
			text: text
		};

		var keypromise = Promise.resolve();
		if(this.model.is_new())
		{
			keypromise = this.model.init_new({board_id: this.board_id, silent: true});
		}

		var clone = this.model.clone();
		clone.set(data);
		keypromise.bind(this)
			.then(function() {
				return clone.save();
			})
			.then(function() {
				this.model.set(clone.toJSON());

				// add the note to our main note list
				turtl.profile.get('notes').upsert(this.model);
				turtl.search.reindex_note(this.model);

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem updating that note', err);
				log.error('note: edit: ', this.model.id(), derr(err));
			});
	}
});

