var NoteViewController = Composer.Controller.extend({
	className: 'note-view content',

	elements: {
		'ul.dropdown': 'dropdown_menu'
	},

	events: {
		'click .actions a.menu': 'open_menu',
		'mouseleave ul.dropdown': 'close_menu',
		'click ul.dropdown a.edit': 'open_edit',
		'click ul.dropdown a.delete': 'delete_note'
	},

	model: null,
	project: null,

	init: function()
	{
		if(!this.model) return false;

		this.render();
		modal.open(this.el);
		modal.objects.container.addClass('bare');
		var modalclose = function() {
			modal.objects.container.removeClass('bare');
			modal.removeEvent('close', modalclose);
		}.bind(this);
		modal.addEvent('close', modalclose);

		this.model.bind('change', this.render.bind(this), 'note:view:render');
		this.model.bind('destroy', this.release.bind(this), 'note:view:destroy');
	},

	release: function()
	{
		modal.close();
		this.model.unbind('change', 'note:view:render');
		this.model.unbind('destroy', 'note:view:destroy');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/view/index', {
			note: toJSON(this.model)
		});
		content = view.make_links(content);
		this.html(content);
		this.el.className = 'note-view content '+this.model.get('type');
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
		this.release();
		new NoteEditController({
			project: this.project,
			note: this.model
		});
	},

	delete_note: function(e)
	{
		if(e) e.stop();
		if(confirm('Really delete this note FOREVER?!'))
		{
			this.model.destroy();
		}
	}
});
