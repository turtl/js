/*
 *	Passphrase based key-derivation classes
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */
 /**
 *	@requires 				convert
 *	@class
 *	@classdesc				PBKDF2 class. Derives a symmetric key from a passphrase and optional salt.
 *	@desc					Creates a new PBKDF2 instance.
 *	@this					PBKDF2
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link PBKDF2#initialize}
 *
 *	@example
 *
 *	_kdf		= new PBKDF2({key_size: 16, hasher: SHA256, iterations: 1000});
 *	derived_key	= _kdf.compute('password1234', 'saltsalt');
 *	derived_iv	= _kdf.compute(derived_key, 'saltsaltsaltsalt');
 *	ciphertext	= new AES({key: derived_key, iv: derived_iv}).encrypt('mydata');
 *
 *	// Note you don't have to do all this work to encrypt using a passphrase.
 *	// Just {@link BlockCipher#initialize|initialize} your cipher instance using the passphrase option.
 *	// Doing so will automatically use PBKDF2 internally to generate a key and IV.
 *
 */
var PBKDF2 = new Class(
/** @lends PBKDF2.prototype */
{
	/**
	 *	The length in bytes of the derived key. Set with {@link PBKDF2#initialize}
	 *	@private
	 *	@type {number}
	 */
	key_size: 32,

	/**
	 *	The Hasher subclass to use for key derivation. Default SHA1 is set by {@link PBKDF2#initialize} if none passed.
	 *	@private
	 *	@type {Hasher}
	 */
	hasher: null,

	/**
	 *	The number of iterations to hash our key data. Moar = bettar securiteeee!!!!
	 *	@private
	 *	@type {number}
	 */
	iterations: 1,

	/**
	 *	Initializes the PBKDF2 instance
	 *	
	 *	@param {Object} [options={}]			Optional options object. (Parameter descriptions below)
	 *	@param {number} [options.key_size=32]	The key size to generate. Must be a multiple of 4.
	 *	@param {Hasher} [options.hasher=SHA1]	The class name of a hasher.
	 *	@param {number} [options.iterations=1]	Number of iterations to HMAC hash key data.
	 *	@return {PBKDF2}						This initialized instance
	 */
	initialize: function(options)
	{
		options || (options = {});
		
		if (!options.hasher)
			this.hasher		= typeof(SHA1) != 'undefined' ? SHA1 : null;
		else
			this.hasher		= options.hasher;

		if (options.key_size && options.key_size % 4 != 0)
			throw new Error('Key size must be a multiple of 4 bytes.');
		else
			this.key_size = options.key_size;

		if (options.iterations)
			this.iterations = options.iterations;

		return this;
	},

	/**
	 *	Derives a PBKDF2 key from a given passphrase and salt value
	 *
	 *	@param {string} passphrase							Passphrase to be used for the derived key.
	 *	@param {string} [salt='']							Salt value.
	 *	@param {Object} [options={}]						Optional options object.
	 *	@param {string} [options.return_format='binary']	(binary|hex|words) The return format.
	 *
	 *	@return {string|Array}								A string or Array depending on options.return_format
	 */
	compute: function(passphrase, salt, options)
	{
		salt || (salt = '');
		options || (options = {});
		options.return_format || (options.return_format = 'binary');

		if (convert.utf8.is_utf8_string(salt))
			var salt = convert.utf8.encode(salt);

		var hmac	= new HMAC({hasher: this.hasher, passphrase: passphrase});
		var key		= '';	// RA NOTE ~ It's faster to track this as a string than a word array!

		for (i = 1; key.length < this.key_size; i++)
		{
			var block = hmac.hash(salt, {stream: true}).hash(convert.word_to_bytes(i), {return_format: 'words'});

			var temp = block;

			for (var j = 1; j < this.iterations; j++)
			{
				temp = hmac.hash(convert.words_to_bytes(temp), {return_format: 'words'});

				for (var k = 0; k < block.length; k++)
					block[k] ^= temp[k];
			}

			key += convert.words_to_binstring(block);	// RA NOTE ~ Believe it or not, it's faster to use a string!!
		}
		key = key.substr(0, this.key_size);

		switch (options.return_format)
		{
			case 'hex':
				return convert.binstring_to_hex(key);
			case 'binary':
				return key;
			case 'words':
				return convert.to_words(key);
		}
	}
});

/**
 *	@class
 *	@requires 				convert
 *	@classdesc				This is a deprecated passphrase-based key derivation class included to provide compatibility with OpenSSL encryption formats. Normally we'd use {@link PBKDF2} for this sort of thing.
 *	@desc					Creates a new EVPKDF instance
 *	@extends				PBKDF2
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link PBKDF2#initialize}. Note this class will ignore your choice of hash algorithm and always use {@link MD5}.
 */
var EVPKDF = new Class(
/** @lends EVPKDF.prototype */
{
	Extends: PBKDF2,

	/**
	 *	Derives a EVPKDF key from a given passphrase and salt value
	 *
	 *	@param {string} passphrase						Passphrase to be used for the derived key.
	 *	@param {string} [salt='']						Salt value.	
	 *	@param {Object} [options]						Optional options object. (Parameter descriptions below)
	 *	@param {number} [options.return_format='hex']	(binary|hex|words) The return format.
	 *
	 *	@return {string|Array}							A string or Array depending on options.
	 */
	compute: function(passphrase, salt, options)
	{
		salt || (salt = '');
		options || (options = {});
		options.return_format || (options.return_format = 'binary');
		
		if (convert.utf8.is_utf8_string(passphrase))
			var passphrase = convert.utf8.encode(passphrase);

		if (convert.utf8.is_utf8_string(salt))
			var salt = convert.utf8.encode(salt);

		var md5		= new MD5();
		var key		= '';

		for (i = 1; key.length < this.key_size; i++)
		{
			if (block)
				md5.hash(block, {stream: true});

			var block = md5.hash(passphrase + salt, {return_format: 'binary'});

			for (var i = 1; i < this.iterations; i++)
				block = md5.hash(block, {return_format: 'binary'});

			key += block;
		}

		key = key.substr(0, this.key_size);

		switch (options.return_format)
		{
			case 'hex':
				return convert.binstring_to_hex(key);
			case 'binary':
				return key;
			case 'words':
				return convert.to_words(key);
		}
	}
});