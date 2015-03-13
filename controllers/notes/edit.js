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

		var data = {};
		var errors = [];

		var title = this.inp_title.get('value');
		var url = this.inp_url.get('value');
		var text = this.inp_text.get('value');

		var keypromise = Promise.resolve();
		if(this.model.is_new())
		{
			keypromise = this.model.init_new({board_id: this.board_id, silent: true});
		}

		var clone = this.model.clone();
		clone.set(data);
	}
});

