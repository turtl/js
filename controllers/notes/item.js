var NoteItemController = Composer.Controller.extend({
	tag: 'li',
	className: 'note',

	elements: {
		'ul.dropdown': 'dropdown_menu'
	},

	events: {
		'click .actions a.open': 'view_note',
		'click .actions a.menu': 'open_menu',
		'mouseleave ul.dropdown': 'close_menu',
		'click ul.dropdown a.edit': 'open_edit',
		'click ul.dropdown a.delete': 'delete_note'
	},

	project: null,
	note: null,
	display_type: 'grid',

	init: function()
	{
		if(!this.note) return;
		this.note.bind('change', this.render.bind(this), 'note:item:change:render');
		this.note.bind('destroy', this.release.bind(this), 'note:item:destroy:release');
		this.render();
	},

	release: function()
	{
		this.note.unbind('change', 'note:item:change:render');
		this.note.unbind('destroy', 'note:item:destroy:release');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/list/index', {
			note: toJSON(this.note)
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
		this.el.className = 'note ' + this.note.get('type');
	},

	view_note: function(e)
	{
		if(e) e.stop();
		new NoteViewController({
			note: this.note
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
			project: this.project,
			note: this.note
		});
	},

	delete_note: function(e)
	{
		if(e) e.stop();
		if(confirm('Really delete this note FOREVER?!'))
		{
			this.note.destroy();
		}
	}
});
