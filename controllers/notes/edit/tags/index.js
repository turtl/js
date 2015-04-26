var NotesEditTagsController = FormController.extend({
	elements: {
		'.tags-container': 'tags_container',
		'div.editable': 'inp_tags',
		'span.placeholder': 'placeholder'
	},

	events: {
		'keydown div.editable': 'update_tags',
		'click': 'hide_placeholder'
	},

	modal: null,

	model: null,
	clone: null,
	formclass: 'notes-edit-tags',
	button_tabindex: 3,
	action: 'Done',

	collection: null,

	init: function()
	{
		this.clone = this.model.clone();
		this.collection = new Tags();

		this.modal = new TurtlModal({
			show_header: true,
			title: 'Tag note'
		});

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.load_suggested_tags();
	},

	render: function()
	{
		this.html(view.render('notes/edit/tags/index', {}));

		this.track_subcontroller('tags-list', function() {
			return new NotesEditTagsListController({
				inject: this.tags_container,
				model: this.clone,
				collection: this.collection
			});
		}.bind(this));

		// same as .focus() LOL
		this.select.bind(this, 0, 0).delay(100);
	},

	load_suggested_tags: function()
	{
		var boards = this.clone.get('boards') || [];
		return turtl.search.search({boards: boards}).bind(this)
			.spread(function(_, suggested_tags) {
				var mtags = this.clone.get('tags');
				suggested_tags = suggested_tags
					// get rid of tags in the model already
					.filter(function(tag) {
						return !mtags.find_by_id(tag.name);
					})
					.sort(function(a, b) {
						var sort = b.count - a.count;
						if(sort == 0)
						{
							sort = a.name.localeCompare(b.name);
						}
						return sort;
					})
					.slice(0, 24);
				this.collection.reset(mtags.toJSON().concat(suggested_tags));
			});
	},

	submit: function(e)
	{
		if(e) e.stop();

		this.model.get('tags').reset(this.clone.get('tags').toJSON());
		this.trigger('close');
	},

	hide_placeholder: function(e)
	{
		if(this.placeholder) this.placeholder.remove();
		if(!e) return;
		this.select(0, 0);
	},

	update_tags: function(e)
	{
		this.hide_placeholder();

		if(['enter', ','].indexOf(e.key) < 0) return;

		e.stop();
		var inner = this.inp_tags.get('html');
		var tags = inner.split(',')
			.map(function(t) { return t.clean().replace(/&nbsp;/g, ''); })
			.filter(function(t) { return !!t; });
		this.inp_tags.set('html', '');
		this.clone.get('tags').upsert(tags);
		this.collection.upsert(tags);
		this.select(0, 0);
	},

	select: function(from, to)
	{
		select_text(this.inp_tags, from, to);
	}
});

