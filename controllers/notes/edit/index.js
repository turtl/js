var NotesEditController = FormController.extend({
	elements: {
		'.boards-container': 'el_boards',
		'.notes-container': 'el_notes',
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'textarea[name=text]': 'inp_text'
	},

	events: {
		'click ul.colors li': 'switch_color'
	},

	modal: null,

	model: null,
	clone: null,
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
		this.clone = this.model.clone();

		this.action = this.model.is_new() ? 'Add' : 'Edit';
		this.parent();

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action + ' ' + this.type + ' note'
		});

		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.bind('release', function() {
			Autosize.destroy(this.inp_text);
		}.bind(this));
	},

	render: function()
	{
		var type = this.model.get('type') || this.type;
		var colors = ['none','blue','red','green','purple','pink','brown','black'];
		var data = this.model.toJSON();
		if(!data.color) delete data.color;
		Autosize.destroy(this.inp_text);
		this.html(view.render('notes/edit/index', {
			note: data,
			show_url: ['image', 'link'].contains(type),
			type: this.model.get('type') || this.type,
			colors: colors
		}));

		this.track_subcontroller('tags', function() {
			return new NotesEditTagsController({
				inject: this.el_tags
			});
		}.bind(this));

		if(this.model.is_new())
		{
			var focus_el = null;
			switch(this.type)
			{
				case 'text': focus_el = this.inp_text; break;
				case 'link': focus_el = this.inp_url; break;
				case 'image': focus_el = this.inp_url; break;
			}
			if(focus_el) setTimeout(focus_el.focus.bind(focus_el), 10);
		}
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

		var clone = this.clone;
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
	},

	switch_color: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('ul.colors li', e.target);
		if(!li) return;
		this.el.getElements('ul.colors li').each(function(el) { el.removeClass('sel'); });
		var color = parseInt(li.get('rel'));
		if(color > 0)
		{
			li.addClass('sel');
		}
		this.clone.set({color: color});
	}
});

