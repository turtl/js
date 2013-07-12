var PersonaSelector = Composer.Controller.extend({
	elements: {
		'img.load': 'screenname_loading',
		'input[name=screenname]': 'inp_screenname',
		'div.personas-list': 'persona_list_el'
	},

	events: {
		'keyup input[name=screenname]': 'screenname_search',
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

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(500);
		this.sn_timer.end = this.do_search_screenname.bind(this);
	},

	release: function()
	{
		tagit.keyboard.attach(); // re-enable shortcuts
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
				this.inp_screenname.focus();
			}).delay(10, this);
		}
	},

	get_screenname: function()
	{
		return this.inp_screenname.get('value').replace(/[^a-z0-9\/\.]/gi, '').clean();
	},

	screenname_search: function(e)
	{
		var screenname = this.get_screenname();
		this.sn_timer.start();
		if(this.get_screenname() != '') this.screenname_loading.setStyle('display', 'inline');
	},

	do_search_screenname: function()
	{
		var screenname = this.get_screenname();
		this.screenname_loading.setStyle('display', '');
		if(screenname == '') return false;
		this.screenname_loading.setStyle('display', 'inline');
		this.persona.search_by_screenname(screenname, {
			success: function(res) {
				this.screenname_loading.setStyle('display', '');
				this.refresh_personas(res);
			}.bind(this),
			error: function(err, xhr) {
				this.screenname_loading.setStyle('display', '');
				barfr.barf('There was an error while searching personas. Try again.');
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
		this.persona.clear()
		this.render();
	},

	refresh_personas: function(personas)
	{
		this.last_res = personas;

		if(this.persona_list) this.persona_list.release();
		this.persona_list = new PersonaListController({
			inject: this.persona_list_el,
			personas: personas,
			hide_edit: true
		});
	}
});
