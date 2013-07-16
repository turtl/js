var ProjectManageController = Composer.Controller.extend({
	elements: {
		'ul.mine': 'my_projects'
	},

	events: {
		'click .button.add': 'open_add',
		'click a[href=#share]': 'open_share',
		'click a[href=#edit]': 'open_edit',
		'click a[href=#delete]': 'delete_project'
	},

	collection: null,

	init: function()
	{
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		this.collection.bind(['add', 'remove', 'change', 'reset'], this.render.bind(this), 'projects:manage:render');

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		if(this.my_sort) this.my_sort.detach();
		this.collection.unbind(['add', 'remove', 'change', 'reset'], 'projects:manage:render');
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		// load project data (sans notes)
		var projects	=	this.collection.map(function(p) {
			var _notes	=	p.get('notes');
			p.unset('notes', {silent: true});
			var ret		=	toJSON(p);
			p.set({notes: _notes}, {silent: true});
			return ret;
		});
		var content = Template.render('projects/manage', {
			projects: projects
		});
		this.html(content);

		this.setup_sort();
	},

	setup_sort: function()
	{
		if(this.my_sort) this.my_sort.detach();
		this.my_sort	=	new Sortables(this.my_projects, {
			handle: 'span.sort',
			onComplete: function() {
				var items	=	this.my_projects.getElements('> li');
				var sort	=	{};
				var ids		=	items.each(function(li, idx) {
					var pid		=	li.className.replace(/^.*project_([0-9a-f-]+).*?$/, '$1');
					sort[pid]	=	idx;
				});
				tagit.user.get('settings').get_by_key('project_sort').value(sort);
				this.collection.sort();
			}.bind(this)
		});
	},

	open_add: function(e)
	{
		if(e) e.stop();
		this.release();
		new ProjectEditController({
			return_to_manage: true,
			profile: tagit.profile
		});
	},

	open_share: function(e)
	{
		if(!e) return;
		e.stop();
		var pid		=	next_tag_up('a', e.target).className;
		var project	=	this.collection.find_by_id(pid);
		if(!project) return;
		this.release();
		new ProjectShareController({
			project: project
		});
	},

	open_edit: function(e)
	{
		if(!e) return;
		e.stop();
		var pid		=	next_tag_up('a', e.target).className;
		var project	=	this.collection.find_by_id(pid);
		if(!project) return;
		this.release();
		new ProjectEditController({
			return_to_manage: true,
			profile: tagit.profile,
			project: project
		});
	},

	delete_project: function(e)
	{
		if(!e) return;
		e.stop();
		var pid		=	next_tag_up('a', e.target).className;
		var project	=	this.collection.find_by_id(pid);
		if(!project) return;
		if(!confirm('Really delete this project, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		tagit.loading(true);
		project.destroy({
			success: function() {
				tagit.loading(false);

				var next = this.collection.first() || false;
				tagit.profile.set_current_project(next);
			}.bind(this),
			error: function() {
				tagit.loading(false);
			}
		});
	}
});
