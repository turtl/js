var tcrypt = {
	// NOTE: completely unused
	cipher: 'AES',

	TagitFormatter: {
		stringify: function (cipherParams)
		{
			// create json object with ciphertext
			var crypto = cipherParams.ciphertext.toString(CryptoJS.enc.Base64);

			// optionally add iv and salt
			if(cipherParams.iv) crypto += ':i' + cipherParams.iv.toString();
			if(cipherParams.salt) crypto += ':s' + cipherParams.salt.toString();

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
			parts.shift();
			parts.each(function(p) {
				var val = CryptoJS.enc.Hex.parse(p.slice(1));
				if(p.match(/^i/)) cipherParams.iv = val;
				if(p.match(/^s/)) cipherParams.salt = val;
			});

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

		// auto-generate an initial vector if needed
		if(!opts.iv && typeOf(key) != 'string')
		{
			opts.iv = tcrypt.iv();
		}

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
		var params = tcrypt.TagitFormatter.parse(encrypted);
		if(params.iv) opts.iv = params.iv;
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
		if(!value) return CryptoJS.lib.WordArray.random(16);

		if(value.length < 16)
		{
			value += '4c281987249be78a';
		}
		if(value.length > 16)
		{
			value = value.slice(0, 16)
		}
		return CryptoJS.enc.Utf8.parse(value);
	},

	random_key: function(options)
	{
		options || (options = {});
		return CryptoJS.lib.WordArray.random(32);
	},

	hash: function(data, options)
	{
		options || (options = {});
		var hash = CryptoJS.SHA256(data);
		if(options.raw) return hash;
		return CryptoJS.enc.Hex.stringify(hash);
	},

	random_number: function()
	{
		if(window.crypto.getRandomValues)
		{
			return window.crypto.getRandomValues(new Uint32Array(1))[0] / (Math.pow(2, 32) - 1);
		}
		else
		{
			// TODO: crypto: use real crypto-PRNG
			return Math.random();
		}
	},

	uuid: function()
	{
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = tcrypt.random_number()*16|0;
			var v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	},

	// TODO: do, obvis
	gen_symmetric_keys: function(seed)
	{
		return {
			public: '1234',
			private: '5678'
		};
	}
};
