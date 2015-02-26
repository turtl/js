"use strict";

// Simple container collection to hold subkeys in an object
var Keys = Composer.Collection.extend({});

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

	serialize: function()
	{
	},

	deserialize: function()
	{
	}
});

var ProtectedShared = Protected.extend({
});

