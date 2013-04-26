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
		}
	},

	public_fields: [],
	private_fields: [],
	key: null,

	set: function(obj, options)
	{
		// NOTE: don't use `arguments` here since we need to explicitely pass in
		// our obj to the parent function
		options || (options = {});
		var ret = this.parent.apply(this, [obj, options]);
		if(!this.key) this.key = this.find_key(obj.keys);
		if(!this.key) return false;
		if(!options.ignore_body) this.process_body(obj, options);
		return ret;
	},

	process_body: function(obj, options)
	{
		options || (options = {});

		var body = obj['body'];
		if(!body) return false;

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
			// TODO: CRYPTO
			var json = JSON.encode(body);
			var encbody = tcrypt.encrypt(this.key, json);

			newdata['body']	=	encbody.toString();
		}
		return newdata;
	},

	find_key: function(keys)
	{
		var uid = tagit.user.id(true);
		if(!uid) return false;
		var found = false;
		for(x in keys)
		{
			var key = keys[x];
			if(!key.u) continue;
			if(key.u != uid) continue;
			found = key.k;
			break;
		}
		if(!found) return false;
		var key = tcrypt.decrypt(tagit.user.get_key(), found, {raw: true});
		return key;
	},

	generate_key: function(options)
	{
		options || (options = {});

		if(this.key) return this.key;
		this.key = tcrypt.random_key();
		return this.key;
	},

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

