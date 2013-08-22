var tcrypt = {
	// NOTE: completely unused
	cipher: 'AES',

	/**
	 * Formats data like so:
	 *
	 *   <payload>:i<initial vector>:s<salt>
	 *
	 * This scheme assumes Base64 encoding (otherwise : would be a bad separator)
	 */
	TurtlFormatter: {
		stringify: function (cipherParams)
		{
			// create json object with ciphertext
			var crypto = convert.base64.encode(cipherParams.ciphertext);

			// optionally add iv and salt
			if(cipherParams.iv) crypto += ':i' + convert.binstring_to_hex(cipherParams.iv);
			if(cipherParams.salt) crypto += ':s' + convert.binstring_to_hex(cipherParams.salt);

			// stringify json object
			return crypto;
		},

		parse: function (crypto)
		{
			// parse json string
			var parts = crypto.split(/:/g);
			var params = {
				ciphertext: convert.base64.decode(parts[0])
			}
			parts.shift();
			parts.each(function(p) {
				if(p.match(/^i/)) params.iv = convert.hex_to_binstring(p.slice(1));
				if(p.match(/^s/)) params.salt = convert.hex_to_binstring(p.slice(1));
			});
			return params;
		}
	},

	encrypt: function(key, data, options)
	{
		options || (options = {});

		var opts = Object.merge({
			key: key,
			block_mode: CBC,
			pad_mode: AnsiX923,
		}, options);

		// auto-generate an initial vector if needed
		if(!opts.iv)
			opts.iv = this.iv();

		var ciphertext = new AES(opts).encrypt(data);

		var formatted = this.TurtlFormatter.stringify({
			ciphertext: ciphertext,
			iv: opts.iv
		});

		return formatted;
	},

	decrypt: function(key, encrypted, options)
	{
		options || (options = {});

		var opts = Object.merge({
			key: key,
			block_mode: CBC,
			pad_mode: AnsiX923,
		}, options);

		var params = tcrypt.TurtlFormatter.parse(encrypted);
		if(params.iv) opts.iv = params.iv;

		var de = new AES(opts).decrypt(params.ciphertext);

		if (options.raw)
			return de;

		return convert.utf8.decode(de);
	},

	/**
	 * Generate a key from a password/salt
	 */
	key: function(passphrase, salt, options)
	{
		options || (options = {});
		
		var _kdf = new PBKDF2({
			key_size: (options.key_size || 32),			// note the key size is in bytes
			hasher: SHA1,								// PBKDF2 uses HMAC internally
			iterations: (options.iterations || 400)		// moar = bettar (slowar)
		});
		var key = _kdf.compute(passphrase, salt);

		return key;
	},

	/**
	 * Given a binary key, convert to hex string
	 */
	key_to_string: function(keybytes)
	{
		return convert.base64.encode(keybytes);
	},

	/**
	 */
	key_to_bin: function(keystring)
	{
		return convert.base64.decode(keystring);
	},

	/**
	 * Generate N random bytes, returned as a WordArray
	 */
	random_bytes: function(nBytes)
	{
		// NOTE: this was taken directly from CryptoJS' random() function, but
		// updated to use tcrypt.random_number() instead of Math.random().
		var words = [];
		for (var i = 0; i < nBytes; i += 4) {
			words.push((tcrypt.random_number() * 0x100000000) | 0);
		}
		return words;
	},

	/**
	 * Generate an initial vector. If given a seed, will generate it based off
	 * the seed, otherwise will return a random 16 byte WordArray
	 */
	iv: function(value)
	{
		// if no seed given, return 16 random bytes
		if(!value) return convert.words_to_binstring(tcrypt.random_bytes(16));

		if(value.length < 16)
		{
			// if the IV seed is less than 16 bytes, append random data
			value += convert.words_to_hex(tcrypt.random_bytes(16));
		}
		if(value.length > 16)
		{
			// only grab 16 bytes of seed
			value = value.slice(0, 16)
		}
		return value;
	},

	/**
	 * Generate a random 256bit key.
	 */
	random_key: function(options)
	{
		return convert.words_to_binstring(tcrypt.random_bytes(32));
	},

	/**
	 * SHA256 the given data.
	 */
	hash: function(data, options)
	{
		options || (options = {});

		if(options.raw)
			return new SHA256().hash(data, {return_format: 'binary'});

		return new SHA256().hash(data);
	},

	/**
	 * Generate a random number between 0 and 1.
	 *
	 * Uses window.crypto for random generation, and if not available, bitches
	 * about how insecure your browser is.
	 */
	random_number: function()
	{
		if(window.crypto.getRandomValues)
		{
			// TODO: verify dividing Uint32 / 2^32 is still random
			// TODO: handle QuotaExceededError error in FF (maybe the same in chrome)
			return window.crypto.getRandomValues(new Uint32Array(1))[0] / (Math.pow(2, 32) - 1);
		}
		else
		{
			// TODO: crypto: use real crypto-PRNG
			alert('Your browser does not support cryptographically secure random numbers. Please either update your browser or don\'t use this app =[.');
		}
	},

	/**
	 * Generate a random SHA256 hash
	 */
	random_hash: function()
	{
		return tcrypt.hash(Date.now() + tcrypt.uuid());
	},

	/**
	 * Generate a *random* UUID.
	 */
	uuid: function()
	{
		// taken from stackoverflow.com, modified to use tcrypt's random generator
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
