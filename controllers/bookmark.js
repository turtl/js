var BookmarkController = Composer.Controller.extend({
	inject: tagit.main_container_selector,
	className: 'bookmark modalcontent',

	elements: {
		'div.board': 'board_container',
		'div.edit': 'edit_container'
	},

	linkdata: {},
	profile: null,

	board_controller: null,
	edit_controller: null,

	init: function()
	{
		this.linkdata = parse_querystring();
		this.render();

		this.profile	=	tagit.profile;
		this.profile.bind('change:current_board', function() {
			var board = this.profile.get_current_board();

			tagit.user.set({last_board: board.id()});
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
				window.close();
			}, 'bookmark:edit_note:release');
		}.bind(this), 'bookmark:change_board');

		this.profile.set_current_board(tagit.user.get('last_board'), {silent: true});
		this.profile.trigger('change:current_board');
	},

	soft_release: function()
	{
		if(this.board_controller) this.board_controller.release();
		if(this.edit_controller)
		{
			this.edit_controller.release({silent: 'release'});
			this.edit_controller.unbind('release', 'bookmark:edit_note:release');
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
	}
});
