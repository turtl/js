var KeychainEntry = Protected.extend({
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
		if(!this.key) this.key = turtl.user.key;
		return this.parent.apply(this, arguments);
	},

	save: function()
	{
		return this.parent.apply(this, arguments);
	}
});

var Keychain = SyncCollection.extend({
	model: KeychainEntry,
	local_table: 'keychain',

	/**
	 * Upsert a key to the keychain (add if it doesn't exist, otherwise update
	 * the existing). It uses item_id as the primary key (ignores type).
	 */
	upsert_key: function(item_id, item_type, key, options)
	{
		options || (options = {});
		var entry = this.find_key(item_id, {return_model: true});
		var key = tcrypt.key_to_string(key);
		if(entry && entry.get('type') == item_type)
		{
			// item exists! update it
			entry.set({k: key});
		}
		else
		{
			// new entry
			entry = new KeychainEntry({
				type: item_type,
				item_id: item_id,
				k: key
			});
		}
		this.upsert(entry);
		if(options.skip_save) return;
		return entry.save(options)
			.catch(function(err) {
				barfr.barf(i18next.t('Error saving key for item: {{err}}', {err: err}));
				log.error('keychain: error saving: ', arguments);
				this.remove(entry);
				throw err;
			});
	},

	// DEPRECATED
	//
	// this was a terribly named function and has been superseded by upsert_key
	add_key: function() { return this.upsert_key.apply(this, arguments); },

	/**
	 * Find a key in the keychain. By default returns the key, but can return
	 * the model itself. Returns false on fail.
	 */
	find_key: function(item_id, options)
	{
		options || (options = {});

		var models = this.filter(function(m) {
			return m.get('item_id') == item_id;
		});
		if(models.length == 0) return false;
		if(options.return_model) return models[0];

		var key = models[0].get('k');
		if(!key) return false;
		try
		{
			return tcrypt.key_from_string(key);
		}
		catch(err)
		{
			log.error('keychain: error deserializing key: ', models[0].id(), derr(err));
			return false;
		}
	},

	/**
	 * Remove a key from the keychain. deleting it permanently.
	 */
	remove_key: function(item_id, options)
	{
		options || (options = {});

		var model = this.find_key(item_id, {return_model: true});
		if(!model) return false;
		return model.destroy(options)
			.catch(function(err) {
				barfr.barf(i18next.t('Error removing key for item: {{err}}', {err: err}));
				throw err;
			});
	}
});

