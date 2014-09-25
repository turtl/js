var NoteEditTagController = Composer.Controller.extend({
	elements: {
		'input[name=tag]': 'inp_tag'
	},

	events: {
		'keydown input[name=tag]': 'add_tag_key',
		'click input.add': 'add_tag_btn',
		'click ul li': 'select_tag'
	},

	board: null,
	note: null,

	suggested_tags: [],

	init: function()
	{
		if(!this.board) return false;

		var load_suggestions = function()
		{
			this.suggested_tags = toJSON(this.board.get('tags'))
				.sort(function(a, b) {
					var diff = b.count - a.count;
					// secondary alpha sort
					if(diff == 0) diff = a.name.localeCompare(b.name);
					return diff;
				})
				.map(function(t) { return t.name; });
			this.render();
		}.bind(this);
		this.board.bind_relational('tags', ['add', 'remove', 'reset', 'change'], load_suggestions, 'note:edit:suggested_tags');
		this.note.bind_relational('tags', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'note:edit:tags:change');
		load_suggestions();
	},

	release: function()
	{
		this.board.unbind_relational('tags', ['add', 'remove', 'reset', 'change'], 'note:edit:suggested_tags');
		this.note.unbind_relational('tags', ['add', 'remove', 'reset', 'change'], 'note:edit:tags:change');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/edit_tags', {
			note: toJSON(this.note),
			suggested_tags: this.suggested_tags.slice(0, 20)
		});
		this.html(content);
		new Autocomplete(this.inp_tag, this.suggested_tags, {});
	},

	add_tag_btn: function(e)
	{
		var tag = this.inp_tag.value.clean().toLowerCase();
		var tags = tag.split(/, ?/g);
		tags.each(function(tag) {
			tag = tag.clean();
			if(tag == '') return;
			if(this.note.add_tag(view.tagetize(tag)) && !this.suggested_tags.contains(view.tagetize(tag)))
			{
				this.suggested_tags.push(view.tagetize(tag));
			}
		}.bind(this));
		this.inp_tag.value = '';
		(function() {
			this.inp_tag.focus();
		}.bind(this)).delay(10, this);
	},

	add_tag_key: function(e)
	{
		if(!e || !e.key || e.key != 'enter') return;
		e.stop();
		this.add_tag_btn();
	},

	select_tag: function(e)
	{
		if(!e) return false;
		e.stop();
		var li = next_tag_up('li', e.target);
		var tag = view.tagetize(li.get('html'));
		if(this.note.get('tags').find(function(t) {
			return t.get('name') == tag;
		}))
		{
			this.note.remove_tag(tag);
		}
		else
		{
			this.note.add_tag(tag);
		}
	}
});

