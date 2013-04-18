var NoteItemController = Composer.Controller.extend({
	tag: 'li',
	className: 'note',

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
		var content = Template.render('notes/list/'+this.note.get('type'), {
			note: toJSON(this.note)
		});

		// do some custom mods here (for shame)
		var title = content.replace(/[\s\S]*?(<h1>[\s\S]*<\/h1>)[\s\S]*/i, '$1');
		content = content.replace(/([\s\S]*?)<h1>[\s\S]*<\/h1>([\s\S]*)/i, '$1$2');

		if(content == title)
		{
			if(title.match(/<h1[^>]+>/i))
			{
				content = '';
			}
			else
			{
				title = '';
			}
		}

		content = content.replace(/<(?!\/?(img|a))(.*?)>/g, ' ');
		content = '<div class="gutter">'+ title + '<p>'+content+'</p></div>';

		content = content.replace(/"([\w]+):(\/\/([\.\-\w_\/:\?\+\&#=%,]+))/gi, '"$1::$2"');
		content = content.replace(/[\w]+:\/\/([\.\-\w_\/:\?\+\&#=%,]+)/gi, '<a target="_blank" href="$1">$1</a>');
		content = content.replace(/"([\w]+)::(\/\/([\.\-\w_\/:\?\+\&#=%,]+))/gi, '"$1:$2"');

		this.html(content);
		this.el.className = 'note ' + this.note.get('type');
	}
});
