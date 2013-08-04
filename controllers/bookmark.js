var BookmarkController = Composer.Controller.extend({
	inject: tagit.main_container_selector,
	className: 'bookmark modalcontent',

	elements: {
		'div.board': 'board_container',
		'div.edit': 'edit_container'
	},

	linkdata: {
		type: 'link',
		url: '',
		title: '',
		text: ''
	},
	profile: null,

	board_controller: null,
	edit_controller: null,

	init: function()
	{
		if(!window._in_ext)
		{
			this.linkdata = parse_querystring();
		}
		this.render();

		if(window.port) window.port.bind('open', function() {
			(function() {
				var sel	=	this.edit_controller.el.getElement('ul.type li.sel');
				if(!sel) return false;
				this.edit_controller.switch_type({stop: function() {}, target: sel});
			}).delay(100, this);
		}.bind(this));

		this.profile	=	tagit.profile;
		this.profile.bind('change:current_board', function() {
			var board = this.profile.get_current_board();

			tagit.user.get('settings').get_by_key('last_board').value(board.id());
			this.soft_release();

			var note = new Note({
				type: this.linkdata.type,
				url: this.linkdata.url,
				title: this.linkdata.title,
				text: this.linkdata.text
			});
			this.board_controller = new BoardsController({
				inject: this.board_container,
				profile: this.profile
			});
			this.edit_controller = new NoteEditController({
				inject: this.edit_container,
				note: note,
				board: board,
				edit_in_modal: false
			});

			this.edit_controller.bind('release', function() {
				if(!window._in_ext) window.close();
			}, 'bookmark:edit_note:release');
			this.edit_controller.bind('change-type', function() {
				this.resize();
			}.bind(this), 'bookmark:edit_note:type');
		}.bind(this), 'bookmark:change_board');

		var last	=	tagit.user.get('settings').get_by_key('last_board').value() || false;
		this.profile.set_current_board(last, {silent: true});
		this.profile.trigger('change:current_board');
	},

	soft_release: function()
	{
		if(this.board_controller) this.board_controller.release();
		if(this.edit_controller)
		{
			this.edit_controller.release({silent: 'release'});
			this.edit_controller.unbind('release', 'bookmark:edit_note:release');
			this.edit_controller.unbind('change-type', 'bookmark:edit_note:type');
		}
	},

	release: function()
	{
		this.soft_release();
		document.body.removeClass('bare');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('bookmark/index');
		this.html(content);
		document.body.addClass('bare');
	},

	get_height: function()
	{
		return ($('main').getCoordinates().height + 10);
	},

	resize: function(delay)
	{
		delay || (delay = 0);
		var height	=	this.get_height();
		var do_set	=	function()
		{
			if(window.port) window.port.send('set-height', height);
		};
		if(delay > 0)
		{
			do_set.delay(delay, this);
		}
		else
		{
			do_set();
		}
	}
});
