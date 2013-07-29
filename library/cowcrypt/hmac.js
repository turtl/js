/**
 *	HMAC Hashing Class
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 *
 *	@class
 *	@classdesc				HMAC hashes a passphrase into a message digest hash in order to verify message integrity AND authenticity.
 *	@requires				convert
 *
 *	@author					Jeff Lyon <jeff@rubbingalcoholic.com>
 *	@copyright				Copyright (c) 2013, Jeff Lyon.
 *	@license				{@link http://www.opensource.org/licenses/mit-license.php|The MIT License}
 *
 *	@desc					Creates a new HMAC instance
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link HMAC#initialize}
 */
var HMAC = new Class(
/** @lends HMAC.prototype */
{

	/**
	 *	Placeholder for initialized hasher instance. Set by initialize()
	 *	@type {Hasher}
	 *	@private
	 */
	hasher_instance: null,

	/**
	 *	Tracks whether the hasher has already received message data. Used for progressive hashing.
	 *	@type {boolean}
	 *	@private
	 */
	has_streamed_data: false,

	/**
	 *	Word array for inner key ^ pad block matching length of hasher's block size. Set by initialize()
	 *	@type {Array}
	 *	@private
	 */
	i_key_pad: [],

	/**
	 *	Word array for outer key ^ pad block matching length of hasher's block size. Set by initialize()
	 *	@type {Array}
	 *	@private
	 */
	o_key_pad: [],

	/**
	 *	Initializes the HMAC instance
	 *	
	 *	@param {Object} options						Options object. (Parameter descriptions below)
	 *	@param {string} options.passphrase			Required passphrase
	 *	@param {BlockCipher} [options.hasher=SHA1]	A {@link Hasher} subclass
	 *
	 *	@return {HMAC}								This initialized instance
	 */
	initialize: function(options)
	{
		options || (options = {});
		
		if (!options.hasher)
			var hasher			= SHA1;
		else
			var hasher			= options.hasher;

		if (!options.passphrase)
			throw new Error('You must specify a passphrase for the HMAC class initialization function. (eg: var h = new HMAC({passphrase: "1234"}))');

		this.hasher_instance	= new hasher();
		var block_bytes			= this.hasher_instance.get_block_size() / 8;

		if (convert.utf8.is_utf8_string(options.passphrase))
			var key 			= convert.utf8.encode(options.passphrase);
		else
			var key				= options.passphrase;

		if (key.length > block_bytes)
		{
			key 				= this.hasher_instance.hash(key, {return_format: 'binary'});
			this.hasher_instance.clear();
		}
		
		if (key.length < block_bytes)
			key 				= this._pad_string(key, block_bytes, 0x00);

		var o_pad				= convert.to_words(this._pad_string('', block_bytes, 0x5c));
		var i_pad				= convert.to_words(this._pad_string('', block_bytes, 0x36));
		key						= convert.to_words(key);

		this.i_key_pad			= convert.words_to_bytes(this._xor_block(i_pad, key));
		this.o_key_pad			= convert.words_to_binstring(this._xor_block(o_pad, key));

		return this;		
	},

	/**
	 *	Resets the hasher instance used for the HMAC hashing, but maintains key information
	 *	derived from the passphrase. This effectively allows you to re-use the class
	 *	without reinitializing / re-specifying the passphrase.
	 */
	reset: function()
	{
		this.has_streamed_data = false;
		this.hasher_instance.clear();
	},

	/**
	 *	Performs HMAC hashing on message data.
	 *
	 *	This optionally supports streaming mode (or "progressive hashing"), which allows you to hash data
	 *	in chunks over multiple calls, using the same hasher instance. Progressive hashing should improve
	 *	memory usage for large datasets, since we don't necessarily need to keep all of it in memory at
	 *	once. Once you are finished hashing data in progressive mode, call finalize() to return the hash.
	 *
	 *	@param {string|Array} data						Either a string, or array of 8-bit numeric bytes to hash
	 *	@param {Object} options							Options object. (Parameter descriptions below)
	 *	@param {boolean} [options.stream=false]			Uses progressive hashing. Default: false
	 *	@param {string} [options.return_format='hex']	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {mixed}									Returns desired output format if options.stream is false, else this.
	 *
	 */
	hash: function(data, options)
	{
		options || (options = {});
		options.stream || (options.stream = false);

		if (typeof data == 'string')
			data = convert.to_bytes(data);

		if (this.has_streamed_data == false)
		{
			data = this.i_key_pad.concat(data);
			this.has_streamed_data = true;
		}

		this.hasher_instance.hash(data, {stream: true});

		if (options.stream == false)
			return this.finalize(options);

		return this;
	},

	/**
	 *	Finalizes the data hashing, computes and returns the final HMAC hash.
	 *
	 *	This is called internally by hash() when progressive mode is turned off.
	 *	Otherwise, you call it explicitly when you're done hashing data in progressive mode.
	 *
	 *	@param {Object} [options={}]					Options object. (Parameter descriptions below)
	 *	@param {string} [options.return_format='hex']	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {string}
	 */
	finalize: function(options)
	{
		options || (options = {});
		options.return_format || (options.return_format = 'hex');

		var inner_hash = this.hasher_instance.finalize({return_format: 'binary'});

		this.hasher_instance.clear();

		var hmac = this.hasher_instance.hash(this.o_key_pad + inner_hash, {return_format: options.return_format});

		this.reset();

		return hmac;
	},

	/**
	 *	Pads a string to a specified length with a repeating byte value.
	 *
	 *	@private
	 *
	 *	@param {string} str				The string to pad
	 *	@param {number} padded_length	The desired length after padding
	 *	@param {number} pad_value		The ASCII character code of the byte to pad into the string
	 *
	 *	@return string
	 */
	_pad_string: function(str, padded_length, pad_value)
	{
		for (var i = 0; str.length < padded_length; i++) str += String.fromCharCode(pad_value);
		return str;
	},

	/**
	 *	XORs two blocks of 32-bit words together
	 *
	 *	@private
	 *
	 *	@param {Array} block1	The first block
	 *	@param {Array} block2	The second block
	 *	@return {Array}
	 */
	_xor_block: function(block1, block2)
	{
		for (var i=0; i < block1.length; i++) block1[i] ^= block2[i];	
		return block1;
	}
});
