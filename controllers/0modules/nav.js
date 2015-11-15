var NavController = Composer.Controller.extend({
	inject: '#nav',
	tag: 'ul',

	nav: [
		{url: '/', name: 'Notes', icon: 'notes'},
		{url: '/boards', name: 'Boards', icon: 'boards'},
		{url: '/sharing', name: 'Sharing', icon: 'share'},
	],

	init: function()
	{
		this.render();
		this.with_bind(turtl.router, 'route', this.update_nav.bind(this));
		this.bind('release', function() { $('nav').removeClass('show'); });
	},

	render: function()
	{
		this.html(view.render('modules/nav', {
			nav: this.nav
		}));
		$('nav').addClass('show');
	},

	update_nav: function()
	{
		this.el.getElements('.sel').forEach(function(el) { el.removeClass('sel'); });
		var url = window.location.pathname;
		this.nav.forEach(function(item) {
			var selected = false;
			if(item.url == '/boards')
			{
				if(url.indexOf(item.url) == 0) selected = true;
			}
			else
			{
				if(url == item.url) selected = true;
			}


			if(selected)
			{
				var atag = this.el.getElement('a[href='+item.url+']');
				var li = Composer.find_parent('li', atag);
				if(!li || !atag) return;
				li.addClass('sel');
			}
		}.bind(this));
	}
});

