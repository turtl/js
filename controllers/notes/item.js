var NoteItemController = BaseNoteItem.extend({
	tag: 'li',
	className: 'note',

	elements: {
	},

	events: {
		'mouseenter': 'select_note',
		'mouseleave': 'unselect_note',
		'click .actions a.sort': 'cancel',
		'click .actions a.open': 'view_note',
	},

	model: null,
	board: null,

	init: function()
	{
		if(!this.model) return;
		this.parent.apply(this, arguments);
		this.render();
	},

	release: function()
	{
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		return this.parent.call(this, 'list', 'note id_'+this.model.id());
	},

	select_note: function(e)
	{
		this.model.set({selected: true}, {silent: true});
	},

	unselect_note: function(e)
	{
		this.model.unset('selected', {silent: true});
	},

	cancel: function(e) { if(e) e.stop(); },

	view_note: function(e)
	{
		if(e) e.stop();
		new NoteViewController({
			model: this.model,
			board: this.board,
		});
	}
});

