var NoteViewController = Composer.Controller.extend({
	className: 'note-view',

	note: null,

	init: function()
	{
		if(!this.note) return false;

		this.render();
		modal.open(this.el);
		modal.objects.container.addClass('bare');
		var modalclose = function() {
			modal.objects.container.removeClass('bare');
			modal.removeEvent('close', modalclose);
		};
		modal.addEvent('close', modalclose);

		this.note.bind('change', this.render.bind(this), 'note:view:render');
	},

	release: function()
	{
		this.note.unbind('change', 'note:view:render');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/view/index', {
			note: toJSON(this.note)
		});
		this.html(content);
		this.el.className = 'note-view '+this.note.get('type');
	}
});
