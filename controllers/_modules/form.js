var FormController = Composer.Controller.extend({
	events: {
		'submit form': 'submit',
		'click .button.submit': 'submit',
		'click .button.cancel': 'cancel'
	},

	modal: false,
	buttons: true,
	title: 'Turtl gave me a name',
	formclass: 'generic-form',
	action: 'Create',

	init: function()
	{
		var title = this.title;
		var back = false;
		if(Array.isArray(this.title))
		{
			title = this.title[0];
			back = this.title[1];
		}
		turtl.push_title(title, back);
		this.render();
		if(this.modal)
		{
			modal.open(this.el);
			modal.bind_once('close', function() {
				if(this.el) this.release();
			}.bind(this));
		}
		turtl.keyboard.detach();	// disable keyboard shortcuts while editing
		return this.parent.apply(this, arguments);
	},

	release: function()
	{
		if(this.modal) setTimeout(function() { modal.close(); }, 1);
		turtl.pop_title();
		turtl.keyboard.attach();	// re-enable shortcuts
		return this.parent.apply(this, arguments);
	},

	html: function(content)
	{
		this.parent(view.render('modules/form_layout', {
			action: this.action,
			formclass: this.formclass,
			buttons: this.buttons,
			content: content
		}));
	},

	submit: function(e)
	{
		console.error('override me');
	},

	cancel: function(e)
	{
		this.trigger('cancel');
		this.release();
	}
});

