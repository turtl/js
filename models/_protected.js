"use strict";

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});

// threaded decryption queue
// NOTE: this goes away if/when we implement native crypto
var cqueue = new CryptoQueue({
	workers: 4
});

var ProtectedError = extend_error(Error, 'ProtectedError');
var ProtectedEmptyError = extend_error(ProtectedError, 'ProtectedEmptyError');
var ProtectedMissingBodyError = extend_error(ProtectedError, 'ProtectedMissingBodyError');
var ProtectedNoKeyFoundError = extend_error(ProtectedError, 'ProtectedNoKeyFoundError');

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
	 * Make sure that a symmetric key exists for this model. If not, returns
	 * false, if so returns the key.
	 *
	 * Takes a set of key data holding the encrypted key in case the key simply
	 * needs to be found/decrypted.
	 */
	ensure_key_exists: function()
	{
		if(!this.key) this.key = this.find_key();
		if(!this.key) return false;
		return this.key;
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
	 * If this model is new, create a new key, otherwise ensure/grab it.
	 */
	create_or_ensure_key: function(options)
	{
		options || (options = {});

		if(this.is_new()) this.generate_key();
		else this.ensure_key_exists();
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
		if(!this.ensure_key_exists())
		{
			return Promise.reject(new ProtectedNoKeyFoundError('no key found for '+ this.base_url + ': ' + this.id()));
		}
		var key = this.key;

		var json = this.toJSON();
		var data = {};
		this.private_fields.forEach(function(k) {
			data[k] = this.get(k, undefined);
		}.bind(this));

		if(options.alert_empty && Object.keys(data).length == 0)
		{
			throw new ProtectedEmptyError();
		}

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

			var do_serialize = function(model)
			{
				if(!(model instanceof Protected)) return Promise.resolve([model.toJSON(), false]);
				try
				{
					return model.serialize({alert_empty: true});
				}
				catch(err)
				{
					return false;
				}
			};

			if(rel instanceof Composer.Model)
			{
				var promise = Promise.resolve(do_serialize(rel))
					.then(function(data) {
						if(data && data[0]) public_data[key] = data[0];
					});
			}
			else if(rel instanceof Composer.Collection)
			{
				var coll = [];
				var promise = Promise.map(rel.models(), function(model) {
					return Promise.resolve(do_serialize(model))
						.then(function(data) {
							if(data && data[0]) coll.push(data[0]);
						});
				}).then(function() {
					public_data[key] = coll;
				});
			}
			if(!promise) return false;

			return promise;
		}.bind(this))).bind(this)
			.then(function() {
				// serialize the main object now
				var final_data = data;
				if(options.rawdata) {
					final_data = data[Object.keys(data)[0]];
				} else {
					final_data = tcrypt.from_string(JSON.stringify(data));
				}
				var msg = {
					action: 'encrypt',
					args: [
						key,
						final_data,
						{ nonce: tcrypt.random_bytes(tcrypt.noncelen()) }
					],
				};
				return new Promise(function(resolve, reject) {
					cqueue.push(msg, function(err, res) {
						if(err || res.error) return reject(err || res.error);
						var enc = res.success.c;
						if(!options.skip_base64) enc = tcrypt.to_base64(enc);
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
			return Promise.reject(new ProtectedNoKeyFoundError('no key found for '+ this.base_url + ': ' + this.id()));
		}
		var key = this.key;

		var body = this.get(this.body_key);
		if(!body) return new Promise.reject('protected: deserialize: missing data: ', this.table || this.base_url, this.id());
		var data = body;
		if(!options.rawdata) data = tcrypt.from_base64(data);
		if(!data) return new Promise.reject('protected: deserialize: missing data: ', this.table || this.base_url, this.id());

		// decrypt all relational objects first
		return Promise.all(Object.keys(this.relations).map(function(key) {
			var rel = this.get(key);
			if(!rel) return false;
			if(rel.has_body && !rel.has_body()) return false;
			if(!this.public_fields.contains(key)) return false;
			if(key == 'keys') return false;

			var do_deserialize = function(model)
			{
				if(!(model instanceof Protected)) return false;
				try
				{
					return model.deserialize();
				}
				catch(err)
				{
					if(err instanceof ProtectedMissingBodyError)
					{
						return false;
					}
					throw err;
				}
			};

			if(rel instanceof Composer.Model)
			{
				return do_deserialize(rel);
			}
			else if(rel instanceof Composer.Collection)
			{
				return Promise.all(rel.map(function(model) {
					return do_deserialize(model);
				}));
			}
			return null;
		}.bind(this))).bind(this)
			.then(function() {
				// now decrypt the main object
				return new Promise(function(resolve, reject) {
					var msg = {
						action: 'decrypt',
						args: [
							key,
							data,
						],
					};
					cqueue.push(msg, function(err, res) {
						if(err || res.error)
						{
							log.error('protected: deserialize: ', this.id(), this.base_url, (err || res.error.res));
							return reject(err || res.error.res);
						}
						return resolve(res.success);
					}.bind(this))
				}.bind(this));
			})
			.tap(function(bin) {
				if(options.setter) return options.setter(bin)
				if(options.rawdata) {
					var body = {};
					var datakey = this.private_fields[0];
					body[datakey] = bin;
				} else {
					var json = tcrypt.to_string(bin);
					var body = JSON.parse(json);
				}
				this.set(body, options);
			});
	},

	/**
	 * like toJSON(), but only returns public fields (and the body field) in the
	 * returned object. This is a good function to call on a model if you are
	 * persisting it to disk/API.
	 */
	safe_json: function()
	{
		var safe_keys = this.public_fields.slice(0);
		safe_keys.push(this.body_key);
		var safe = {};
		safe_keys.forEach(function(key) {
			var myval = {};
			var val = this.get(key, myval);
			var to_json = function(model) {
				if(model instanceof Protected) {
					return model.safe_json();
				} else {
					return model.toJSON();
				}
			};
			if(val instanceof Composer.Collection) {
				val = val.map(to_json);
			} else if(val instanceof Composer.Model) {
				val = to_json(val);
			}
			if(val !== myval) safe[key] = val;
		}.bind(this));
		return Composer.object.clone(safe);
	},

	/**
	 * Override me to return a search based on this model's subkeys.
	 */
	get_key_search: function()
	{
		return new Keychain();
	},

	/**
	 * Find this models key by crawling up the subkey tree. First we check for
	 * direct entries in the profile keychain. If that doesn't work, then we ask
	 * the model to generate a keychain with entries in it that could possibly
	 * decrypt the model's key.
	 */
	find_key: function(options)
	{
		options || (options = {});

		log.trace('find_key: init: ', options);

		// first, check the keychain
		var keychain = turtl.profile.get('keychain');
		var key = keychain.find_key(this.id());
		log.trace('find_key: ', key ? 'found in keychain' : 'not in keychain, searching');
		if(key) return key;

		// clone the keys since we perform destructive operations on them during
		// processing and without copying it destroys the original key object,
		// meaning this object can never be decrypted without re-downloading.
		// not good.
		//
		// Also, grab the keys from this object's key store and concat them to
		// the key search list
		var keys = this.get('keys').toJSON();
		log.trace('find_key: keys: ', keys);

		// grab the model's key search
		var search = this.get_key_search();

		// make sure the user is part of the key search (helps keychain entries
		// decrypt themselves)
		search.upsert_key(turtl.user.id(), 'user', turtl.user.key, {skip_save: true});

		var decrypted_key = null;
		for(var i = 0, n = keys.length; i < n; i++) {
			var keyentry = keys[i];
			var encrypted_key = keyentry.k;
			var type_key = Object.keys(keyentry)
				.filter(function(k) { return k != 'k'; })[0];
			var item_id = keyentry[type_key];
			log.trace('find_key: search item ', type_key, item_id);
			if(!item_id) continue;
			// check the custom search first, if that fails, check the keychain
			var key = search.find_key(item_id) || keychain.find_key(item_id);
			if(!key) continue;
			log.trace('find_key: found matching key from', type_key, item_id);
			var decrypted_key = this.decrypt_key(key, encrypted_key);
			if(!decrypted_key) continue;
			break;
		}
		return decrypted_key || false;
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
			var encrypting_key = m.k;
			var enc = this.encrypt_key(encrypting_key, this.key).toString();
			keys.push(Composer.object.merge({}, m, {k: enc}));
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
		var raw = tcrypt.from_base64(encrypted_key);
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
	},

	is_crypto_error: function(err)
	{
		var crypto_error =
			(err.data && err.data.match(/Authentication error/i)) ||
			(err.message && err.message.match(/no key found for/i)) ||
			err instanceof ProtectedNoKeyFoundError ||
			err instanceof TcryptError;
		return crypto_error;
	},


	has_body: function()
	{
		return !!this.get(this.body_key);
	},
});

var ProtectedShared = Protected.extend({
	public_key: null,
	private_key: null,

	encrypt: function()
	{
		var body = this.get(this.body_key);
		return tcrypt.asym.encrypt(this.public_key, body).bind(this)
			.then(function(msg) {
				var set = {};
				set[this.body_key] = msg;
				this.set(set);
				return msg;
			});
	},

	decrypt: function()
	{
		var msg = this.get(this.body_key);
		return tcrypt.asym.decrypt(this.private_key, msg).bind(this)
			.then(function(data) {
				var set = {};
				set[this.body_key] = data;
				this.set(set);
				return data;
			});
	}
});

