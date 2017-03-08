var NavController = Composer.Controller.extend({
	inject: '#nav',
	tag: 'div',

	elements: {
	},

	events: {
		'click': 'activate_nav'
	},

	init: function()
	{
		this.render();
		this.with_bind(turtl.controllers.pages, 'start', this.render.bind(this));
		this.bind('release', function() { $('nav').removeClass('show'); });
		this.setup_scroll();
	},

	render: function()
	{
		var path = turtl.router.cur_path();
		var is_in_space = path.match(/^\/spaces\/([0-9a-f]+)\//);
		var is_in_notes = path.match(/\/notes$/);
		var is_listing_boards = path.match(/\/boards$/);
		var board_regex = /.*\/boards\/([0-9a-f]+)\/notes$/;
		var is_in_board = path.match(board_regex);
		var board_id = path.replace(board_regex, '$1');

		var title = '';
		if(is_in_space && is_in_board) {
			var board = turtl.profile.get('boards').get(board_id);
			if(!board) title = i18next.t('Boards');
			else title = board.get('title');
		} else if(is_in_space && is_listing_boards) {
			title = i18next.t('Boards');
		} else if(is_in_space && is_in_notes) {
			title = i18next.t('All notes');
		} else {
			$('nav').removeClass('show');
			return;
		}

		this.html(view.render('modules/nav', {
			title: title
		}));
		$('nav').addClass('show');
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

