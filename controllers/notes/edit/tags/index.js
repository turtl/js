var NotesEditTagsController = FormController.extend({
	elements: {
		'.tags-container': 'tags_container',
		'input[name=tags]': 'inp_tags',
		'span.placeholder': 'placeholder'
	},

	events: {
		'input input[name=tags]': 'update_tags',
		'keydown input[name=tags]': 'update_tags',
		'click': 'hide_placeholder'
	},

	modal: null,

	model: null,
	clone: null,
	formclass: 'notes-edit-tags',
	button_tabindex: 3,

	collection: null,

	init: function()
	{
		// don't allow multiple tag windows
		turtl.events.trigger('notes:edit:tags:open');
		this.with_bind(turtl.events, 'notes:edit:tags:open', this.trigger.bind(this, 'close'));

		if(!this.action) this.action = i18next.t('Save');
		this.clone = this.model.clone();
		this.collection = new Tags();

		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: i18next.t('Tag note')
		}, this.modal_opts && this.modal_opts() || {}));

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.bind('have-suggestions', function(suggested) {
			var tags = suggested.map(function(t) { return t.name; });
			new Autocomplete(this.inp_tags, tags, {});
		}.bind(this));
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

		setTimeout(function() { this.inp_tags.focus(); }.bind(this));
	},

	load_suggested_tags: function()
	{
		var space = turtl.profile.current_space();
		var space_id = space && space.id();
		var board_id = this.clone.get('board_id');
		return turtl.search.search({space: space_id, board: board_id}).bind(this)
			.spread(function(_, suggested_tags) {
				var mtags = this.clone.get('tags');
				suggested_tags = suggested_tags
					// get rid of tags in the model already
					.filter(function(tag) {
						return !mtags.find_by_id(tag.name);
					})
					.sort(function(a, b) {
						var sort = b.count - a.count;
						if(sort == 0) sort = a.name.localeCompare(b.name);
						return sort;
					});
				this.collection.reset(mtags.toJSON().concat(suggested_tags.slice(0, 24)));
				this.trigger('have-suggestions', suggested_tags);
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
		//this.select(0, 0);
	},

	update_tags: function(e)
	{
		this.hide_placeholder();

		var pressed_div_key = ['enter', 'return', ','].indexOf(e.key) >= 0;
		var inner = this.inp_tags.get('value');
		// if the tag box is empty andwe hit enter, do return before we stop the
		// event so the form will submit, which saves the tags and closes the
		// tag selector
		if(inner == '') return;
		if(pressed_div_key) e.stop();

		setTimeout(function() {
			var inner = this.inp_tags.get('value')
			var has_comma = inner.indexOf(',') >= 0;
			if(!(has_comma || pressed_div_key)) {
				return;
			}
			var tags = inner.split(',')
				.map(function(t) { return t.clean().replace(/&nbsp;/g, ''); })
				.filter(function(t) { return !!t; });
			this.clone.get('tags').upsert(tags);
			this.collection.upsert(tags);
			this.inp_tags.set('value', '');
			this.inp_tags.focus();
		}.bind(this));
	}
});

