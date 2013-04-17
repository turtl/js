var NoteEditTagController = Composer.Controller.extend({
	elements: {
		'input[name=tag]': 'inp_tag'
	},

	events: {
		'keydown input[name=tag]': 'add_tag_key',
		'click input.add': 'add_tag_btn',
		'click ul li': 'select_tag'
	},

	project: null,
	note: null,

	suggested_tags: [],

	init: function()
	{
		// TODO: pre-populate suggested tags
		this.render();
		this.note.bind_relational('tags', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'note:edit:tags:change');
	},

	release: function()
	{
		this.note.bind_relational('tags', ['add', 'remove', 'reset', 'change'], 'note:edit:tags:change');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/edit_tags', {
			note: toJSON(this.note),
			suggested_tags: this.suggested_tags
		});
		this.html(content);
	},

	add_tag_btn: function(e)
	{
		var tag = this.inp_tag.value.clean().toLowerCase();
		var tags = tag.split(/, ?/g);
		tags.each(function(tag) {
			if(tag.clean() == '') return;
			this.note.add_tag(tag.clean().toLowerCase());
			this.suggested_tags.push(tag);
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
		var tag = li.get('html').clean().toLowerCase();
		if(li.hasClass('sel'))
		{
			this.note.remove_tag(tag);
		}
		else
		{
			this.note.add_tag(tag);
		}
	}
});

