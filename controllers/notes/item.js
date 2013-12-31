var NoteItemController = Composer.Controller.extend({
	tag: 'li',
	className: 'note',

	elements: {
		'ul.dropdown': 'dropdown_menu'
	},

	events: {
		'mouseenter': 'select_note',
		'mouseleave': 'unselect_note',
		'click .actions a.sort': 'cancel',
		'click .actions a.open': 'view_note',
		'click .actions a.menu': 'open_menu',
		'mouseleave ul.dropdown': 'close_menu',
		'mouseenter ul.dropdown': 'cancel_close_menu',
		'click ul.dropdown a.edit': 'open_edit',
		'click ul.dropdown a.move': 'open_move',
		'click ul.dropdown a.delete': 'delete_note',
		'click a.attachment': 'download_attachment'
	},

	board: null,
	model: null,
	display_type: 'grid',
	menu_close_timer: null,

	init: function()
	{
		if(!this.model) return;
		this.model.bind('change', this.render.bind(this), 'note:item:change:render');
		this.model.bind('destroy', this.release.bind(this), 'note:item:destroy:release');
		this.render();

		this.menu_close_timer		=	new Timer(200);
		this.menu_close_timer.end	=	this.do_close_menu.bind(this);
	},

	release: function()
	{
		this.model.unbind('change', 'note:item:change:render');
		this.model.unbind('destroy', 'note:item:destroy:release');
		this.menu_close_timer.end	=	null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var note_data	=	toJSON(this.model);
		if(!note_data.text && !note_data.url && !note_data.embed && note_data.file && note_data.file.blob_url && note_data.file.type.match(/^image/))
		{
			note_data.type	=	'image';
			note_data.url	=	note_data.file.blob_url;
			note_data.file.blob_url	=	null;
		}
		var content = Template.render('notes/list/index', {
			note: note_data
		});

		var title = '';

		content = view.make_links(content);
		this.html(content);
		this.el.className = 'note ' + note_data.type;
		this.el.className += ' id_'+ this.model.id();
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
	},

	open_menu: function(e)
	{
		if(e) e.stop();
		this.dropdown_menu.addClass('open');
	},

	do_close_menu: function()
	{
		this.dropdown_menu.removeClass('open');
	},

	close_menu: function(e)
	{
		this.menu_close_timer.start();
	},

	cancel_close_menu: function(e)
	{
		this.menu_close_timer.stop();
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
			turtl.loading(true);
			this.model.destroy({
				success: function() { turtl.loading(false); },
				error: function(_, err) {
					turtl.loading(false);
					barfr.barf('There was a problem deleting the note: '+ err);
				}
			});
		}
	},

	download_attachment: function(e)
	{
		if(e) e.stop();
		var win	=	window.open('about:blank');
		this.model.get('file').to_blob({
			success: function(blob) {
				var url	=	URL.createObjectURL(blob);
				win.location	=	url;
				var monitor		=	function()
				{
					if(win.closed)
					{
						console.log('REVOKE!!');
						URL.revokeObjectURL(url);
						return false;
					}
					monitor.delay(100, this);
				};
				monitor();
			}
		});
	}
});
