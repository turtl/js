var NavController = Composer.Controller.extend({
	inject: '#nav',
	tag: 'ul',

	elements: {
	},

	events: {
		'click li': 'activate_nav'
	},

	nav: [
		{url: '/', name: "All notes", icon: 'notes'},
		{url: '/boards', name: 'Boards', icon: 'boards'},
	],

	init: function()
	{
		this.render();
		this.with_bind(turtl.controllers.pages, 'start', this.update_nav.bind(this));
		this.bind('release', function() { $('nav').removeClass('show'); });
		this.setup_scroll();
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
	},

	setup_scroll: function(e)
	{
		var attach = $('wrap');
		var nav = $('nav');

		var state = 'fixed';
		var last = 0;
		var coords = nav.getCoordinates();
		var original_top = coords.top;
		var nav_height = coords.height;
		var transition_top = 0;

		var update_state = function(scroll)
		{
			var top;
			switch(state)
			{
			case 'transition-out':
				top = (original_top + transition_top) - scroll;
				break;
			case 'transition-in':
				top = (transition_top) - scroll;
				break;
			case 'fixed':
				top = '';
				break;
			case 'hide':
				top = 0;
				break;
			}
			if(top && top > original_top)
			{
				state = 'fixed';
				top = '';
			}
			if(top && top < original_top && scroll < original_top && state == 'transition-in')
			{
				state = 'fixed';
				top = '';
			}
			nav.setStyles({top: top});
		}.bind(this);
		update_state();

		var scrollbind = function(e)
		{
			var scroll = attach.scrollTop;
			var navtop = parseInt(nav.getStyle('top'));
			if(scroll > last && state =='fixed')
			{
				state = 'transition-out';
				transition_top = last;
			}
			if(scroll < last && state == 'hide')
			{
				state = 'transition-in';
				transition_top = scroll;
			}
			if(scroll > (transition_top + original_top) && state == 'transition-out')
			{
				state = 'hide';
			}
			if(scroll < (transition_top - original_top) && state.match(/^transition/))
			{
				state = 'fixed';
			}
			if(scroll <= 0)
			{
				state = 'fixed';
			}

			update_state(scroll);
			last = scroll;
		};

		attach.addEventListener('scroll', scrollbind);
		this.bind('release', function() {
			attach.removeEventListener('scroll', scrollbind);
		}.bind(this));
	},

	activate_nav: function(e)
	{
		var li = Composer.find_parent('li', e.target, this.el);
		if(!li) return;
		this.el.getElements('li').each(function(el) { el.removeClass('sel'); });
		li.addClass('sel');
	}
});

