var BookmarkController = Composer.Controller.extend({
	inject: tagit.main_container_selector,
	className: 'bookmark modalcontent',

	elements: {
		'div.project': 'project_container',
		'div.edit': 'edit_container'
	},

	linkdata: {},
	profile: null,

	project_controller: null,
	edit_controller: null,

	init: function()
	{
		this.linkdata = parse_querystring();
		this.render();

		this.profile	=	tagit.profile;
		this.profile.bind('change:current_project', function() {
			var project = this.profile.get_current_project();
			tagit.user.set({last_project: project.id()});
			this.soft_release();
			var note = new Note({
				type: this.linkdata.type,
				url: this.linkdata.url,
				title: this.linkdata.title,
				text: this.linkdata.text
			});
			this.project_controller = new ProjectsController({
				inject: this.project_container,
				profile: this.profile
			});
			this.edit_controller = new NoteEditController({
				inject: this.edit_container,
				note: note,
				project: project,
				edit_in_modal: false
			});
			$E('.projects', this.el).dispose().inject($E('h1', this.edit_controller.el), 'after');
			this.edit_controller.bind('release', function() {
				window.close();
			}, 'bookmark:edit_note:release');
		}.bind(this), 'bookmark:change_project');

		this.profile.load({project: tagit.user.get('last_project')});
	},

	soft_release: function()
	{
		if(this.project_controller) this.project_controller.release();
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
