var SyncController = Composer.Controller.extend({
	element: {
	},

	events: {
	},

	init: function()
	{
		if(!turtl.files) return false;

		turtl.files.bind('all', this.render.bind(this), 'sync:files:all:render');
		this.render_icon();
		this.render();
	},

	release: function()
	{
		turtl.files.unbind('all', 'sync:files:all:render');
		return this.parent.apply(this, arguments);
	},

	render: function(ev)
	{
		console.log('sync: ', ev);
	},

	render_icon: function()
	{
		if($('sync-icon')) return false;
		var icon	=	new Element('icon').set('id', 'sync-icon').set('html', '&#xE800;');
		icon.inject(document.body, 'top');
		$('sync-icon').addEvent('click', this.toggle_info.bind(this));
	},

	toggle_info: function()
	{
	}
});

