var BoardsItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',

	elements: {
		'.board-actions': 'actions',
		'span.count': 'el_note_count'
	},

	events: {
		'click': 'open_board',
		'click .menu a[rel=edit]': 'open_edit',
		'click .menu a[rel=delete]': 'open_delete',
	},

	model: null,
	search: {},

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model, 'navigate', this.open_board.bind(this));
	},

	render: function()
	{
		var board_id = this.model.id();
		var data = this.model.toJSON();
		data.title = (data.title || i18next.t('(untitled board)')).replace(/</g, '&lt;').replace(/>/g, '&gt;');
		if(this.search.filter)
		{
			var regex = new RegExp(escape_regex(this.search.filter), 'gi');
			data.title = data.title.replace(regex, function(match) {
				return '<highlight>'+match+'</highlight>';
			});
		}
		this.html(view.render('boards/item', {
			board: data,
		})).bind(this)
			.then(function() {
				if(!this.el) return;
				this.el.set('rel', this.model.id());

				var actions = [{name: 'Edit'}, {name: 'Delete'}];
				if(actions.length)
				{
					this.track_subcontroller('actions', function() {
						return new ItemActionsController({
							inject: this.actions,
							actions: actions
						});
					}.bind(this));
				}

				// grab the note count (async)
				this.model.note_count().bind(this)
					.then(function(num_notes) {
						if(!this.el_note_count) return;
						this.el_note_count.set('html', num_notes);
					});
			});
	},

	open_board: function(e)
	{
		if(e && (Composer.find_parent('.board-actions', e.target) || Composer.find_parent('.status a', e.target)))
		{
			return;
		}
		if(e) e.stop();
		// TODO: use /spaces/<spaceid>/boards/<boardid>/notes
		turtl.route('/boards/'+this.model.id()+'/notes');
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new BoardsEditController({
			model: this.model
		});
	},

	open_delete: function(e)
	{
		if(e) e.stop();
		new BoardsDeleteController({
			model: this.model
		});
	},
});

