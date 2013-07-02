var PersonaEditController = Composer.Controller.extend({
	elements: {
		'input[name=screenname]': 'inp_screenname'
	},

	events: {
		'submit form': 'add_persona'
	},

	model: null,

	init: function()
	{
		if(!this.model) this.model = new Persona();

		this.render();
		modal.open(this.el);
		var modalclose = function() {
			modal.removeEvent('close', modalclose);
			this.release();
		}.bind(this);
		modal.addEvent('close', modalclose);
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('personas/edit', {
			persona: toJSON(this.model)
		});
		this.html(content);
		(function() { this.inp_screenname.focus(); }).delay(1, this);
	},

	add_persona: function(e)
	{
		if(e) e.stop();
	}
});
