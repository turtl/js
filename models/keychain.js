var KeychainEntry	=	Protected.extend({
	base_url: '/keychain',

	public_fields: [
		'id',
		'type',
		'item_id',
		'user_id'
	],

	private_fields: [
		'k'
	],

	initialize: function()
	{
		// copy key from user
		if(!this.key) this.key = turtl.user.get_key();
		return this.parent.apply(this, arguments);
	}
});

var Keychain	=	SyncCollection.extend({
	model: KeychainEntry,
	local_table: 'keychain',

	/**
	 * Add a key to the keychain.
	 */
	add_key: function(item_id, item_type, key, options)
	{
		options || (options = {});
		var entry	=	this.find_key(item_id, {disable_migrate: true, return_model: true});
		var key		=	tcrypt.key_to_string(key);
		if(entry && entry.get('type') == item_type)
		{
			// item exists! update it
			entry.set({k: key});
		}
		else
		{
			// new entry
			entry	=	new KeychainEntry({
				type: item_type,
				item_id: item_id,
				k: key
			});
		}
		entry.save({
			success: function(model) {
				if(options.success) options.success(model);
			}.bind(this),
			error: function(model, err) {
				barfr.barf('Error saving key for item: '+ err);
				log.error('keychain: error saving: ', arguments);
				this.remove(entry);
				if(options.error) options.error(err);
			}.bind(this)
		});
		this.add(entry);
		return entry;
	},

	/**
	 * Find a key in the keychain. By default returns the key, but can return
	 * the model itself. Returns false on fail.
	 */
	find_key: function(item_id, options)
	{
		options || (options = {});

		var models	=	this.filter(function(m) {
			return m.get('item_id') == item_id;
		});
		if(models.length > 0)
		{
			if(options.return_model) return models[0];
			try
			{
				return tcrypt.key_to_bin(models[0].get('k'));
			}
			catch(e)
			{
				log.error('keychain: error deserializing key: ', models[0].id(), e);
				return false;
			}
		}

		if(options.disable_migrate) return false;

		// search the user data, and run a migration from user settings into the
		// keychain if an entry is found.
		var user_keys	=	turtl.user.get('settings').get_by_key('keys').value();
		if(!user_keys || !user_keys[item_id]) return false;
		var key		=	tcrypt.key_to_bin(user_keys[item_id]);
		var model	=	this.add_key(item_id, 'board', key, {force_add: true})
		if(options.return_model) return model;
		return tcrypt.key_to_bin(model.get('k'));
	},

	/**
	 * Remove a key from the keychain. deleting it permanently.
	 */
	remove_key: function(item_id, options)
	{
		options || (options = {});

		var model	=	this.find_key(item_id, {return_model: true});
		if(!model) return false;
		model.destroy({
			success: options.success,
			error: function(err) {
				barfr.barf('Error removing key for item: '+ err);
				if(options.error) options.error();
			}
		});
	}
});

