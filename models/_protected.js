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

	// holds the cryptographic key to encrypt/decrypt model data with
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
	 * This is the main function for data decryption for any extending model.
	 * It provides a standard interface, using the current key, to decrypt the
	 * model's data.
	 *
	 * It can be extended, for instance in the case of shared-key decryption,
	 * where instead of this.key it could use this.private_key.
	 */
	decrypt: function(data)
	{
		return tcrypt.decrypt(this.key, data);
	},

	/**
	 * This is the main function for data encryption for any extending model.
	 * It provides a standard interface, using the current key, to encrypt the
	 * model's data.
	 *
	 * It can be extended, for instance in the case of shared-key encryption,
	 * where instead of this.key it could use this.public_key.
	 */
	encrypt: function(data)
	{
		// TODO: crypto: investigate prefixing/suffixing padding with random
		// bytes. Should be easy enough to filter out when deserializing (since
		// it's always JSON), but would give an attacker less data about the
		// payload (it wouldn't ALWAYS start with "{")
		return tcrypt.encrypt(this.key, data);
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
			_body	=	this.decrypt(_body);
			_body	=	JSON.decode(_body);
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
		var json	=	JSON.encode(_body);
		var encbody	=	this.encrypt(json);

		newdata[this.body_key]	=	encbody.toString();
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
	 *   {p: <id>, k: <encrypted key>}
	 *   {u: <id>, k: <encrypted key>}
	 * "p" "u" and "a" correspond to project, user, account (aka persona)
	 * restecpfully.
	 *
	 * Search is in the format:
	 *
	 * {
	 *   u: {id: <user id>, k: <user's key>}
	 *   p: {id: <project id>, k: <project's key>}
	 *   ...
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
		var keys = Object.clone(keys);

		var uid = tagit.user.id(true);
		// TODO: investigate removing this restriction for public projects??
		if(!uid) return false;

		// automatically add a user entry to the key search
		search.u = {id: uid, k: tagit.user.get_key()};

		delete(search.k);  // sorry, "k" is reserved for keys
		var search_keys		=	Object.keys(search);
		var encrypted_key	=	false;
		var decrypting_key	=	false;

		for(x in keys)
		{
			var key		=	keys[x];
			if(!key.k) continue;
			var enckey	=	key.k;
			delete(key.k);
			var match	=	false;
			Object.each(key, function(v, k) {
				if(encrypted_key) return;
				if(search[k] && search[k].id && search[k].id == v)
				{
					encrypted_key	=	enckey;
					decrypting_key	=	search[k].k;
				}
			});
			if(encrypted_key) break;
		}

		if(!decrypting_key || !encrypted_key) return false;
		// NOTE: we don't use Protected.decrypt since we're not using this.key
		var key = tcrypt.decrypt(decrypting_key, encrypted_key, {raw: true});
		return key;
	},

	/**
	 * Generate a random key for this model.
	 *
	 * TODO: base this off of the current user's key instead of just randomness.
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
	 * what items will ahve access to this object, and is in the format:
	 *
	 * [
	 *   {p: <project id>, k: <project's key>},
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

		// by default add the user's key
		if(!options.skip_user_key)
		{
			members.push({u: tagit.user.id(), k: tagit.user.get_key()});
		}

		var keys = [];
		members.each(function(m) {
			var key = m.k;
			// NOTE: we don't use Protected.encrypt here since we're not
			// encrypting via this.key
			var enc = tcrypt.encrypt(key, this.key).toString();
			m.k = enc;
			keys.push(m);
		}.bind(this));

		this.set({keys: keys});
		return keys;
	}
});

var ProtectedShared = Composer.RelationalModel.extend({
	public_key: null,
	private_key: null,

	decrypt: function(data)
	{
		return data;
	},

	encrypt: function(data)
	{
		return data;
	},

	ensure_key_exists: function()
	{
		// TODO: remove me once shared key generation works
		return true;

		if(!this.public_key || !this.private_key) return false;
		return true;
	}
}, Protected);

