"use strict";

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});

// threaded decryption queue
var cqueue = new CryptoQueue({
	workers: 4
});

var Protected = Composer.RelationalModel.extend({
	relations: {
		keys: { collection: 'Keys' }
	},

	// when serializing/deserializing the encrypted payload for the private
	// fields will be stored under this key in the resulting object
	body_key: 'body',

	// holds the symmetric key to encrypt/decrypt model data with
	key: null,

	/**
	 * Note that any field NOT specified in the following two public/private
	 * fields containers will be ignored during serialization.
	 */
	// holds the fields in the model that are designated "public" and should not
	// be encrypted when serializing/deserislizing this model
	public_fields: [],
	// holds the fields in the model that are designated "private" and should
	// absolutely be stored encrypted when serializing the model.
	private_fields: [],

	/**
	 * here, we test for the old serialization format. if detected, we pass it
	 * in verbatim to tcrypt (which is adept at handling it). if not detected,
	 * we base64-decode the data before handing the raw serialized data off to
	 * tcrypt.
	 */
	detect_old_format: function(data)
	{
		var raw = data.match(/:i[0-9a-f]{32}$/) ? data : tcrypt.from_base64(data);
		return raw;
	},

	/**
	 * Make sure that a symmetric key exists for this model. If not, returns
	 * false, if so returns the key.
	 *
	 * Takes a set of key data holding the encrypted key in case the key simply
	 * needs to be found/decrypted.
	 */
	ensure_key_exists: function(keydata)
	{
		if(!this.key) this.key = this.find_key(keydata);
		if(!this.key) return false;
		return this.key;
	},

	/**
	 * copy Composer.model.clone, but set the key as well
	 */
	clone: function()
	{
		var newmodel = this.parent.apply(this, arguments);
		newmodel.key = this.key;
		newmodel._cid = this.cid();
		return newmodel;
	},

	/**
	 * Take the data in our model's private_fields and encrypt them into the
	 * model.body_key field.
	 */
	serialize: function(options)
	{
		options || (options = {});
		if(!this.ensure_key_exists()) return Promise.reject(new Error('no key found for '+ this.id()));

		var json = this.toJSON();
		var data = {};
		this.private_fields.forEach(function(k) {
			if(typeof json[k] == 'undefined') return;
			data[k] = json[k];
		});
		var action = 'encrypt';
		if(options.hash) action = 'encrypt+hash';

		// serialize all *public* relations into an object
		var public_data = {};
		return Promise.all(Object.keys(this.relations).map(function(key) {
			var rel = this.get(key);
			if(!rel) return false;
			if(!this.public_fields.contains(key)) return false;
			if(key == 'keys') return false;

			// make sure the json object doesn't override our relation's
			// serialization
			delete json[key];

			if(rel instanceof Composer.Model)
			{
				var promise = rel.serialize();
			}
			else if(rel instanceof Composer.Collection)
			{
				var promise = Promise.all(rel.map(function(model) {
					return model.serialize();
				}));
			}
			return promise
				.then(function(reldata) {
					// set the result of the serialization into the public data
					public_data[key] = reldata[0];
				});
		}.bind(this))).bind(this)
			.then(function() {
				// serialize the main object now
				var msg = {
					action: action,
					key: this.key,
					data: data,
					private_fields: this.private_fields,
					rawdata: options.rawdata
				};
				return new Promise(function(resolve, reject) {
					cqueue.push(msg, function(err, res) {
						if(err || res.error) return reject(err || res.error);
						var enc = res.success[0];
						if(!options.skip_base64) enc = btoa(enc);
						// update our public data object with the encrypted
						public_data[this.body_key] = enc;
						this.set(public_data, options);
						this.public_fields.forEach(function(pub) {
							if(json[pub] === undefined) return;
							public_data[pub] = json[pub];
						}.bind(this));
						return resolve([public_data, res.success[1]]);
					}.bind(this))
				}.bind(this));
			});
	},

	/**
	 * Take the data serialized in model.body_key and decrypt it into the
	 * model's data.
	 */
	deserialize: function(options)
	{
		options || (options = {});
		if(!this.ensure_key_exists())
		{
			return Promise.reject(new Error('no key found for '+ this.base_url + ': ' + this.id()));
		}

		var data = this.detect_old_format(this.get(this.body_key));

		if(!data) return new Promise.reject('protected: deserialize: missing data: ', this.table, this.id());

		// decrypt all relational objects first
		return Promise.all(Object.keys(this.relations).map(function(key) {
			var rel = this.get(key);
			if(!rel) return false;
			if(!this.public_fields.contains(key)) return false;
			if(key == 'keys') return false;
			if(rel instanceof Composer.Model)
			{
				return rel.deserialize();
			}
			else if(rel instanceof Composer.Collection)
			{
				return Promise.all(rel.map(function(model) {
					return model.deserialize();
				}));
			}
			return promise;
		}.bind(this))).bind(this)
			.then(function() {
				// now decrypt the main object
				return new Promise(function(resolve, reject) {
					var msg = {
						action: 'decrypt',
						key: this.key,
						data: data,
						private_fields: this.private_fields,
						rawdata: options.rawdata
					};
					cqueue.push(msg, function(err, res) {
						if(err || res.error)
						{
							log.error('protected: deserialize: ', this.id(), this.base_url, (err || res.error));
							return reject(err || res.error);
						}
						this.set(res.success, options);
						return resolve(res.success);
					}.bind(this))
				}.bind(this));
			});
	},

	/**
	 * Given a set of keys for an object and a search pattern, find the matching
	 * key and decrypt it using one of the decrypting keys provided by the
	 * search object. This in turn allows the object to be decrypted.
	 * 
	 * Keys are in the format
	 *   {b: <id>, k: <encrypted key>}
	 *   {u: <id>, k: <encrypted key>}
	 * "b" "u" and "p" correspond to board, user, persona
	 * restecpfully.
	 *
	 * Search is in the format:
	 * {
	 *   u: {id: <user id>, k: <user's key>}
	 *   b: {id: <board id>, k: <board's key>}
	 *   ...
	 * }
	 *
	 * Search keys can also be arrays, if you are looking for multiple items
	 * under that key:
	 * {
	 *   u: [
	 *     {id: <user1 id>, k: <user1's key>},
	 *     {id: <user2 id>, k: <user2's key>}
	 *   ],
	 *   b: {id: <board id>, k: <board's key>}
	 * }
	 */
	find_key: function(keys, search, options)
	{
		search || (search = {});
		options || (options = {});

		// first, check the keychain
		log.trace('find_key: ', keys, search, options);
		var key = turtl.profile.get('keychain').find_key(this.id());
		log.trace('find_key: ', key ? 'found in keychain' : 'not in keychain, searching');
		if(key) return key;

		// clone the keys since we perform destructive operations on them during
		// processing and without copying it destroys the original key object,
		// meaning this object can never be decrypted without re-downloading.
		// not good.
		//
		// Also, grab the keys from this object's key store and concat them to
		// the key search list
		var keys = Array.clone(keys || []).concat(this.get('keys').toJSON());

		// automatically add a user entry to the key search
		if(!search.u) search.u = [];
		if(search.u && typeOf(search.u) != 'array') search.u = [search.u];
		search.u.push({id: turtl.user.id(), k: turtl.user.key});

		var search_keys = Object.keys(search);
		var encrypted_key = false;
		var decrypting_key = false;
		for(var x = 0; x < keys.length; x++)
		{
			var key = keys[x];
			if(!key || !key.k) continue;
			var enckey = key.k;
			delete(key.k);
			var match = false;
			Object.each(key, function(id, type) {
				log.trace('find_key: ', id, type);
				if(encrypted_key) return;
				if(search[type] && search[type].id && search[type].id == id)
				{
					encrypted_key = enckey;
					decrypting_key = search[type].k;
				}
				else if(typeOf(search[type] == 'array'))
				{
					var entries = search[type];
					for(x in entries)
					{
						var entry = entries[x];
						if(!entry.k || !entry.id) return;
						if(entry.id == id)
						{
							encrypted_key = enckey;
							decrypting_key = entry.k;
							break;
						}
					}
				}
			});
			if(encrypted_key) break;
		}

		if(decrypting_key && encrypted_key)
		{
			key = this.decrypt_key(decrypting_key, encrypted_key);
		}

		return key || false;
	},

	/**
	 * Generate a random key for this model.
	 */
	generate_key: function(options)
	{
		options || (options = {});

		if(this.key) return this.key;
		this.key = tcrypt.random_key();
		return this.key;
	},

	/**
	 * (re)generate the keys for this object. `members` is an object describing
	 * what items will have access to this object, and is in the format:
	 *
	 * [
	 *   {b: <board id>, k: <board's key>},
	 *   {u: <user id>, k: <user's key>}
	 * ]
	 *
	 * Also note that this operation *wipes out all subkeys for this object* and
	 * replaces them. You must pass in all required data each time!
	 */
	generate_subkeys: function(members, options)
	{
		options || (options = {});
		members || (members = []);

		if(!this.key) return false;

		var keys = [];
		members.each(function(m) {
			m = Object.clone(m);
			var encrypting_key = m.k;
			var enc = this.encrypt_key(encrypting_key, this.key).toString();
			m.k = enc;
			keys.push(m);
		}.bind(this));

		this.set({keys: keys}, options);
		return keys;
	},

	// -------------------------------------------------------------------------
	// NOTE: [encrypt|decrypt]_key() do not use async crypto.
	//
	// the rationale behind this is that the data they operate on is predictably
	// small, and therefor has predictable performance. this eliminates the need
	// to run in the crypto queue, and the need to be otherwise async.
	//
	// consider these functions conscientious objectors to queued crypto.
	// -------------------------------------------------------------------------
	/**
	 * Handles decryption of any/all subkeys.
	 */
	decrypt_key: function(decrypting_key, encrypted_key)
	{
		var raw = this.detect_old_format(encrypted_key);
		try
		{
			var decrypted = tcrypt.decrypt(decrypting_key, raw, {raw: true});
		}
		catch(e)
		{
			log.warn('item ('+ (this.id(true) || parentobj.id) +'): ', e.message);
			return false;
		}
		return decrypted;
	},

	/**
	 * Handles encryption of any/all subkeys.
	 */
	encrypt_key: function(key, key_to_encrypt)
	{
		var encrypted = tcrypt.encrypt(key, key_to_encrypt);
		encrypted = tcrypt.to_base64(encrypted);
		return encrypted;
	}
});

var ProtectedShared = Protected.extend({
});

