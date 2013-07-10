/**
 * This is a SPECIAL model type that allows you to treat it like a normal model.
 * The difference is that when you save data to this model, any data stored in
 * non-public fields (as determined by the member var `public_fields`) is stored
 * in a sub-model under the "body" key.
 *
 * The idea of this is that when converting this model to JSON (or converting
 * from JSON) you have a set of fields that are allowed to be plaintext, and
 * one field ("body") that stores all the protected data.
 *
 * This way, if you want to encrypt your protected data, you can do so on one
 * field when converting to JSON, and vice vera when converting from JSON.
 */
var Protected = Composer.RelationalModel.extend({
	relations: {
		body: {
			type: Composer.HasOne,
			model: 'Composer.Model'
		},
		keys: {
			type: Composer.HasMany,
			collection: 'Keys'
		}
	},

	key: null,

	public_fields: [],
	private_fields: [],

	set: function(obj, options)
	{
		// NOTE: don't use `arguments` here since we need to explicitely pass in
		// our obj to the parent function
		options || (options = {});
		var body = obj.body;
		delete obj.body;
		var ret = this.parent.apply(this, [obj, options]);
		if(body != undefined) obj.body = body;
		if(!options.ignore_body) this.process_body(obj, options);
		return ret;
	},

	process_body: function(obj, options)
	{
		options || (options = {});

		var body = obj['body'];
		if(!body) return false;

		if(!this.key) this.key = this.find_key(obj.keys);
		if(!this.key) return false;

		if(typeOf(body) == 'string')
		{
			body = tcrypt.decrypt(this.key, body);
			body = JSON.decode(body);
		}

		if(typeOf(body) == 'object')
		{
			this.set(body, Object.merge({ignore_body: true}, options));
			Object.each(body, function(v, k) {
				var body	=	this.get('body');
				var set		=	{};
				set[k]		=	v;
				body.set(set);
			}.bind(this));
		}
	},

	toJSON: function()
	{
		var data	=	this.parent();
		var body	=	{};
		var newdata	=	{};
		Object.each(data, function(v, k) {
			if(this.public_fields.contains(k))
			{
				newdata[k]	=	v;
			}
			else
			{
				if(this.private_fields.length > 0)
				{
					if(this.private_fields.contains(k) || window._toJSON_disable_protect)
					{
						body[k]	=	v;
					}
				}
				else
				{
					body[k]		=	v;
				}
			}
		}.bind(this));
		if(window._toJSON_disable_protect)
		{
			Object.merge(newdata, body);
		}
		else
		{
			var json = JSON.encode(body);
			// TODO: crypto: initial padding?
			var encbody = tcrypt.encrypt(this.key, json);

			newdata['body']	=	encbody.toString();
		}
		return newdata;
	},

	clone: function()
	{
		window._toJSON_disable_protect = true;
		var copy = this.parent.apply(this, arguments);
		window._toJSON_disable_protect = false;
		copy.key = this.key;
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
		// TODO: investigate removing this for public projects??
		if(!uid) return false;
		search.u = {id: uid, k: tagit.user.get_key()};
		delete(search.k);  // sorry, "k" is reserved for keys
		var search_keys = Object.keys(search);
		var encrypted_key = false;
		var decrypting_key = false;

		for(x in keys)
		{
			var key = keys[x];
			if(!key.k) continue;
			var enckey = key.k;
			delete(key.k);
			var match = false;
			Object.each(key, function(v, k) {
				if(encrypted_key) return;
				if(search[k] && search[k].id && search[k].id == v)
				{
					encrypted_key = enckey;
					decrypting_key = search[k].k;
				}
			});
			if(encrypted_key) break;
		}

		if(!decrypting_key || !encrypted_key) return false;
		var key = tcrypt.decrypt(decrypting_key, encrypted_key, {raw: true});
		return key;
	},

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
			var enc = tcrypt.encrypt(key, this.key).toString();
			m.k = enc;
			keys.push(m);
		}.bind(this));

		this.set({keys: keys});
		return keys;
	}
});

var ProtectedShared = Composer.RelationalModel.extend({
}, Protected);

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});
