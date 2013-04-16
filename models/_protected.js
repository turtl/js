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

	protected_field: 'body',
	public_fields: [],

	set: function(obj, options)
	{
		options || (options = {});
		var set_into_body = function(k, v)
		{
			var body	=	this.get(this.protected_field);
			var set		=	{};
			set[k]		=	v;
			body.set(set);
		}.bind(this);
		Object.each(obj, function(v, k) {
			if(k == this.protected_field)
			{
				if(typeOf(v) == 'string')
				{
					// TODO: CRYPTO
					v	=	JSON.decode(v);
				}
				if(typeOf(v) == 'object')
				{
					this.parent.apply(this, [v, options]);
					Object.each(v, function(v, k) {
						set_into_body(k, v);
					}.bind(this));
				}
			}
		}.bind(this));
		// we processed the body vars already.
		delete obj[this.protected_field];
		return this.parent.apply(this, arguments);
	},

	toJSON: function()
	{
		var data	=	this.parent.apply(this, arguments);
		var body	=	{};
		var newdata	=	{};
		Object.each(data, function(v, k) {
			if(this.public_fields.contains(k))
			{
				newdata[k]	=	v;
			}
			else
			{
				body[k]		=	v;
			}
		}.bind(this));
		newdata[this.protected_field]	=	JSON.encode(body);
		// TODO: CRYPTO
		return newdata;
	}
});

