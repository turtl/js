var ShareController = Composer.Controller.extend({
	elements: {
		'img.load': 'email_loading',
		'input[name=email]': 'inp_email',
		'div.sub': 'sub_el'
	},

	events: {
		'keyup input[name=email]': 'email_search'
	},

	model: null,
	tabindex: null,

	sn_timer: null,
	sub_controller: null,

	init: function()
	{
		this.render();

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(500);
		this.sn_timer.end = this.do_search_email.bind(this);
	},

	release: function()
	{
		if(this.sub_controller)
		{
			this.sub_controller.release();
			this.sub_controller.unbind('release', 'share:sub:release');
			this.sub_controller.unbind('sent', 'share:sub:sent');
		}
		this.unbind('sent');
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('modules/share', {
			tabindex: this.tabindex
		});
		this.html(content);
		(function() {
			this.inp_email.focus();
		}).delay(10, this);
	},

	get_email: function()
	{
		return this.inp_email.get('value').replace(/[^a-z0-9\-@\/\.]/gi, '').clean();
	},

	is_valid_email: function(email)
	{
		return email.match(/[^@]+@[^@]+$/);
	},

	email_search: function(e)
	{
		var email = this.get_email();
		if(email == '') return this.render();
		if(!this.is_valid_email(email)) return;
		this.sn_timer.start();
		if(this.get_email() != '') this.email_loading.setStyle('display', 'inline');
	},

	do_search_email: function()
	{
		var email = this.get_email();
		this.email_loading.setStyle('display', '');
		if(email == '') return false;
		this.email_loading.setStyle('display', 'inline');
		new Persona().get_by_email(email, {
			require_pubkey: true,
			success: function(persona) {
				this.email_loading.setStyle('display', '');
				this.update(persona);
			}.bind(this),
			error: function(err, xhr) {
				this.email_loading.setStyle('display', '');
				// simple not found error, setup invite screen
				if(xhr.status == 404)
				{
					this.update();
					return;
				}
				barfr.barf('There was a problem pulling out that persona. Soooo sorry.');
			}.bind(this)
		});
	},

	update: function(persona_data)
	{
		if(this.sub_controller)
		{
			this.sub_controller.unbind('release', 'share:sub:release');
			this.sub_controller.unbind('sent', 'share:sub:sent');
			this.sub_controller.release();
		}
		this.sub_controller = new this.controller({
			inject: this.sub_el,
			model: this.model,
			persona_data: persona_data,
			email: this.get_email()
		});
		this.sub_controller.bind('sent', function() {
			this.trigger('sent');
		}.bind(this), 'share:sub:sent');
		this.sub_controller.bind('release', function() {
			this.inp_email.value = '';
			this.render();
		}.bind(this), 'share:sub:release');
	}
});

