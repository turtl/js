var NotesEditTagsListController = Composer.Controller.extend({
	events: {
		'click ul.tags li': 'toggle_tag'
	},

	model: null,
	collection: null,

	init: function()
	{
		if(!this.collection || !this.model) return this.release();

		this.render();

		this.with_bind(this.collection, ['add', 'remove', 'change', 'reset'], this.render.bind(this));
		this.with_bind(this.model.get('tags'), ['add', 'remove', 'change', 'reset'], this.render.bind(this));
	},

	render: function()
	{
		var mtags = this.model.get('tags');
		var tags = this.collection.toJSON()
			.map(function(tag) {
				tag = {name: tag};
				tag.selected = !!mtags.find_by_id(tag.name); 
				return tag;
			});
		this.html(view.render('notes/edit/tags/list', {
			tags: tags
		}));
	},

	toggle_tag: function(e)
	{
		if(e) e.stop();
		try
		{
			var name = Composer.find_parent('ul.tags > li', e.target).getElement('span').get('html').trim();
			name = decode_entities(name);
		}
		catch(_) { return; }

		var tags = this.model.get('tags');
		var exists = tags.find_by_id(name);

		if(exists) tags.remove(exists);
		else tags.add(name);
	}
});

