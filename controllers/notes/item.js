var NoteItemController = Composer.Controller.extend({
	tag: 'li',

	note: null,

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
		var content = Template.render('notes/types/'+this.note.get('type'), {
			note: toJSON(this.note)
		});
		this.html(content);
	}
});
