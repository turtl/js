var FormController = Composer.Controller.extend({
	elements: {
		'.button.submit': 'btn_submit',
		'.button-row .desc': 'el_desc'
	},

	events: {
		'submit form': 'submit',
		'click .button.submit': 'submit',
		'click .button.cancel': 'cancel'
	},

	buttons: true,
	button_tabindex: null,
	formclass: 'standard-form',
	action: 'Create',
	footer_actions: [],

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
			tabindex: this.button_tabindex,
			content: content,
			footer_actions: this.footer_actions
		}));
	},

	submit: function(e)
	{
		console.warn('formcontroller: submit: override me');
	},

	cancel: function(e)
	{
		this.trigger('cancel');
	},

	set_desc: function(text)
	{
		if(!this.el_desc) return;
		this.el_desc.set('html', text);
	},

	highlight_button: function()
	{
		if(this.el.getElement('div.highlight')) return;
		var dot = new Element('div').addClass('highlight').set('html', '&nbsp;');
		dot.inject(this.btn_submit);
		Velocity(dot, {opacity: [1, 0]}, {duration: 400});
		Velocity(dot, 'callout.pulse', {duration: 800});
	}
});

