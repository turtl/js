/**
 *	Generic Hasher Base Class
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 *	
 *	Licensed under The MIT License. 
 *	Redistributions of files must retain the above copyright notice.
 *
 *	@abstract 
 *	@class
 *	@classdesc		Abstract class providing shared functionality to Hasher subclasses.
 *	@desc			NOTE: you can't instantiate this class directly. Instead, create instances of a subclass, such as {@link SHA1} or {@link MD5}.
 *	@requires		convert
 */
var Hasher = new Class(
/** @lends Hasher.prototype */
{
	/**
	 *	Internal state for the byte buffer
	 *	@type {Array}
	 *	@private
	 */
	buffer: [],

	/**
	 *	Internal state for the hashed data as it is processed
	 *	@type {Array}
	 *	@private
	 */
	h: [],

	/**
	 *	The length in bits of data that has been processed
	 *	@type {number}
	 *	@private
	 */
	processed_length: 0,

	/**
	 *	Internal flag depending on the Hasher subclass instance
	 *	When true, the bytes are listed in words in small-endian order instead of the default big-endian
	 *	@type {boolean}
	 *	@private
	 */
	reverse_endian_words: false,

	/**
	 *	Initializes class member values. Invoked by the clear method from a subclass instance.
	 */
	clear: function()
	{
		this.buffer = [];
		this.processed_length = 0;
	},

	/**
	 *	Pads the remaining buffer to 512 bits.
	 *	@private
	 */
	pad: function()
	{
		var final_length = this.processed_length + (this.buffer.length * 8)

		this.buffer.push(128);		// 10000000 to begin padding

		// Pad the buffer out to (512 - 64) bits
		for (var i=0; (this.buffer.length + 8) % 64 != 0; i++)
			this.buffer.push(0);

		// Add our 64 bit length value to the end of the buffer
		var final_binary = final_length.toString(2);

		for (var i=0; final_binary.length % 64 != 0; i++)
			final_binary = '0' + final_binary;

		// RA NOTE ~ If I have to do any more work to account for MD5, I will abstract it
		if (this.reverse_endian_words == false)
		{
			var final_word1 = parseInt(final_binary.substr(0, 32), 2);
			var final_word2 = parseInt(final_binary.substr(32), 2);
		}
		else
		{
			var final_word1 = this._reverse_word(parseInt(final_binary.substr(32), 2));
			var final_word2 = this._reverse_word(parseInt(final_binary.substr(0, 32), 2));
		}

		this.buffer = this.buffer.concat(convert.word_to_bytes(final_word1));
		this.buffer = this.buffer.concat(convert.word_to_bytes(final_word2));
	},

	/**
	 *	Finalizes the hash and returns the result.
	 *	This is called internally by the hash method of the Hasher subclass instance when streaming mode
	 *	is turned off. It should be called explicitly when using streaming mode after all data
	 *	is passed into the hash method.
	 *
	 *	@param {Object} options						Optional options object (descriptions of parameters below)		
	 *	@param {string} [options.return_format=hex]	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {string|Array}						A string or array depending on options.return_format
	 */
	finalize: function(options)
	{
		options || (options = {});
		options.return_format || (options.return_format = 'hex');

		// DO FINALIZE
		this.pad();
		
		// Hash our padded final buffer in streaming mode
		this.hash([], {stream: true});

		// If there is a final_transform defined for this hasher (ie. swap endian) DO IT
		if (this.reverse_endian_words == true)
			this.h = [this._reverse_word(this.h[0]), this._reverse_word(this.h[1]), this._reverse_word(this.h[2]), this._reverse_word(this.h[3])];


		var output = this.h.slice(0);

		this.clear();

		switch (options.return_format)
		{
			case 'hex':
				return convert.binstring_to_hex(convert.words_to_binstring(output));
			case 'binary':
				return convert.words_to_binstring(output);
			case 'words':
				return output;
		}
	},

	/**
	 *	Returns the block size in bits for the current instance
	 *	@return {number} The block size in bits.
	 */
	get_block_size: function()
	{
		return this.block_size;
	},

	/**
	 *	Returns the length in bits of the output block for this instance
	 *	@return {number} The output block size in bits.
	 */
	get_outlen: function()
	{
		return this.outlen;
	},

	/**
	 *	Reverses the endian-ness of the bytes in a word
	 *
	 *	@param {number} word		32-bit input word
	 *	@return {number}			32-bit word with bytes swapped around
	 *	@private
	 */
	_reverse_word: function(word) {
		return convert.to_word(word & 255, (word >>> 8) & 255, (word >>> 16) & 255, (word >>> 24) & 255);
	},
});
