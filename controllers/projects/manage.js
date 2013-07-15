var ProjectManageController = Composer.Controller.extend({
	elements: {
		'ul.mine': 'my_projects'
	},

	events: {
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

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		if(this.my_sort) this.my_sort.detach();
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
	}
});
