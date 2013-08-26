var PersonaSelector = Composer.Controller.extend({
	elements: {
		'img.load': 'email_loading',
		'input[name=email]': 'inp_email',
		'div.personas-list': 'persona_list_el'
	},

	events: {
		'keyup input[name=email]': 'email_search',
		'click a[href=#change]': 'change_persona',
		'click .personas-list > ul > li': 'pick_persona'
	},

	persona: null,
	lock: false,
	tabindex: null,

	sn_timer: null,
	persona_list: null,

	last_res: null,

	init: function()
	{
		if(!this.persona) this.persona = new Persona();
		this.render();

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(500);
		this.sn_timer.end = this.do_search_email.bind(this);
	},

	release: function()
	{
		if(this.persona_list)
		{
			this.persona_list.unbind('release', 'personas:selector:invites:release');
			this.persona_list.release();
		}
		turtl.keyboard.attach(); // re-enable shortcuts
		this.unbind('selected');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('personas/select', {
			persona: toJSON(this.persona),
			lock: this.lock,
			tabindex: this.tabindex,
		});
		this.html(content);
		if(this.persona.is_new())
		{
			(function() {
				this.inp_email.focus();
			}).delay(10, this);
		}
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
		this.sn_timer.start();
		if(this.get_email() != '') this.email_loading.setStyle('display', 'inline');
	},

	do_search_email: function()
	{
		var email = this.get_email();
		this.email_loading.setStyle('display', '');
		if(email == '') return false;
		this.email_loading.setStyle('display', 'inline');
		this.persona.get_by_email(email, {
			success: function(persona) {
				this.email_loading.setStyle('display', '');
				this.refresh_personas([persona]);
			}.bind(this),
			error: function(err, xhr) {
				this.email_loading.setStyle('display', '');
				// simple not found error, setup invite screen
				if(xhr.status == 404)
				{
					this.refresh_personas([]);
					return;
				}
				barfr.barf('There was a problem pulling out that persona. Soooo sorry.');
			}.bind(this)
		});
	},

	get_persona_id: function(classname)
	{
		return classname.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
	},

	pick_persona: function(e)
	{
		if(!e || !this.last_res) return false;
		e.stop();

		var classname = next_tag_up('li', e.target).className;

		var pid = this.get_persona_id(classname);
		if(!pid) return;

		var persona_data = this.last_res.filter(function(p) {
			return p.id = pid;
		})[0];
		if(!persona_data) return false;
		this.persona = new Persona(persona_data);
		this.render();
		this.trigger('selected', this.persona);
	},

	change_persona: function(e)
	{
		if(this.lock) return false;
		if(e) e.stop();
		this.persona	=	new Persona();
		this.render();
		this.trigger('change-persona');
	},

	refresh_personas: function(personas)
	{
		this.last_res = personas;

		if(this.persona_list)
		{
			this.persona_list.unbind('release', 'personas:selector:list:release');
			this.persona_list.release();
		}
		if(personas.length > 0)
		{
			this.persona_list	=	new PersonaListController({
				inject: this.persona_list_el,
				personas: personas,
				hide_edit: true
			});
			this.trigger('show-personas');
		}
		else if(this.is_valid_email(this.get_email()))
		{
			this.persona_list	=	new InviteBoardController({
				email: this.get_email(),
				inject: this.persona_list_el,
				board: this.model
			});
			this.persona_list.bind('sent', function() {
				this.persona	=	null;
			}.bind(this));
			this.trigger('show-invite');
		}

		if(!this.persona_list) return;

		this.persona_list.bind('release', function() {
			if(this.inp_email) this.inp_email.set('value', '');
		}.bind(this), 'personas:selector:list:release');
	}
});
