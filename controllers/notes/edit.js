var NoteEditController = Composer.Controller.extend({
	elements: {
	},

	events: {
		'submit form': 'edit_project',
		'click ul.type li': 'switch_type'
	},

	project: null,
	note: null,

	init: function()
	{
		if(!this.note) this.note = new Note();
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
	},

	render: function()
	{
		var content = Template.render('notes/edit', {
			note: toJSON(this.note),
			project: this.project
		});
		this.html(content);
	},

	edit_project: function(e)
	{
		if(e) e.stop();
		var name = this.inp_name.get('value');
		if(this.project)
		{
			this.project.set({name: name});
		}
		else
		{
			this.project = new Project({ name: name });
			var projects = this.profile.get('projects');
			if(projects) projects.add(this.project);
		}
		modal.close();
	},

	switch_type: function(e)
	{
		if(!e) return;
		e.stop();
		var li = next_tag_up('li', e.target);
		var types = this.el.getElements('.note-edit > div.type');
		types.each(function(el) { el.removeClass('sel'); });
		var lis = this.el.getElements('ul.type > li');
		lis.each(function(el) { el.removeClass('sel'); });
		var type = this.el.getElement('.note-edit > div.type.'+ li.get('html').clean().toLowerCase());
		type.addClass('sel');
		li.addClass('sel');
	}
});
