var PostsController = Composer.Controller.extend({
	elements: {
		'ul': 'post_ul'
	},

	events: {
		'click a.add-post': 'add_post'
	},

	post_item_controllers: [],

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;
		this.render();
	},

	release: function()
	{
		this.post_item_controllers.each(function(item) {
			item.release();
		});
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('posts/index', { });
		this.html(content);

		this.project.get('posts').each(function(p) {
			var item = new PostItemController({
				inject: this.post_ul,
				post: p
			});
			this.post_item_controllers.push(item);
		}.bind(this));
	},

	add_post: function(e)
	{
		if(e) e.stop();
		new PostAddController();
	}
});

var PostAddController = Composer.Controller.extend({
	elements: {
		'input[type="text"]': 'inp_name'
	},

	events: {
		'submit form': 'edit_project'
	},

	project: null,

	init: function()
	{
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		this.inp_name.focus();
	},

	render: function()
	{
		var content = Template.render('posts/edit', {
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
		this.profile.save_profile();
		modal.close();
	}
});
