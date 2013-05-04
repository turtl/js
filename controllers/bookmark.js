var BookmarkController = Composer.Controller.extend({
	inject: tagit.main_container_selector,
	className: 'bookmark modalcontent',

	elements: {
		'div.projects': 'project_container',
		'div.edit': 'edit_container'
	},

	linkdata: {},
	profile: null,

	project_controller: null,
	edit_controller: null,

	init: function()
	{
		this.render();

		tagit.loading(true);
		this.profile = tagit.user.load_profile({
			project: tagit.user.get('last_project')
		});

		this.profile.bind('change:current_project', function() {
			var project = this.profile.get_current_project();
			project.load_notes({
				success: function() {
					tagit.loading(false);
					var note = new Note({
						type: 'link',
						url: this.linkdata.url,
						title: this.linkdata.title,
						text: this.linkdata.text
					});
					this.project_controller = new ProjectsController({
						el: this.project_container,
						profile: this.profile
					});
					this.edit_controller = new NoteEditController({
						el: this.edit_container,
						note: note,
						project: project,
						edit_in_modal: false
					});
					(function() {
						this.edit_controller.tag_controller.inp_tag.focus();
					}).delay(10, this);
				}.bind(this)
			});
		}.bind(this), 'bookmark:change_project');
	},

	soft_release: function()
	{
		if(this.project_controller) this.project_controller.release();
		if(this.edit_controller) this.edit_controller.release();
	},

	release: function()
	{
		document.body.removeClass('bare');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		this.html('<div class="projects"></div><div class="edit"></div>');
		document.body.addClass('bare');
	}
});
