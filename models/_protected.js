"use strict";

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});

// threaded decryption queue
var cqueue = new Queue(function(task, done) {
	var action = task.action;
	var key = task.key;
	var data = task.data;
	var private_fields = task.private_fields;
	var rawdata = task.rawdata;

	// generate a random seed for sjcl
	var seed = new Uint32Array(32);
	window.crypto.getRandomValues(seed);

	var worker = new Worker(window._base_url + '/library/tcrypt.thread.js');

	switch(action)
	{
	case 'encrypt':
		// if we only have 1 (one) private field, forgo JSON serialization and
		// instead just encrypt that field directly.
		if(private_fields.length == 1)
		{
			var enc_data = data[private_fields[0]];
		}
		else
		{
			var enc_data = JSON.stringify(data);
		}

		var wmsg = {
			cmd: 'encrypt+hash',
			args: [
				key,
				enc_data,
				{
					// can't use window.crypto (for random IV), so generate IV here
					iv: tcrypt.iv(),
					utf8_random: tcrypt.random_number()
				}
			],
			seed: seed
		};
		var completefn = function(e)
		{
			var res = e.data;
			if(res.type != 'success')
			{
				var enc = false;
				log.error('tcrypt.thread: err: ', res);
				return {error: {res: res, stack: e.stack}};
			}
			// TODO: uint8array?
			var enc = tcrypt.words_to_bin(res.data.c);
			var hash = res.data.h;

			return {success: [enc, hash]};
		};
		break;
	case 'decrypt':
		var wmsg = {
			cmd: 'decrypt',
			args: [key, data],
			seed: seed
		};
		var completefn = function(e)
		{
			var res = e.data;
			if(res.type != 'success')
			{
				var dec = false;
				log.error('tcrypt.thread: err: ', res, e.stack);
				return {error: {res: res, stack: e.stack}};
			}
			// if we only have one private field, assume that field was
			// encrypted *without* JSON serialization (and shove it into a
			// new object)
			if(rawdata)
			{
				var dec = {};
				dec[private_fields[0]] = res.data;
			}
			else
			{
				var dec = JSON.parse(res.data);
			}

			return {success: dec};
		};
		break;
	}
	worker.postMessage(wmsg);
	worker.addEventListener('message', function(e) {
		var res = completefn(e);
		worker.terminate();
		done(res);
	}.bind(this));
}, 4);

var Protected = Composer.RelationalModel.extend({
	relations: {
		_body: {
			model: 'Composer.Model'
		},
		keys: {
			collection: 'Keys'
		}
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
	 * Take the data in our models private_fields and encrypt them into the
	 * model.body_key field.
	 */
	serialize: function(options)
	{
		options || (options = {});
		if(!this.ensure_key_exists(this.get('keys'))) return false;


		var json = this.toJSON();
		var data = {};
		this.private_fields.forEach(function(k) {
			if(typeof json[k] == 'undefined') return;
			data[k] = json[k];
		});
		console.log('seR: data: ', data, json, this.private_fields);
		return new Promise(function(resolve, reject) {
			var msg = {
				action: 'encrypt',
				key: this.key,
				data: data,
				private_fields: this.private_fields
			};
			cqueue.push(msg, function(res) {
				if(res.error) return reject(res.error);
				var obj = {};
				obj[this.body_key] = btoa(res.success[0]);
				this.set(obj);
				resolve(res.success);
			}.bind(this))
		}.bind(this));
	},

	/**
	 * Take the data serialized in model.body_key and decrypt it into the
	 * model's data.
	 */
	deserialize: function(options)
	{
		options || (options = {});
		if(!this.ensure_key_exists(this.get('keys'))) return false;

		var data = this.detect_old_format(this.get(this.body_key));
		return new Promise(function(resolve, reject) {
			var msg = {
				action: 'decrypt',
				key: this.key,
				data: data,
				private_fields: this.private_fields
			};
			cqueue.push(msg, function(res) {
				if(res.error) return reject(res.error);
				this.set(res.success);
				resolve(res.success);
			}.bind(this))
		}.bind(this));
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

		// clone the keys since we perform destructive operations on them during
		// processing and without copying it destroys the original key object,
		// meaning this object can never be decrypted without re-downloading.
		// not good.
		var keys = Array.clone(keys);

		// automatically add a user entry to the key search
		if(!search.u) search.u = [];
		if(search.u && typeOf(search.u) != 'array') search.u = [search.u];
		search.u.push({id: turtl.user.id(), k: turtl.user.get_key()});

		var search_keys = Object.keys(search);
		var encrypted_key = false;
		var decrypting_key = false;

		for(var x in keys)
		{
			var key = keys[x];
			if(!key || !key.k) continue;
			var enckey = key.k;
			delete(key.k);
			var match = false;
			Object.each(key, function(id, type) {
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

		var key = false;
		if(decrypting_key && encrypted_key)
		{
			key = this.decrypt_key(decrypting_key, encrypted_key);
		}

		// if we didn't find our key, check the user's data
		if(!key)
		{
			key = turtl.profile.get('keychain').find_key(this.id());
		}

		return key;
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
	 * TODO: possibly remove above restriction.
	 */
	generate_subkeys: function(members, options)
	{
		options || (options = {});
		members || (members = []);

		if(!this.key) return false;

		var keys = [];
		members.each(function(m) {
			m = Object.clone(m);
			var key = m.k;
			var enc = this.encrypt_key(key, this.key).toString();
			m.k = enc;
			keys.push(m);
		}.bind(this));

		this.set({keys: keys}, options);
		return keys;
	}
});

var ProtectedShared = Protected.extend({
});

