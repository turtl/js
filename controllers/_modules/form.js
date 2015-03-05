var FormController = Composer.Controller.extend({
	events: {
		'submit form': 'submit',
		'click .button.submit': 'submit',
		'click .button.cancel': 'cancel'
	},

	buttons: true,
	title: 'Turtl gave me a name',
	formclass: 'standard-form',
	action: 'Create',

	init: function()
	{
		turtl.keyboard.detach();	// disable keyboard shortcuts while editing
		return this.parent.apply(this, arguments);
	},

	html: function(content)
	{
		this.parent(view.render('modules/form-layout', {
			action: this.action,
			formclass: this.formclass,
			buttons: this.buttons,
			content: content
		}));
	},

	submit: function(e)
	{
		console.warn('formcontroller: submit: override me');
	},

	cancel: function(e)
	{
		this.trigger('cancel');
	}
});

