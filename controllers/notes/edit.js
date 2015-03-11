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

	type: 'text',
	board_id: null,

	autogrow: null,

	init: function()
	{
		if(!this.model) this.model = new Note({
			boards: (this.board_id ? [this.board_id] : []),
			type: this.type || 'text'
		});
		this.action = this.model.is_new() ? 'Add' : 'Edit';
		this.parent();
		this.render();

		var url = '/notes/' + this.action.toLowerCase() + '/' + (this.model.is_new() ? '' : this.model.id());
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		turtl.push_title(this.action + ' ' + this.type + ' note', turtl.last_url);
		this.bind('release', turtl.pop_title.bind(null, false));
		this.bind(['cancel', 'close'], close);
		this.bind('release', function() {
			if(this.autogrow) this.autogrow.detach();
		}.bind(this));

		var focus = null;
		switch(this.type)
		{
			case 'text': focus = this.inp_text; break;
			case 'bookmark': focus = this.inp_url; break;
			case 'image': focus = this.inp_url; break;
		}
		if(focus) setTimeout(focus.focus.bind(focus), 10);
	},

	render: function()
	{
		var type = this.model.get('type') || this.type;
		this.html(view.render('notes/edit', {
			note: this.model.toJSON(),
			show_url: ['image', 'bookmark'].contains(type),
			type: this.model.get('type') || this.type
		}));

		if(this.autogrow) this.autogrow.detach();
		if(this.inp_text)
		{
			this.autogrow = new Autogrow(this.inp_text);
		}
	},

	submit: function(e)
	{
		if(e) e.stop();

		// TODO: set user_id into Note
		// TODO: set user_id into Board (in board edit)
	}
});

