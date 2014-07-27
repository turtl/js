var PersonasController = Composer.Controller.extend({
	elements: {
		'div.personas-list': 'personas_list'
	},

	events: {
		'click .button.add': 'add_persona',
		'click a.add': 'add_persona',
		'click a[href=#edit]': 'edit_persona',
		'click a[href=#delete]': 'delete_persona',
		'click a[href=#email]': 'toggle_email_settings',
		'click a[href=#generate]': 'make_keypair',
		'change .email-settings input[type=checkbox]': 'update_email_setting'
	},

	edit_in_modal: true,

	collection: null,
	list_controller: null,

	init: function()
	{
		if(!this.collection) this.collection = turtl.user.get('personas');
		this.render();
		if(this.edit_in_modal)
		{
			modal.open(this.el);
			var close_fn = function() {
				this.release();
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}
		this.collection.bind(['change', 'add', 'remove', 'destroy', 'reset'], this.render.bind(this), 'personas:monitor:render');

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		if(this.list_controller) this.list_controller.release();
		this.collection.unbind(['change', 'add', 'remove', 'destroy', 'reset'], 'personas:monitor:render');
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var personas = this.collection.map(function(persona) {
			var data = toJSON(persona);
			data.has_key = persona.has_keypair();
			return data;
		});
		var content = Template.render('personas/index', {
			num_personas: personas.length
		});
		this.html(content);
		if(this.list_controller) this.list_controller.release();
		if(this.personas_list)
		{
			this.list_controller = new PersonaListController({
				inject: this.personas_list,
				personas: personas
			});
		}
		if(window.port) window.port.send('resize');
	},

	add_persona: function(e)
	{
		if(e) e.stop();
		this.release();
		new PersonaEditController({
			inject: this.inject,
			edit_in_modal: this.edit_in_modal,
			collection: this.collection
		});
	},

	get_persona_id: function(target)
	{
		return next_tag_up('li', next_tag_up('li', target).getParent()).className.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
	},

	edit_persona: function(e)
	{
		if(!e) return false;
		e.stop();
		var pid = this.get_persona_id(e.target);
		var persona = this.collection.find_by_id(pid);
		if(!persona) return false;
		this.release();
		new PersonaEditController({
			inject: this.inject,
			edit_in_modal: this.edit_in_modal,
			collection: this.collection,
			model: persona
		});
	},

	delete_persona: function(e)
	{
		if(!e) return false;
		e.stop();
		var pid = this.get_persona_id(e.target);
		var persona = this.collection.find_by_id(pid);
		if(!persona) return false;
		if(!confirm('Really delete this persona? It will be gone forever, along with its keys (both public and private). All data shared with this persona will no longer be accessible to you. THIS IS IRREVERSIBLE.')) return false;
		persona.destroy_persona();
	},

	toggle_email_settings: function(e)
	{
		if(e) e.stop();
		var persona_li = next_tag_up('li', next_tag_up('li', e.target).getParent());
		if(!persona_li) return false;
		var settings = persona_li.getElement('.email-settings');
		if(!settings) return false;
		if(settings.getStyle('display') == 'block')
		{
			settings.setStyle('display', '');
		}
		else
		{
			settings.setStyle('display', 'block');
		}
		if(window.port) window.port.send('resize');
	},

	update_email_setting: function(e)
	{
		if(!e) return false;
		e.stop();
		var pid =  next_tag_up('li', e.target).className.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
		var persona = this.collection.find_by_id(pid);
		var setting = e.target.name;
		var enabled = e.target.checked;
		if(!persona) return false;
		var settings = Object.clone(persona.get('settings', {}));
		settings[setting] = enabled ? 1 : 0;

		// update the settings silently (otherwise dropdown will disappear)
		persona.set({settings: settings}, {silent: true});
		persona.save({silent: true});
	},

	make_keypair: function(e)
	{
		if(e) e.stop();

		var pid = next_tag_up('li', e.target).className.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
		var persona = this.collection.find_by_id(pid);
		if(!persona) return false;

		persona.generate_ecc_key();
		persona.save();
	}
});
