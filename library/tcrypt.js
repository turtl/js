"use strict";

// define error(s) used by tcrypt
var extend_error	=	function(extend, errname)
{
	var err						=	function() {
		var tmp	=	extend.apply(this, arguments);
		tmp.name = this.name = errname;

		this.stack		=	tmp.stack
		this.message	=	tmp.message

		return this;
	};
	err.prototype	=	Object.create(extend.prototype, { constructor: { value: err } });
	return err;
}
var TcryptError			=	extend_error(Error, 'TcryptError');
var TcryptAuthFailed	=	extend_error(TcryptError, 'TcryptAuthFailed');

var tcrypt = {
	// -------------------------------------------------------------------------
	// NOTE: never inject items into these lists. only append them!!!!
	// NOTE: these lists can only support 256 items each!!!!
	// -------------------------------------------------------------------------
	cipher_index: [
		'AES',
		'Twofish'
	],
	block_index: [
		'CBC',
		//'CFB'
	],
	padding_index: [
		'AnsiX923',
		'PKCS7'
	],
	// this list holds items used by tcrypt.derive_keys to turn a master key
	// (which is the main key passed into tcrypt.ecrypt/decrypt) into two keys:
	// a key for encryption/decryption, and a key for HMAC verification.
	//
	// Format:
	//   [hasher, iterations, length]
	kdf_index: [
		['SHA256', 2, 64]
	],
	// -------------------------------------------------------------------------

	current_version: 3,		// current serialization version

	// serialization options (array index values for the tcrypt.*_index arrays)
	default_cipher: 0,
	default_block: 0,
	default_padding: 0,
	default_kdf_mode: 0,	// corresponds to tcrypt.kdf_index

	// define some getters. these really just wrap grabbing values out of the
	// global window context, but in the future could be expanded
	get_cipher: function(ciphername) { return (typeof window != 'undefined' ? window : self)[ciphername]; },
	get_block_mode: function(blockmode) { return (typeof window != 'undefined' ? window : self)[blockmode]; },
	get_padding: function(padding) { return (typeof window != 'undefined' ? window : self)[padding]; },
	get_hasher: function(hasher) { return (typeof window != 'undefined' ? window : self)[hasher]; },

	/**
	 * This is the original Turtl encryption format
	 *
	 *   [payload (base64)]:i[initial vector]
	 *
	 * It was stupid because it forced things to be in base64, which increases
	 * size by 2-3x. Binary storage was not an option.
	 */
	old_formatter: {
		stringify: function (cipherParams)
		{
			// create json object with ciphertext
			var crypto = convert.base64.encode(cipherParams.ciphertext);

			// optionally add iv
			if(cipherParams.iv) crypto += ':i' + convert.binstring_to_hex(cipherParams.iv);

			// stringify json object
			return crypto;
		},

		parse: function(crypto)
		{
			// parse json string
			var parts = crypto.split(/:/g);
			var params = {
				ciphertext: convert.base64.decode(parts[0]),
				cipher: 'AES',
				block_mode: 'CBC',
				padding: 'AnsiX923'
			}
			parts.shift();
			parts.each(function(p) {
				if(p.match(/^i/)) params.iv = convert.hex_to_binstring(p.slice(1));
			});
			return params;
		}
	},

	/**
	 * Given a serialization version and a payload description *string*, pull
	 * out any pertinant information (cipher, block mode, padding, etc).
	 */
	decode_payload_description: function(version, desc_str)
	{
		if(version >= 1)
		{
			// desc is three bytes: |cipher index|block mode index|padding index|
			var cipher_index	=	desc_str.charCodeAt(0);
			var block_index		=	desc_str.charCodeAt(1);
			var padding_index	=	desc_str.charCodeAt(2);
			var kdf_mode		=	desc_str.charCodeAt(3);
		}

		return {
			cipher: tcrypt.cipher_index[cipher_index],
			block_mode: tcrypt.block_index[block_index],
			padding: tcrypt.padding_index[padding_index],
			kdf_mode: kdf_mode
		};
	},

	/**
	 * Given a serialization version and a set of information about how a
	 * payload is serialized, return a payload description string
	 */
	encode_payload_description: function(version, options)
	{
		if(!options || !options.cipher || !options.block_mode || !options.padding)
		{
			throw new TcryptError('tcrypt.encode_payload_description: must provide cipher, block_mode, and padding in options');
		}

		if(version >= 1)
		{
			var cipher		=	tcrypt.cipher_index.indexOf(options.cipher);
			var block_mode	=	tcrypt.block_index.indexOf(options.block_mode);
			var padding		=	tcrypt.padding_index.indexOf(options.padding);
			var kdf_mode	=	options.kdf_mode;
			var desc		=	String.fromCharCode(cipher) +
								String.fromCharCode(block_mode) +
								String.fromCharCode(padding) +
								String.fromCharCode(kdf_mode);
		}

		return desc;
	},

	/**
	 * Authenticate a crypto payload via HMAC
	 */
	authenticate_payload: function(passphrase, version, payload_description, iv, ciphertext)
	{
		var payload	=	version + payload_description.length + payload_description + iv + ciphertext;
		var hmac	=	new HMAC({passphrase: passphrase, hasher: tcrypt.get_hasher('SHA256')});
		var hash	=	hmac.hash(payload, {return_format: 'binary'});
		return hash;
	},

	/**
	 * Turtl encryption serialization format is as follows:
	 *
	 *   |-2 bytes-| |-32 bytes-| |-1 byte----| |-N bytes-----------| |-16 bytes-| |-N bytes----|
	 *   | version | |   HMAC   | |desc length| |payload description| |    IV    | |payload data|
	 *
	 * - version tells us the serialization version. although it will probably
	 *   not get over 255, it has two bytes just in case. never say never.
	 * - desc length is the length of the payload description, which may change
	 *   in length from version to version.
	 * - payload description tells us what algorithm/format the encryption uses.
	 *   for instance, it could be AES+CBC, or Twofish+CBC, etc etc. payload
	 *   description encoding/length may change from version to version.
	 * - IV is the initial vector of the payload, in binary form
	 * - payload data is our actual data, encrypted.
	 */
	deserialize: function(enc)
	{
		// if the first character is not 0, either Turtl has come a really long
		// way (and had over 255 serialization versions) or we're at the very
		// first version, which just uses Base64.
		var version	=	(enc.charCodeAt(0) << 8) + enc.charCodeAt(1)

		// TODO: if we ever get above 1000 versions, change this. The lowest
		// allowable Base64 message is '++', which translates to 11,051 but for
		// now we'll play it safe and cap at 1K
		if(version > 1000)
		{
			return Object.merge(tcrypt.old_formatter.parse(enc), {
				version: 0,
				hmac: null,
			});
		}

		// grab HMAC for auth
		var hmac		=	enc.substr(2, 32);

		// grab the payload description and decode it
		var desc_length	=	enc.charCodeAt(34);
		var desc_str	=	enc.substr(35, desc_length);

		// grab the IV
		var iv			=	enc.substr(35 + desc_length, 16);

		// finally, the encrypted data
		var enc			=	enc.substr(35 + desc_length + 16);

		var params	=	{
			version: version,
			hmac: hmac,
			desc: desc_str,
			iv: iv,
			ciphertext: enc
		};
		return params;
	},

	/**
	 * Serialize our encrypted data into the standard format (see the comments
	 * above the deserialize method).
	 *
	 * `enc` is our *encrypted* ciphertext, options contains information
	 * explaining how enc was created (iv, cipher, block mode, padding, etc).
	 */
	serialize: function(enc, options)
	{
		options || (options = {});

		var version	=	options.version;

		// support serializing the old version if needed (auth, for example)
		if(version === 0)
		{
			return tcrypt.old_formatter.stringify({
				ciphertext: enc,
				iv: options.iv
			});
		}

		// create initial string, with two version bytes
		var serialized	=	String.fromCharCode(version >> 8) + String.fromCharCode(version & 255);

		// add our hmac
		serialized		+=	options.hmac;

		// create/append our description length and description
		serialized		+=	String.fromCharCode(options.desc.length)
		serialized		+=	options.desc;

		// append the IV
		serialized		+=	options.iv;

		// last but definitely not least, the actual crypto data
		serialized		+=	enc;

		return serialized;
	},

	/**
	 * Given a master key and a set of options, derive two sub-keys: one for
	 * encryption/decryption and one for HMAC generation.
	 */
	derive_keys: function(master_key, options)
	{
		options || (options = {});

		var hasher		=	options.hasher || tcrypt.get_hasher('SHA1');
		var iterations	=	options.iterations || 50;
		var key_size	=	options.key_size || 64;

		var both_keys	=	tcrypt.key(master_key, null, {
			hasher: hasher,
			iterations: iterations,
			key_size: key_size
		});

		// split the resulting key down the middle, first half is crypto key,
		// second half is hmac key
		var enc_key		=	both_keys.substr(0, key_size / 2);
		var hmac_key	=	both_keys.substr(key_size / 2);

		return {crypto: enc_key, hmac: hmac_key};
	},

	/**
	 * Encrypt data with key.
	 *
	 * `options` allows specifying of cipher ('AES'/'Twofish'), block mode
	 * ('CBC', 'CFB'), padding mode ('AnsiX923'/'PKCS7'), and serialization
	 * version (defaults to tcrypt.current_version).
	 *
	 * Note that unless using version === 0 (the original serialization version,
	 * still used in some places for backwards compatibility), the given `key`
	 * is used to derive two other keys (and is otherwise not used directly): a
	 * crypto key (used to encrypt the data) and an HMAC key used to protect the
	 * ciphertext against tampering.
	 *
	 * This function returns a binary string of the serialized encrypted data.
	 * All information needed to decrypt the string is encoded in the string.
	 * See tcrypt.deserialize for more information.
	 */
	encrypt: function(key, data, options)
	{
		options || (options = {});

		// because of some errors in judgement, in some cases keys were UTF8
		// encoded early-on. this should remain here until all keys for all data
		// for all users are not UTF8 encoded...so, forever probably.
		if(key.length > 32) key = convert.utf8.decode(key);

		// if we didn't specify cipher, block_mode, or padding in the options,
		// use the tcrypt defaults.
		var cipher		=	options.cipher || tcrypt.cipher_index[tcrypt.default_cipher];
		var block_mode	=	options.block_mode || tcrypt.block_index[tcrypt.default_block];
		var padding		=	options.padding || tcrypt.padding_index[tcrypt.default_padding];
		var kdf_mode	=	tcrypt.default_kdf_mode;	// hardcode for now

		// grab our serialization version (default to tcrypt.current_version)
		var version		=	((options.version || options.version === 0) && options.version % 1 === 0) ?  options.version : tcrypt.current_version;

		if(version === 0)
		{
			var crypto_key	=	key;
			var hmac_key	=	null;
		}
		else
		{
			// generate an encryption key and an authentication key from the
			// master key `key`.
			var kdf_entry	=	tcrypt.kdf_index[kdf_mode];
			var keys		=	tcrypt.derive_keys(key, {
				hasher: tcrypt.get_hasher(kdf_entry[0]),
				iterations: kdf_entry[1],
				key_size: kdf_entry[2]
			});
			var crypto_key	=	keys.crypto;
			var hmac_key	=	keys.hmac;
		}

		var opts		=	Object.merge({}, options, {
			key: crypto_key,
			block_mode: tcrypt.get_block_mode(block_mode),
			pad_mode: tcrypt.get_padding(padding),
		});

		// auto-generate an initial vector if needed
		if(!opts.iv) opts.iv = tcrypt.iv();

		// make sure to UTF8 encode data (turns multi-byte characters into
		// single-byte characters so the crypto doesn't lose data).
		data	=	convert.utf8.encode(data);

		var cipherclass	=	tcrypt.get_cipher(cipher);
		var ciphertext	=	new cipherclass(opts).encrypt(data);

		// generate serialized description
		var desc		=	tcrypt.encode_payload_description(version, {
			cipher: cipher,
			block_mode: block_mode,
			padding: padding,
			kdf_mode: kdf_mode
		});

		// generate HMAC for this payload
		var hmac	=	(version !== 0 && hmac_key) ? tcrypt.authenticate_payload(hmac_key, version, desc, opts.iv, ciphertext) : null;

		// serialize our ciphertext along with all the options user to create it
		// into the Turtl serialization format
		var formatted	=	tcrypt.serialize(ciphertext, {
			version: version,
			hmac: hmac,
			desc: desc,
			iv: opts.iv
		});
		return formatted;
	},

	/**
	 * Decrypt data with key.
	 *
	 * The given `encrypted` data is first deserialized from Turtl's standard
	 * format, which gives us serialization version, HMAC authentication hash,
	 * ciphertext description (which includes the algorithm, padding mode, block
	 * mode, and key derivation method), and the actual ciphertext.
	 *
	 * We then create a decryption key and an HMAC key (based on the "master"
	 * key passed in) using the key derivation method in the description.
	 *
	 * The HMAC included in the payload is then checked against the HMAC we get
	 * from hashing the version, description, iv, and ciphertext with the HMAC
	 * password we got from the master key.
	 *
	 * If the hashes match, great, decrypt the ciphertext and return the result.
	 * If the hashes do not match, an exception is thrown, blocking decryption.
	 *
	 * Note that all of the above deserialization/authentication is skipped if
	 * the payload has a version === 0 (Turtl's old serialization format), in
	 * which case the data is just decrypted without question.
	 */
	decrypt: function(key, encrypted)
	{
		// because of some errors in judgement, in some cases keys were UTF8
		// encoded early-on. this should remain here until all keys for all data
		// for all users are not UTF8 encoded...so, forever probably.
		if(key.length > 32) key = convert.utf8.decode(key);

		// split a serialized crypto message into a set of params and options,
		// including what cipher we used to encrypt it, block mode, padding, iv,
		// ciphertext (obvis).
		var params	=	tcrypt.deserialize(encrypted);
		var version	=	params.version;
		if(version === 0)
		{
			// we're deserializing/decrypting an old-version message. use the
			// values passed to us by tcrypt.old_formatter.parse to form a
			// description object. note in this case, we skip HMAC generation
			// and authentication, and use the master key as the crypto key.
			var desc	=	{
				cipher: params.cipher,
				block_mode: params.block_mode,
				padding: params.padding,
				kdf_mode: null
			};
			var crypto_key	=	key;
			var hmac_key	=	null;
		}
		else
		{
			var desc	=	tcrypt.decode_payload_description(params.version, params.desc);

			// generate an encryption key and an authentication key from the
			// master key `key`.
			var kdf_entry	=	tcrypt.kdf_index[desc.kdf_mode];
			var keys		=	tcrypt.derive_keys(key, {
				hasher: tcrypt.get_hasher(kdf_entry[0]),
				iterations: kdf_entry[1],
				key_size: kdf_entry[2]
			});
			var crypto_key	=	keys.crypto;
			var hmac_key	=	keys.hmac;
		}

		// build/authenticate HMAC
		var hmac	=	params.hmac;
		if(params.version !== 0 && hmac && hmac_key)
		{
			if(hmac !== tcrypt.authenticate_payload(hmac_key, version, params.desc, params.iv, params.ciphertext))
			{
				throw new TcryptAuthFailed('Authentication error. This data has been tampered with (or the key is incorrect).');
			}
		}

		var opts	=	{
			key: crypto_key,
			block_mode: this.get_block_mode(desc.block_mode),
			pad_mode: this.get_padding(desc.padding),
			iv: params.iv || null
		};

		// run the decryption using the cipher the data is encrypted with
		var cipher	=	this.get_cipher(desc.cipher);
		var de		=	new cipher(opts).decrypt(params.ciphertext);

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
			hasher: (options.hasher || tcrypt.get_hasher('SHA1')),
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
	 * Given a Base64 encoded key, convert it to a binary key (keys MUST be in
	 * binary format when using tcrypt.encrypt/decrypt)
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

		var params	=	{};
		if(options.raw) params.return_format = 'binary';

		var hasher	=	tcrypt.get_hasher('SHA256');
		return new hasher().hash(data, params);
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
