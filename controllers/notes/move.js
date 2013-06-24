var NoteMoveController = Composer.Controller.extend({
	elements: {
		'select[name=project]': 'inp_select'
	},

	events: {
		'change select': 'select_project',
		'click select': 'select_project'  	// keeps modal from closing on select
	},

	note: null,
	project: null,

	init: function()
	{
		if(!this.note || !this.project) return false;

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
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var projects = tagit.profile.get('projects').map(function(p) {
			return {id: p.id(), title: p.get('title')};
		});
		//projects.sort(function(a, b) { return a.title.localeCompare(b.title); });
		var content = Template.render('notes/move', {
			note: toJSON(this.note),
			projects: projects
		});
		this.html(content);
	},

	select_project: function(e)
	{
		if(e) e.stop();
		if(e.type == 'click') return false;		// fuck you, click
		var pid = this.inp_select.get('value');
		var curpid = this.note.get('project_id');
		if(curpid == pid) return false;

		var projectfrom = tagit.profile.get('projects').find_by_id(curpid);
		var projectto = tagit.profile.get('projects').find_by_id(pid);
		if(!projectfrom || !projectto) return false;

		this.note.set({project_id: pid});
		this.note.generate_subkeys([
			{p: pid, k: projectto.key}
		]);

		tagit.loading(true);
		this.note.save({
			success: function(note_data) {
				modal.close();
				tagit.loading(false);
				this.note.set(note_data);
				projectfrom.get('notes').remove(this.note);
				//projectfrom.get('tags').trigger('change:selected');
				projectto.get('notes').add(this.note);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was a problem moving your note: '+ e);
				tagit.loading(false);
			}
		});
	}
});
