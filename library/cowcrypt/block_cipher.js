/*
 *	Symmetric block cipher support classes
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */
 /**
 *	@abstract
 *	@class
 *	@classdesc		Abstract class which provides base functionality used by all symmetric block cipher subclasses
 *	@desc			NOTE: you can't instantiate this class directly. Instead, create instances of a subclass, such as {@link AES} or {@link Twofish}.
 *	@requires		convert
 */
var BlockCipher = new Class(
/** @lends BlockCipher.prototype */
{
	/**
	 *	The block cipher mode of operation (see {@link https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation})
	 *	@type {BlockCipherMode}
	 *	@private
	 */
	block_mode: 	null,

	/**
	 *	The block byte padding mode (see {@link http://en.wikipedia.org/wiki/Padding_%28cryptography%29})
	 *	@type {PaddingMode}
	 *	@private
	 */
	pad_mode: 		null,

	/**
	 *	Initial vector for non-ECB block cipher modes
	 *	@private
	 */
	iv: 			'',

	/**
	 *	Passphrase, stored temporarily before key derivation
	 *	@private
	 */
	passphrase: 	'',

	/**
	 *	Salt used for passphrase based key derivation
	 *	@private
	 */
	salt: 			'',

	/**
	 *	Toggles OpenSSL mode. 
	 *	@private
	 */
	openssl_mode: 	false,

	/**
	 *	Turn this on to enable the {@link BlockCipher#debug_write} method to log debug output to the console.
	 *
	 *	@type {Boolean}
	 *  @default false
	 */
	debug_mode: true,

	/**
	 *	Invoked during subclass initialization. All properties needed to initialize the class must be passed in.
	 *
	 *	@param {Object} data									A list of properties used to initialize the class.
	 *	@param {string} [data.key]								A binary string containing the symmetric key. Required if a passphrase is not specified.
	 *															Must match a key length supported by the subclass.
	 *	@param {BlockCipherMode} [data.block_mode={@link CBC}]	The block cipher mode of operation to use for *cryption
	 *	@param {PaddingMode} [data.pad_mode={@link PKCS7}]		The block byte padding mode
	 *	@param {string} [data.passphrase]						A passphrase to derive a key from. Required if a key is not explicitly specified.
	 *	@param {string} [data.salt]								A binary string containing the cryptographic salt used for key derivation.
	 *	@param {boolean} [data.openssl_mode=false]				Toggles OpenSSL interoperability mode. This prepends salt data to the encryption output, and
	 *															uses the prepended salt data during decryption to derive a key (in combination with a
	 *															passphrase), if needed.
	 *	@return {BlockCipher}
	 */
	initialize: function(data)
	{
		data || (data = {});
		
		for (var attr in data)
			this[attr] = data[attr];

		if (!data.block_mode)
			this.block_mode = CBC;

		if (!data.pad_mode)
			this.pad_mode = PKCS7;

		if (data.passphrase && this.openssl_mode == false)
			this._derive_key_from_passphrase();

		return this;
	},

	/**
	 *	Encrypts a string using the padding and block cipher mode of operation specificed on initialization.
	 *
	 *	@param {String} plaintext	An ASCII string to encrypt. Can be binary or plaintext.
	 *								For plaintext, be sure to use {@link convert.utf8.encode} to encode any UTF characters.
	 *	@return {String}			Decrypted data
	 */
	encrypt: function(plaintext)
	{
		if (this.openssl_mode && this.get_key().length == 0)
			this._derive_key_from_passphrase();

		plaintext		= new this.pad_mode({ cipher: this }).do_pad(plaintext);

		var plaintext 	= convert.to_words(plaintext);
		var operator	= new this.block_mode({ cipher: this });
		var ciphertext	= operator.encrypt_blocks(plaintext);

		ciphertext		= convert.words_to_binstring(ciphertext);

		if (this.openssl_mode && this.get_salt())
			ciphertext	= 'Salted__' + this.get_salt() + ciphertext;

		return ciphertext;
	},

	/**
	 *	Decrypts a string.
	 *
	 *	@param {String} ciphertext	An ASCII string to decrypt.
	 *	@return {String}			Encrypted data
	 */
	decrypt: function(ciphertext)
	{
		if (this.openssl_mode && ciphertext.substr(0, 8) == 'Salted__')
		{
			if (this.get_key().length == 0)
			{
				this.salt	= ciphertext.substr(8, 8);
				this._derive_key_from_passphrase();
			}
			ciphertext		= ciphertext.substr(16);
		}

		var ciphertext 		= convert.to_words(ciphertext);
		var operator		= new this.block_mode({ cipher: this });
		var plaintext		= convert.words_to_binstring(operator.decrypt_blocks(ciphertext));

		plaintext			= new this.pad_mode({ cipher: this }).undo_pad(plaintext);

		return plaintext;
	},

	/**
	 *	Gets the salt used for any passphrase-based key derivation.
	 *	@return {String}
	 */
	get_salt: function()
	{
		return this.salt;
	},

	/**
	 *	Writes debug information to the console if {@link BlockCipher#debug_mode} is turned on.
	 *	@param {...mixed} arguments The variables to write to console
	 */
	debug_write: function()
	{
		if (this.debug_mode) console.log.apply(console, arguments);
	},

	/**
	 *	Derives a key from a passphrase.
	 *	@private
	 */
	_derive_key_from_passphrase: function()
	{
		var key_bytes		= (this.get_key_length() / 8);
		var block_bytes		= (this.get_block_size() / 8);

		if (this.openssl_mode)
		{
			if (!this.get_salt())
				this.salt	= this._random_salt();

			var key			= new EVPKDF({key_size: (key_bytes+block_bytes)}).compute(this.passphrase, this.get_salt().substr(0, 8));
		}
		else
			var key			= new PBKDF2({key_size: (key_bytes+block_bytes)}).compute(this.passphrase, this.get_salt());
		
		this.iv				= key.substr(key_bytes);
		this.passphrase		= '';

		this.set_key(key.substr(0, key_bytes));
	},

	/**
	 *	Generates a random salt
	 *	@private
	 */
	_random_salt: function()
	{
		var rb = function () { return String.fromCharCode(Math.floor(Math.random() * 256)); }
		return rb() + rb() + rb() + rb() + rb() + rb() + rb() + rb();
	}
});

