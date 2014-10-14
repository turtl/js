var NoteViewController = BaseNoteItem.extend({
	className: 'note-view notes content',

	elements: {
	},

	events: {
	},

	model: null,
	board: null,

	init: function()
	{
		if(!this.model) return;
		this.parent.apply(this, arguments);
		this.render();

		turtl.push_title(this.model.get('title') || 'Note', '#modal.close');
		modal.open(this.el);
		modal.objects.container.addClass('bare');
		var modalclose = function() {
			modal.objects.container.removeClass('bare');
			modal.removeEvent('close', modalclose);
			this.release();
		}.bind(this);
		modal.addEvent('close', modalclose);

		turtl.keyboard.bind('e', this.open_edit.bind(this), 'notes:view:shortcut:edit_note');
		turtl.keyboard.bind('m', this.open_move.bind(this), 'notes:view:shortcut:move_note');
		turtl.keyboard.bind('delete', this.delete_note.bind(this), 'notes:view:shortcut:delete_note');
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		turtl.pop_title();
		turtl.keyboard.unbind('e', 'notes:view:shortcut:edit_note');
		turtl.keyboard.unbind('m', 'notes:view:shortcut:move_note');
		turtl.keyboard.unbind('delete', 'notes:view:shortcut:delete_note');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		return this.parent.call(this, 'view', 'note-view notes content');
	} 
});

