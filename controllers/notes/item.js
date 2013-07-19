var NoteItemController = Composer.Controller.extend({
	tag: 'li',
	className: 'note',

	elements: {
		'ul.dropdown': 'dropdown_menu'
	},

	events: {
		'mouseenter': 'select_note',
		'mouseleave': 'unselect_note',
		'click .actions a.open': 'view_note',
		'click .actions a.menu': 'open_menu',
		'mouseleave ul.dropdown': 'close_menu',
		'click ul.dropdown a.edit': 'open_edit',
		'click ul.dropdown a.move': 'open_move',
		'click ul.dropdown a.delete': 'delete_note'
	},

	board: null,
	model: null,
	display_type: 'grid',

	init: function()
	{
		if(!this.model) return;
		this.model.bind('change', this.render.bind(this), 'note:item:change:render');
		this.model.bind('destroy', this.release.bind(this), 'note:item:destroy:release');
		this.render();
	},

	release: function()
	{
		this.model.unbind('change', 'note:item:change:render');
		this.model.unbind('destroy', 'note:item:destroy:release');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/list/index', {
			note: toJSON(this.model)
		});

		var title = '';
		//if(this.display_type == 'list')
		//{
		//	// do some custom mods here (for shame)
		//	title = content.replace(/[\s\S]*?(<h1>[\s\S]*<\/h1>)[\s\S]*/i, '$1');
		//	content = content.replace(/([\s\S]*?)<h1>[\s\S]*<\/h1>([\s\S]*)/i, '$1$2');

		//	if(content == title)
		//	{
		//		if(title.match(/<h1[^>]+>/i))
		//		{
		//			content = '';
		//		}
		//		else
		//		{
		//			title = '';
		//		}
		//	}

		//	content = content.replace(/<(?!\/?(img|a))(.*?)>/g, ' ');
		//}

		content = view.make_links(content);
		this.html(content);
		this.el.className = 'note ' + this.model.get('type');
	},

	select_note: function(e)
	{
		this.model.set({selected: true}, {silent: true});
	},

	unselect_note: function(e)
	{
		this.model.unset('selected', {silent: true});
	},

	view_note: function(e)
	{
		if(e) e.stop();
		new NoteViewController({
			model: this.model,
			board: this.board,
		});
	},

	open_menu: function(e)
	{
		if(e) e.stop();
		this.dropdown_menu.addClass('open');
	},

	close_menu: function(e)
	{
		this.dropdown_menu.removeClass('open');
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			board: this.board,
			note: this.model
		});
	},

	open_move: function(e)
	{
		if(e) e.stop();
		new NoteMoveController({
			board: this.board,
			note: this.model
		});
	},

	delete_note: function(e)
	{
		if(e) e.stop();
		if(confirm('Really delete this note FOREVER?!'))
		{
			tagit.loading(true);
			this.model.destroy({
				success: function() { tagit.loading(false); },
				error: function(_, err) {
					tagit.loading(false);
					barfr.barf('There was a problem deleting the note: '+ err);
				}
			});
		}
	}
});