/**
 *	@abstract
 *	@class
 *	@classdesc		Abstract class which provides base functionality for block cipher mode operator subclasses
 *	@desc			NOTE: you can't instantiate this class directly. Instead, create instances of a subclass, such as {@link CBC} or {@link ECB}.
 *	@requires		convert
 */
var BlockCipherMode = new Class(
/** @lends BlockCipherMode.prototype */
{
	/**
     *	Stores a reference to the BlockCipher subclass instance used for *cryption
     *	@type {BlockCipher}
     *	@private
     */
	cipher: null,

	/**
	 *	Invoked during subclass initialization. All properties needed to initialize the class must be passed in.
	 *
	 *	@param {Object} data				A list of properties used to initialize the class.
	 *	@param {BlockCipher} data.cipher	A reference to a BlockCipher subclass instance. Used to actually *crypt any given block.
	 *	@param {string} [data.iv]			ASCII string containing Initial Vector (IV). Not required for {@link ECB}
	 *	@return {BlockCipherMode}
	 */
	initialize: function(data)
	{
		for (var attr in data)
			this[attr] = data[attr];

		return this;
	},

	/**
	 *	Invoked during subclass initialize when an Initial Vector is required.
	 *	Converts any supplied Initial Vector to an array of 32-bit words and does a length check.
	 *	@private
	 *	@throws Throws an error if the Initial Vector length doesn't match the block length.
	 */
	init_iv: function()
	{
		var iv = convert.to_words(this.cipher.iv);

		if (iv.length != this.get_words_per_block())
			throw new Error('Initial vector size must match block size!');

		this.iv = iv;
	},

	/**
	 *	Convenience function to get the number of 32-bit words required for each block
	 *	@return {number}
	 */
	get_words_per_block: function()
	{
		return this.cipher.get_block_size() / 32;
	},

	/**
	 *	XORs two blocks together. (A block is an array of 32-bit words of the correct length)
	 *	@private
	 *	@param {Array} block1	The first block
	 *	@param {Array} block2	The second block
	 *	@return {Array}			The result of XOR'ing the two blocks together
	 */
	xor_block: function(block1, block2)
	{
		for (var i=0; i < block1.length; i++) block1[i] ^= block2[i];		
		return block1;
	}

});

/**
 *	@class
 *	@classdesc				Implements ECB block cipher mode. Used internally during symmetric *cryption.
 *	@extends				BlockCipherMode
 *	@requires				convert
 *
 *	@desc					Creates a new ECB block cipher mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link ECB#initialize}
 */
var ECB = new Class(
/** @lends ECB.prototype */
{
	
	Extends: BlockCipherMode,

	/**
	 *	Called automatically on class instantiation.
	 *	Invokes {@link BlockCipherMode#initialize}.
	 *
	 *	@override
	 *	@param {Object} data See {@link BlockCipherMode#initialize} for a list of supported properties.
	 *	@return {ECB}
	 */
	initialize: function(data)
	{
		this.parent(data);
		return this;
	},

	/**
	 *	Encrypts blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link ECB#get_words_per_block}
	 *	@return {Array}			Encrypted blocks
	 */
	encrypt_blocks: function(words)
	{
		var ciphertext 		= [];
		var words_per_block	= this.get_words_per_block();

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var block = words.slice(i, i+words_per_block);
			ciphertext = ciphertext.concat(this.cipher.block_encrypt(block));
		}

		return ciphertext;
	},

	/**
	 *	Decrypt blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link ECB#get_words_per_block}
	 *	@return {Array}			Decrypted blocks
	 */
	decrypt_blocks: function(words)
	{
		var plaintext 		= [];
		var words_per_block	= this.get_words_per_block();

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var block = words.slice(i, i+words_per_block);
			plaintext = plaintext.concat(this.cipher.block_decrypt(block));
		}

		return plaintext;
	},
	
});

