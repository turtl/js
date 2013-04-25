var tcrypt = {
	// NOTE: completely unused
	cipher: 'AES',

	TagitFormatter: {
		stringify: function (cipherParams)
		{
			// create json object with ciphertext
			var crypto = cipherParams.ciphertext.toString(CryptoJS.enc.Base64);

			// optionally add iv and salt
			if(cipherParams.iv) crypto += ':' + cipherParams.iv.toString();
			if(cipherParams.salt) crypto += ':' + cipherParams.salt.toString();

			// stringify json object
			return crypto;
		},

		parse: function (crypto)
		{
			// parse json string
			var parts = crypto.split(/:/g);

			// extract ciphertext from json object, and create cipher params object
			var cipherParams = CryptoJS.lib.CipherParams.create({
				ciphertext: CryptoJS.enc.Base64.parse(parts[0])
			});

			// optionally extract iv and salt
			if (parts[1]) cipherParams.iv = CryptoJS.enc.Hex.parse(parts[1])
			if (parts[2]) cipherParams.salt = CryptoJS.enc.Hex.parse(parts[2])

			return cipherParams;
		}
	},

	encrypt: function(key, data, options)
	{
		options || (options = {});
		var opts = Object.merge({
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.AnsiX923,
			format: tcrypt.TagitFormatter
		}, options);

		return CryptoJS.AES.encrypt(data, key, opts);
	},

	decrypt: function(key, encrypted, options)
	{
		options || (options = {});
		var opts = Object.merge({
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.AnsiX923,
			format: tcrypt.TagitFormatter
		}, options);
		var de = CryptoJS.AES.decrypt(encrypted, key, opts);
		if(options.raw) return de;
		return CryptoJS.enc.Utf8.stringify(de);
	},

	key: function(passphrase, salt, options)
	{
		options || (options = {});
		return CryptoJS.PBKDF2(passphrase, salt, options);
	},

	iv: function(value)
	{
		if(value.length < 16)
		{
			value += '4c281987249be78a';
		}
		if(value.length > 16)
		{
			value.slice(16)
		}
		return CryptoJS.enc.Utf8.parse(value);
	},

	hash: function(data, options)
	{
		options || (options = {});
		var hash = CryptoJS.SHA256(data);
		if(options.raw) return hash;
		return CryptoJS.enc.Hex.stringify(hash);
	}
};
