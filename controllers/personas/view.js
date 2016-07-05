var PersonasViewController = Composer.Controller.extend({
	class_name: 'persona',

	events: {
		'click .button.generate': 'generate_key',
		'change .settings input': 'update_settings'
	},

	model: null,

	init: function()
	{
		if(!this.model) throw new Error('persona view: bad persona passed');

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [{name: 'Delete persona'}]}
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'delete-persona': this.delete_persona(); break;
			}
		}.bind(this));

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([{title: i18next.t('Edit persona'), name: 'edit', icon: 'edit'}]);
			this.with_bind(actions, 'actions:fire', function(action) {
				switch(action)
				{
					case 'edit': this.open_edit(); break;
				}
			}.bind(this));
			return actions;
		}.bind(this));

		this.render();

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model, 'destroy', this.release.bind(this));
	},

	render: function()
	{
		var data = this.model.toJSON();
		data.settings || (data.settings = {});
		var settings = [
			{name: 'notify_invite', default: 1, desc: i18next.t('Email me when someone shares with me')}
		];
		settings.forEach(function(setting) {
			if(typeof(data.settings[setting.name]) == 'undefined')
			{
				data.settings[setting.name] = setting.default;
			}
		});
		var key = data.pubkey && openpgp.key.readArmored(data.pubkey).keys[0];
		var keylen = key && key.primaryKey.mpi[0].byteLength() * 8;
		this.html(view.render('personas/view', {
			persona: data,
			keylen: keylen,
			settings: settings
		}));
	},

	open_edit: function()
	{
		new PersonasEditController({model: this.model});
	},

	delete_persona: function()
	{
		if(!confirm(i18next.t('Really delete this persona? All shares to and from it will be deleted as well.'))) return false;
		this.model.destroy()
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting your persona'), err);
				log.error('persona: delete: ', this.model.id(), derr(err));
			});
	},

	generate_key: function(e)
	{
		if(e) e.stop();
		this.model.generate_key().bind(this)
			.then(function() {
				return this.model.save();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem generating a key for your persona'), err);
				log.error('persona: view: keygen: ', this.model.id(), derr(err));
			});
	},

	update_settings: function(e)
	{
		var settings = clone(this.model.get('settings') || {});
		this.el.getElements('.settings input').forEach(function(el) {
			var name = el.get('name');
			var val = el.get('value');
			var type = el.get('type');
			switch(type)
			{
				case 'checkbox':
					settings[name] = el.get('checked') ? true : false;
					break;
			}
		});
		this.model.set({settings: settings});
		this.model.save()
			.then(function() {
				barfr.barf(i18next.t('Persona settings updated.'));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem saving your settings'), err);
				log.error('persona: view: settings: ', this.model.id(), derr(err));
			});
	}
});