/**
 *	@class
 *	@classdesc				Implements CBC block cipher mode. Used internally during symmetric *cryption.
 *	@extends				BlockCipherMode
 *	@requires				convert
 *
 *	@desc					Creates a new CBC block cipher mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link CBC#initialize}
 */
var CBC = new Class(
/** @lends CBC.prototype */
{
	Extends: BlockCipherMode,
	
	/**
	 *	Array of 32-bit words for the Initial Vector (IV)
	 *	@private
	 */
	iv: [],

	/**
	 *	Called automatically on class instantiation.
	 *	Invokes {@link BlockCipherMode#initialize} before handling class-specific functionality.
	 *
	 *	@override
	 *	@param {Object} data See {@link BlockCipherMode#initialize} for a list of supported properties.
	 *	@return {CBC}
	 */
	initialize: function(data)
	{
		this.parent(data);
		this.init_iv();		
		return this;
	},

	/**
	 *	Encrypts blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link CBC#get_words_per_block}
	 *	@return {Array}			Encrypted blocks
	 */
	encrypt_blocks: function(words)
	{
		var ciphertext 		= [];
		var words_per_block	= this.get_words_per_block();
		var _prev_block		= this.iv;

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var block			= words.slice(i, i+words_per_block);
			var xor_block		= this.xor_block(block, _prev_block);
			var cipher_block	= this.cipher.block_encrypt(xor_block)
			ciphertext 			= ciphertext.concat(cipher_block);
			_prev_block			= cipher_block;
		}

		return ciphertext;
	},

	/**
	 *	Decrypt blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link CBC#get_words_per_block}
	 *	@return {Array}			Decrypted blocks
	 */
	decrypt_blocks: function(words)
	{
		var plaintext 		= [];
		var words_per_block	= this.get_words_per_block();
		var _prev_block		= this.iv;

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var block 			= words.slice(i, i+words_per_block);
			var decrypted 		= this.cipher.block_decrypt(block);
			var xor_decrypted	= this.xor_block(decrypted, _prev_block);
			plaintext 			= plaintext.concat(xor_decrypted);
			_prev_block			= block;
		}

		return plaintext;
	},
	
});

/**
 *	@class
 *	@classdesc				Implements CFB block cipher mode. Used internally during symmetric *cryption.
 *	@extends				BlockCipherMode
 *	@requires				convert
 *
 *	@desc					Creates a new CFB block cipher mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link CFB#initialize}
 */
var CFB = new Class(
/** @lends CFB.prototype */
{
	
	Extends: BlockCipherMode,

	/**
	 *	Array of 32-bit words for the Initial Vector (IV)
	 *	@private
	 */
	iv: [],

	/**
	 *	Called automatically on class instantiation.
	 *	Invokes {@link BlockCipherMode#initialize} before handling class-specific functionality.
	 *
	 *	@override
	 *	@param {Object} data See {@link BlockCipherMode#initialize} for a list of supported properties.
	 *	@return {CFB}
	 */
	initialize: function(data)
	{
		this.parent(data);
		this.init_iv();
		return this;
	},

	/**
	 *	Encrypts blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link CFB#get_words_per_block}
	 *	@return {Array}			Encrypted blocks
	 */
	encrypt_blocks: function(words)
	{
		var ciphertext 		= [];
		var words_per_block	= this.get_words_per_block();
		var _prev_block		= this.iv;

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var cipher_block	= this.cipher.block_encrypt(_prev_block)
			var block			= words.slice(i, i+words_per_block);
			var xor_block		= this.xor_block(block, cipher_block);
			ciphertext 			= ciphertext.concat(xor_block);
			_prev_block			= xor_block;
		}

		return ciphertext;
	},

	/**
	 *	Decrypt blocks.
	 *
	 *	@param {Array} words	An array of 32-bit words whose length must be an integer multiple of {@link CFB#get_words_per_block}
	 *	@return {Array}			Decrypted blocks
	 */
	decrypt_blocks: function(words)
	{
		var plaintext 		= [];
		var words_per_block	= this.get_words_per_block();
		var _prev_block		= this.iv;

		for (var i = 0; i < words.length; i += words_per_block)
		{
			var cipher_block	= this.cipher.block_encrypt(_prev_block)
			var block 			= words.slice(i, i+words_per_block);
			var xor_decrypted	= this.xor_block(cipher_block, block);
			plaintext 			= plaintext.concat(xor_decrypted);
			_prev_block			= block;
		}

		return plaintext;
	},
});

