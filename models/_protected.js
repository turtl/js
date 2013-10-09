"use strict";

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});

/**
 * This is a SPECIAL model type that allows you to treat it like a normal model.
 * The difference is that when you save data to this model, any data stored in
 * non-public fields (as determined by the member var `public_fields`) is stored
 * in a sub-model under the "_body" key.
 *
 * The idea of this is that when converting this model to JSON (or converting
 * from JSON) you have a set of fields that are allowed to be plaintext, and
 * one field ("_body") that stores all the protected data.
 *
 * This way, if you want to encrypt your protected data, you can do so on one
 * field when converting to JSON, and vice vera when converting from JSON.
 */
var Protected = Composer.RelationalModel.extend({
	relations: {
		_body: {
			type: Composer.HasOne,
			model: 'Composer.Model'
		},
		keys: {
			type: Composer.HasMany,
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
		var raw	=	data.match(/:i[0-9a-f]{32}$/) ? data : convert.base64.decode(data);
		return raw;
	},

	/**
	 * This is the main function for data deserialization for any extending model.
	 * It provides a standard interface, using the current key, to decrypt the
	 * model's protected data.
	 */
	deserialize: function(data, parentobj)
	{
		if(!this.key) return false;
		var raw			=	this.detect_old_format(data);
		var decrypted	=	tcrypt.decrypt(this.key, raw);
		try
		{
			var obj			=	JSON.decode(decrypted);
		}
		catch(e)
		{
			console.log('err: protected: error deserializing: ', e);
			console.log('err: this id: ', this.id());
			console.log('err: key: ', this.key.length, this.key);
			//console.trace();
		}
		return obj;
	},

	/**
	 * This is the main function for data serialization for any extending model.
	 * It provides a standard interface, using the current key, to encrypt the
	 * model's protected data.
	 */
	serialize: function(data, parentobj)
	{
		if(!this.key) return false;
		var json	=	JSON.encode(data);
		// TODO: crypto: investigate prefixing/suffixing padding with random
		// bytes. Should be easy enough to filter out when deserializing (since
		// it's always JSON), but would give an attacker less data about the
		// payload (it wouldn't ALWAYS start with "{")
		var encrypted	=	tcrypt.encrypt(this.key, json);
		encrypted		=	convert.base64.encode(encrypted);
		return encrypted;
	},

	/**
	 * Handles decryption of any/all subkeys.
	 */
	decrypt_key: function(decrypting_key, encrypted_key)
	{
		var raw	=	this.detect_old_format(encrypted_key);
		return tcrypt.decrypt(decrypting_key, raw);
	},

	/**
	 * Handles encryption of any/all subkeys.
	 */
	encrypt_key: function(key, key_to_encrypt)
	{
		var encrypted	=	tcrypt.encrypt(key, key_to_encrypt);
		encrypted		=	convert.base64.encode(encrypted);
		return encrypted;
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
	 * Override Model.set in order to provide a way to hook into a model's data
	 * and extract encrypted components into our protected storage.
	 */
	set: function(obj, options)
	{
		// NOTE: don't use `arguments` here since we need to explicitely pass in
		// our obj to the parent function
		options || (options = {});
		var _body	=	obj[this.body_key];
		delete obj[this.body_key];
		var ret		=	this.parent.apply(this, [obj, options]);
		if(_body != undefined) obj[this.body_key] = _body;
		if(!options.ignore_body) this.process_body(obj, options);
		return ret;
	},

	/**
	 * Takes data being set into the model, and pieces it off based on whether
	 * it's public or private data. Public data is set like any model data, but
	 * private data is stored separately in the Model._body sub-model, which
	 * when serislizing, is JSON-encoded and encrypted.
	 */
	process_body: function(obj, options)
	{
		options || (options = {});

		var _body	=	obj[this.body_key];
		if(!_body) return false;

		if(!this.ensure_key_exists(obj.keys)) return false;

		if(typeOf(_body) == 'string')
		{
			// decrypt/deserialize the body
			_body	=	this.deserialize(_body, obj);
		}

		if(typeOf(_body) == 'object')
		{
			this.set(_body, Object.merge({ignore_body: true}, options));
			Object.each(_body, function(v, k) {
				var _body	=	this.get('_body');
				var set		=	{};
				set[k]		=	v;
				_body.set(set);
			}.bind(this));
		}
	},

	/**
	 * Special toJSON function that serializes the model making sure to put any
	 * protected fields into an encrypted container before returning.
	 */
	toJSON: function()
	{
		// grab the normal serialization
		var data	=	this.parent();
		var _body	=	{};
		var newdata	=	{};

		// detect if we're even using encryption (on by default). it's useful to
		// disable decryption when serializing a model to a view.
		var disable_encryption	=	window._toJSON_disable_protect;

		// just return normally if encryption is disabled (no need to do
		// anything special)
		if(disable_encryption) return data;

		// this process only pulls fields from public_fields/private_fields, so
		// any fields not specified will be ignore during serialization.
		//
		// if encryption is disabled, the model is serialized as 
		Object.each(data, function(v, k) {
			if(this.public_fields.contains(k))
			{
				// public field, store it in our main return container
				newdata[k]	=	v;
			}
			else if(this.private_fields.contains(k))
			{
				// private field, store it in protected container
				_body[k]	=	v;
			}
		}.bind(this));

		// serialize the body (encrypted)
		var encbody	=	this.serialize(_body, newdata);

		newdata[this.body_key]	=	encbody;
		return newdata;
	},

	/**
	 * Since clone uses Model.toJSON (which by default will return encrypted
	 * data), we have to explicitely tell it we don't want encrypted
	 * serialization when cloning.
	 */
	clone: function()
	{
		window._toJSON_disable_protect = true;
		var copy	=	this.parent.apply(this, arguments);
		window._toJSON_disable_protect = false;
		copy.key	=	this.key;
		return copy;
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

		var search_keys		=	Object.keys(search);
		var encrypted_key	=	false;
		var decrypting_key	=	false;

		for(x in keys)
		{
			var key		=	keys[x];
			if(!key || !key.k) continue;
			var enckey	=	key.k;
			delete(key.k);
			var match	=	false;
			Object.each(key, function(id, type) {
				if(encrypted_key) return;
				if(search[type] && search[type].id && search[type].id == id)
				{
					encrypted_key	=	enckey;
					decrypting_key	=	search[type].k;
				}
				else if(typeOf(search[type] == 'array'))
				{
					var entries	=	search[type];
					for(x in entries)
					{
						var entry	=	entries[x];
						if(!entry.k || !entry.id) return;
						if(entry.id == id)
						{
							encrypted_key	=	enckey;
							decrypting_key	=	entry.k;
							break;
						}
					}
				}
			});
			if(encrypted_key) break;
		}

		var key	=	false;
		if(decrypting_key && encrypted_key)
		{
			key	=	this.decrypt_key(decrypting_key, encrypted_key);
		}

		// if we didn't find our key, check the user's data
		if(!key)
		{
			key	=	turtl.user.find_user_key(this.id());
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
	 * Note that an entry for the current user is automatically generated unless
	 * options.skip_user_key is specified.
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
			m	=	Object.clone(m);
			var key = m.k;
			var enc = this.encrypt_key(key, this.key).toString();
			m.k = enc;
			keys.push(m);
		}.bind(this));

		this.set({keys: keys}, options);
		return keys;
	}
});

/**
 * Provides what the Protected model does (a way to have public/private auto-
 * encrypted fields in a model) but with shared-key encryption instead of
 * symmetric.
 *
 * The process is this: all normal serialization/deserialization happens in the
 * Protected model (using the symmetric AES key for that model). Then either
 * before or after (depending on whether deserializing/serializing) the model's
 * AES key is encrypted/decrypted via the ProtectedModel's public/private keys.
 *
 * This is how PGP works, and allows sharing of data without re-encrypting the
 * whole payload: encrypt once, then send encrypted keys to recipients via their
 * public keys.
 */
var ProtectedShared = Protected.extend({
	recipients: [],

	initialize: function()
	{
		if(!this.key) this.key = this.generate_key();
		return this.parent.apply(this, arguments);
	},

	deserialize: function(data, parentobj)
	{
		// grab our private keys from our personas and use them to decrypt the
		// object's AES key
		var search	=	{
			p: turtl.user.get('personas').map(function(p) {
				return {id: p.id(), k: p.get('privkey')};
			})
		};
		if(!this.key) return false;
		return this.parent.apply(this, arguments);
	},

	serialize: function(data, parentobj)
	{
		return this.parent.apply(this, arguments);
	},

	decrypt_key: function(decrypting_key, encrypted_key)
	{
		encrypted_key	=	convert.base64.decode(encrypted_key);
		tcrypt.decrypt_rsa(decrypting_key, encrypted_key, {async: function(key) {
			this.trigger('rsa-decrypt', key);
		}.bind(this)});
		return false;
	},

	encrypt_key: function(key, key_to_encrypt)
	{
		var encrypted_key	=	tcrypt.encrypt_rsa(key, key_to_encrypt);
		encrypted_key		=	convert.base64.encode(encrypted_key);
		return encrypted_key;
	},

	add_recipient: function(persona)
	{
		this.recipients.push({
			p: persona.id(),
			k: persona.get('pubkey')
		});
		this.generate_subkeys(this.recipients, {skip_user_key: true});
	},

	ensure_key_exists: function()
	{
		if(!this.key) return false;
		return this.key;
	},

	setup_keys: function(keydata)
	{
		// we're looking for a key, and the one we have is probably the auto-
		// generated one from initialize
		this.key	=	false;

		// we don't have a key! decrypt it from our keys data and run our
		// deserialize/set when done
		this.bind('rsa-decrypt', function(key) {
			this.unbind('rsa-decrypt');
			this.key	=	key;
			this.trigger('have-key');
		}.bind(this));

		// this will find/decrypt our key, but async (and triggers rsa-decrypt
		// when it's done, which is bound above)
		var search	=	{
			p: turtl.user.get('personas').map(function(p) {
				return {id: p.id(), k: p.get('privkey')};
			})
		};
		this.find_key(keydata, search);
	}
});

