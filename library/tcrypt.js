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

		if(key.length > 32) key = convert.utf8.decode(key);

		var opts = Object.merge({
			key: key,
			block_mode: CBC,
			pad_mode: AnsiX923,
		}, options);

		// auto-generate an initial vector if needed
		if(!opts.iv) opts.iv = tcrypt.iv();

		// make sure to UTF8 encode data
		data	=	convert.utf8.encode(data);

		var ciphertext = new AES(opts).encrypt(data);

		var formatted = tcrypt.TurtlFormatter.stringify({
			ciphertext: ciphertext,
			iv: opts.iv
		});

		return formatted;
	},

	decrypt: function(key, encrypted, options)
	{
		options || (options = {});

		if(key.length > 32) key = convert.utf8.decode(key);

		var opts = Object.merge({
			key: key,
			block_mode: CBC,
			pad_mode: AnsiX923,
		}, options);

		var params = tcrypt.TurtlFormatter.parse(encrypted);
		if(params.iv) opts.iv = params.iv;

		var de = new AES(opts).decrypt(params.ciphertext);

		try
		{
			var decode	=	convert.utf8.decode(de);
		}
		catch(e)
		{
			var decode	=	de;
		}

		return decode;
	},

	/**
	 * Generate a key from a password/salt
	 */
	key: function(passphrase, salt, options)
	{
		options || (options = {});
		
		var _kdf = new PBKDF2({
			key_size: (options.key_size || 32),
			hasher: SHA1,
			iterations: (options.iterations || 400)
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

	/**
	 * RSA encrypt the given plaintext message using the given key.
	 */
	encrypt_rsa: function(public_key, message, options)
	{
		options || (options = {});

		var encrypted	=	new RSA().encrypt(message, public_key);
		return encrypted;
	},

	/**
	 * Decrypt the given RSA-encrypted message using the given key.
	 */
	decrypt_rsa: function(private_key, message, options)
	{
		options || (options = {});

		if(options.async)
		{
			var worker = new Worker(window._base_url + '/library/cowcrypt/crypto_math.js');

			var decryption_complete_callback = function(decrypted)
			{
				// Manually undo the PKCS1 v1.5 padding
				decrypted = new PKCS1_v1_5().decode(decrypted);
				options.async(decrypted);
			}

			worker.addEventListener('message', function(e) {
				var data = e.data;

				switch (data.cmd) {
					case 'put_rsa_decrypt':
						decryption_complete_callback(data.response.plaintext)
						worker.terminate();
						break;
				}
			}, false);

			worker.postMessage({
				cmd: 'get_rsa_decrypt',
				request: {
					ciphertext: message,
					n: private_key.get_modulus(),
					d: private_key.get_exponent_private()
				}
			});

			return false;
		}
		else
		{
			var decrypted	=	new RSA().decrypt(message, private_key);
			return decrypted;
		}
	},

	/**
	 * Serializes an RSAKey object into a string.
	 */
	rsa_key_to_json: function(rsakey)
	{
		var n	=	rsakey.get_modulus();
		var e	=	rsakey.get_exponent_public();
		var d	=	rsakey.get_exponent_private();

		var obj	=	{n: n};
		if(e) obj.e = e;
		if(d) obj.d = d;

		return JSON.stringify(obj);
	},

	/**
	 * Deserializes a string into a RSAKey object.
	 */
	rsa_key_from_json: function(rsakey_obj)
	{
		var obj	=	JSON.parse(rsakey_obj);
		var n	=	obj.n;
		var e	=	obj.e;
		var d	=	obj.d;

		var key	=	new RSAKey({n: n, e: e, d: d});

		return key;
	},

	/**
	 * Generate an RSA keypair asynchronously. Does the work in a Worker thread
	 * so we don't block the browser for 8 years while generating. Calls
	 * options.success when finished, options.error on error.
	 */
	generate_rsa_keypair: function(options)
	{
		options || (options = {});
		
		// Ah ah! Parker, if you're going to ask a question, you better stick
		// around for the answer. Next to me, Parker! Rest of the walk. Sko!
		// Next to me!! Move, Parker!!!
		if(!options.success) return false;

		// hijack success to return split pub/priv keys (if requested);
		var _success	=	options.success;
		options.success	=	function(rsakey)
		{
			if(options.split)
			{
				var split	=	tcrypt.split_rsa_key(rsakey);
				_success(split.public, split.private);
			}
			else
			{
				_success(rsakey);
			}
		};

		if(options.len !== 2048 || options.len !== 3072)
		{
			options.len	=	3072;
		}

		options.error || (options.error = function() {});

		var nlen		= options.len;
		var e 			= crypto_math.get_random_public_exponent();
		var p, q, n, phi_n, u, d;

		var generate_prime_threaded = function(e, nlen, callback, p)
		{
			var worker = new Worker(window._base_url + '/library/cowcrypt/crypto_math.js');

			worker.addEventListener('message', function(e) {
				var data = e.data;

				switch (data.cmd) {
					case 'get_csprng_random_values':
						worker.postMessage({
							cmd: 'put_csprng_random_values',
							response: {
								random_values: crypto_math.get_csprng_random_values(data.request.bits)
							}
						});
						break;
					case 'put_error':
						worker.terminate();
						delete worker;

						// if "out of tries" error, recurse and try again
						if (data.error.code == 3)
							return generate_rsa_key_threaded();
						else
							options.error(data.error);
						
						break;
					case 'put_console_log':
						console.log(data.response.msg);
						break;
					case 'put_probable_prime':
						worker.terminate();
						callback(data.response.prime);
						break;
				}
			}, false);

			worker.postMessage({
				cmd: 'get_probable_prime',
				request: {
					e: e,
					nlen: nlen,
					p: p
				}
			});
		}

		var generate_q_complete = function(prime)
		{
			q		= prime;

			var inverse_data = crypto_math.compute_rsa_key_inverse_data(e, p, q);

			n		= inverse_data.n;
			phi_n	= inverse_data.phi_n;
			d		= inverse_data.d;
			u		= inverse_data.u;

			// The order of p and q may have been swapped, such that p < q
			p		= inverse_data.p;
			q		= inverse_data.q;

			var key	= new RSAKey({e: e, n: n, d: d, p: p, q: q, u: u});

			options.success(key);
		};

		var generate_p_complete = function(prime)
		{
			p = prime;
			generate_prime_threaded(e, nlen, generate_q_complete, p);
		};

		// Actually start the generation process
		generate_prime_threaded(e, nlen, generate_p_complete, false);
	},

	/**
	 * Take a full RSA key and split it into its public/private components.
	 * Returns an object holding two RSAKey objects:
	 *   {public: RSAKey, private: RSAKey}
	 */
	split_rsa_key: function(rsakey)
	{
		var modulus	=	rsakey.get_modulus();
		var pubkey	=	new RSAKey({ n: modulus, e: rsakey.get_exponent_public() });
		var privkey	=	new RSAKey({ n: modulus, d: rsakey.get_exponent_private() });
		return {public: pubkey, private: privkey};
	}
};