/**
 *	@abstract
 *	@class
 *	@classdesc		Abstract class which provides base functionality for byte padding subclasses
 *	@desc			NOTE: you can't instantiate this class directly. Instead, create instances of a subclass, such as {@link ZeroPadding} or {@link PKCS7}.
 */
var PaddingMode = new Class(
/** @lends PaddingMode.prototype */
{
	/**
     *	Stores a reference to the BlockCipher subclass instance (used to get data about the block size)
     *	@type {BlockCipher}
     *	@private
     */
	cipher: null,

	/**
	 *	Invoked during subclass instantiation. All properties needed to initialize the class must be passed in.
	 *
	 *	@param {Object} data				A list of properties used to initialize the class.
	 *	@param {BlockCipher} data.cipher	A reference to a BlockCipher subclass instance. Used to get information about the block size.
	 *	@return {PaddingMode}
	 */
	initialize: function(data)
	{
		for (var attr in data)
			this[attr] = data[attr];

		return this;
	}
});

/**
 *	@class
 *	@classdesc				Implements Zero Padding functionality. Data is padded to the correct block length multiple with zero bytes.
 *	@extends				PaddingMode
 *
 *	@desc					Creates a new ZeroPadding padding mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link ZeroPadding#initialize}
 */
var ZeroPadding = new Class(
/** @lends ZeroPadding.prototype */
{
	Extends: PaddingMode,

	/**
	 *	Perform the padding on the data.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		Padded data
	 */
	do_pad: function(data)
	{
		if ((data.length * 8) % this.cipher.get_block_size() != 0)
			for (var i=0; data.length % (this.cipher.get_block_size() / 8) != 0; i++)
				data += String.fromCharCode(0);

		return data;
	},

	/**
	 *	There is no safe way to undo zero padding. Simply returns the input string.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		The exact same string that was passed in.
	 */
	undo_pad: function(data)
	{
		return data;
	}
});

/**
 *	@class
 *	@classdesc				Implements ANSI X.923 Padding functionality.
 *							Data is padded with zeros until the last byte, which is then set to the number of padded bytes.
 *							If the data length is already a "clean" multiple of the block length, it is still padded out
 *							to another block, so we can safely undo the padding afterwards.
 *	@extends				PaddingMode
 *
 *	@desc					Creates a new AnsiX923 padding mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link AnsiX923#initialize}
 */
var AnsiX923 = new Class(
/** @lends AnsiX923.prototype */
{
	Extends: PaddingMode,

	/**
	 *	Perform the padding on the data.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		Padded data
	 */
	do_pad: function(data)
	{
		// Pad the block out with zeros
		for (var i=0; i == 0 || data.length % (this.cipher.get_block_size() / 8) != 0; i++)
			data += String.fromCharCode(0);

		// Slice off the last byte and replace with our count
		data = data.substr(0, data.length - 1);
		data += String.fromCharCode(i);

		return data;
	},

	/**
	 *	Undo padding on padded data.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		A binary string with the padding data stripped off the end.
	 */
	undo_pad: function(data)
	{
		var pad_length = data.charCodeAt(data.length-1);
		return data.substr(0, data.length - pad_length);
	}
});

/**
 *	@class
 *	@classdesc				Implements PKCS7 Padding functionality.
 *							The byte value we pad with is the number total number of bytes being padded onto the data.
 *							If the data length is already a "clean" multiple of the block length, it is still padded out
 *							to another block, so we can safely undo the padding afterwards.
 *	@extends				PaddingMode
 *
 *	@desc					Creates a new PKCS7 padding mode instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link PKCS7#initialize}
 */
var PKCS7 = new Class(
/** @lends AnsiX923.prototype */
{
	Extends: PaddingMode,

	/**
	 *	Perform the padding on the data.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		Padded data
	 */
	do_pad: function(data)
	{
		var block_bytes	= (this.cipher.get_block_size() / 8);

		var pad_count	= data.length % block_bytes != 0 ? block_bytes - (data.length % block_bytes) : block_bytes;

		for (var i=0; i == 0 || data.length % (this.cipher.get_block_size() / 8) != 0; i++)
			data += String.fromCharCode(pad_count);

		return data;
	},

	/**
	 *	Undo padding on padded data.
	 *
	 *	@param {string} data	A binary data string (ASCII)
	 *	@return {string} 		A binary string with the padding data stripped off the end.
	 */
	undo_pad: function(data)
	{
		var pad_length = data.charCodeAt(data.length-1);
		return data.substr(0, data.length - pad_length);
	}
});