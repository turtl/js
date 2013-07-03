var PersonaEditController = Composer.Controller.extend({
	elements: {
		'input[name=screenname]': 'inp_screenname',
		'p.taken': 'screenname_note'
	},

	events: {
		'keyup input[name=screenname]': 'check_screenname',
		'submit form': 'add_persona',
		'click h1 a': 'open_personas'
	},

	model: null,
	sn_timer: null,

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

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing

		this.sn_timer = new Timer(200);
		this.sn_timer.end = this.do_check_screenname.bind(this);
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		tagit.keyboard.attach(); // re-enable shortcuts
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
	},

	get_screenname: function()
	{
		return this.inp_screenname.get('value').replace(/[^a-z0-9\/\.]/gi, '').clean();
	},

	screenname_msg: function(msg, success)
	{
		success || (success = false);
		msg = msg.clean();

		this.screenname_note.className = this.screenname_note.className.replace(/(error|success)/g, '');
		this.screenname_note.addClass(success ? 'success' : 'error');
		this.screenname_note.setStyle('visibility', msg == '' ? 'hidden' : 'visible');
		if(msg != '')
		{
			this.screenname_note.set('html', msg);
		}
	},

	check_screenname: function(e)
	{
		var screenname = this.inp_screenname.get('value')
		if(screenname.match(/[^a-z0-9\/\.]/i))
		{
			this.screenname_msg('A screenname can only include A-Z 0-9 / and . (periods)');
			this.inp_screenname.addClass('error');
			return false;
		}
		this.screenname_note.setStyle('visibility', 'hidden');
		this.inp_screenname.removeClass('error');
		this.sn_timer.start();
	},

	do_check_screenname: function()
	{
		var screenname = this.get_screenname();
		if(screenname == '') return false;
		this.model.get_by_screenname(screenname, {
			success: function(res) {
				this.screenname_msg('That screenname is taken =\'[.');
				this.inp_screenname.addClass('error');
			}.bind(this),
			error: function(err, xhr) {
				if(xhr.status == 404)
				{
					this.screenname_msg('That screenname is available.', true);
				}
				else
				{
					barfr.barf('There was an error checking the availability of that screenname. Try again.');
				}
			}.bind(this)
		});
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		this.release();
		new PersonasController();
	}
});
