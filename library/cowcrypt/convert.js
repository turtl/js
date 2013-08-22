/*
 *	Data Conversion Utilities:
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */
/**
 *	@classdesc
 *	This static class offers a grab bag of methods for various types of data conversion operations.
 *	WARNING: unless otherwise noted, any method that accepts a string input *must* be ASCII-encoded.
 *	(ie. no UTF8 / Unicode multibyte characters values are accepted) Use {@link convert.utf8.encode}
 *	to encode any non-ASCII string data as needed. Ignore this warning at your own peril.
 *
 *	@namespace
 *	@type {Object}
 *
 *	@author		Jeff Lyon <jeff@rubbingalcoholic.com>
 *	@copyright	Copyright (c) 2013, Jeff Lyon. ({@link http://rubbingalcoholic.com})
 *	@license	{@link http://www.opensource.org/licenses/mit-license.php|The MIT License}
 */
var convert = {
	/**
	 *	Converts an ASCII string to an array of 8-bit integer bytes.
	 *
	 *	@static
	 *	@param {string} str		The input string
	 *	@return {Array}			The byte array
	 */
	to_bytes: function(str)
	{
		var bytes = [];

		for (var i = 0; i < str.length; i++)
			bytes.push(str.charCodeAt(i) & 255);
		
		return bytes;
	},

	/**
	 *	Converts an ASCII string or byte array to an array of "words" (32-bit integers)
	 *	(RA NOTE ~ Assumes the input string length is a multiple of 4)
	 *
	 *	@param {string|Array} data						The input string or array
	 *	@param {Object} [options]						Optional options object.
	 *	@param {boolean} [options.reverse_endian=false]	Whether to reverse the endian-ness (byte order) of the word bytes
	 *	@return {Array}									An array of 32-bit integers
	 */
	to_words: function(data, options)
	{
		options || (options = {});
		options.reverse_endian || (options.reverse_endian = false);

		var words		= [];
		var _to_word 	= this.to_word;

		if (typeof data != 'string')
			if (!options.reverse_endian)
				for (var i=0; i<data.length; i+=4)
					words.push(_to_word(data[i], data[i+1], data[i+2], data[i+3]));
			else
				for (var i=0; i<data.length; i+=4)
					words.push(_to_word(data[i+3], data[i+2], data[i+1], data[i]));
		else
			if (!options.reverse_endian)
				for (var i=0; i<data.length; i+=4)
					words.push(_to_word(data.charCodeAt(i), data.charCodeAt(i+1), data.charCodeAt(i+2), data.charCodeAt(i+3)));
			else
				for (var i=0; i<data.length; i+=4)
					words.push(_to_word(data.charCodeAt(i+3), data.charCodeAt(i+2), data.charCodeAt(i+1), data.charCodeAt(i)));

		return words;
	},

	/**
	 *	Joins up to 4 arbitrary 8-bit integer bytes into one 32-bit integer word
	 *
	 *	@param {number} byte1		8-bit integer. Most significant byte
	 *	@param {number} byte2		8-bit integer. Second most significant byte
	 *	@param {number} byte3		8-bit integer. Third most significant byte
	 *	@param {number} byte4		8-bit integer. Least significant byte
	 *	@return {number}			A 32 bit integer word
	 */
	to_word: function()
	{
		if (arguments.length == 4)
			return ((arguments[0] & 255) << 24) | ((arguments[1] & 255) << 16) | ((arguments[2] & 255) << 8) | (arguments[3] & 255);
		/*
		// RA NOTE ~ No longer support passing one string byte into this method. Not sure why I ever did.
		else if (typeof arguments[0] == 'string')
			return this.to_words(arguments[0]).shift();
		*/

		var joined 	= 0;	
		for (var i = arguments.length-1; i >= 0; i--)
			joined |= (arguments[i] & 255) << 8*(arguments.length-1-i);
		
		return joined; 
	},

	/**
	 *	Converts an array of 32-bit integer words to an ASCII-encoded binary string
	 *
	 *	@param {Array} words	Array of 32-bit integer words
	 *	@return {string}		ASCII-encoded binary string
	 */
	words_to_binstring: function(words)
	{
		var binary 				= '';
		var _word_to_binstring	= this.word_to_binstring;

		for (var i = 0; i < words.length; i++)
			binary += _word_to_binstring(words[i]);

		return binary;
	},

	/**
	 *	Converts an array of 32-bit integer words to a hex string
	 *
	 *	@param {Array} words	Array of 32-bit integer words
	 *	@return {string}		Hexademical string
	 */
	words_to_hex: function(words)
	{
		return this.binstring_to_hex(this.words_to_binstring(words));
	},

	/**
	 *	Converts an array of 32-bit integer words to an array of 8-bit integer bytes
	 *
	 *	@param {Array} words	Array of 32-bit integer words
	 *	@return {Array}			Array of 8-bit integer bytes
	 */
	words_to_bytes: function(words)
	{
		var bytes 				= [];
		var _word_to_bytes		= this.word_to_bytes;

		for (var i = 0; i < words.length; i++)
			bytes = bytes.concat(_word_to_bytes(words[i]));

		return bytes;
	},

	/**
	 *	Converts a 32-bit integer word to a 4 byte ASCII-encoded binary string
	 *
	 *	@param {number} word	32-bit integer word
	 *	@return {string}		ASCII-encoded binary string
	 */
	word_to_binstring: function(word)
	{
		return 		String.fromCharCode((word >>> 24) & 255)
				+ 	String.fromCharCode((word >>> 16) & 255)
				+ 	String.fromCharCode((word >>> 8) & 255)
				+	String.fromCharCode(word & 255);
	},

	/**
	 *	Splits a 32-bit integer word to an array of four 8-bit integers
	 *
	 *	@param {number} word	32-bit integer word
	 *	@param {Array}			Array of 8-bit integers
	 */
	word_to_bytes: function(word)
	{
		return [
			((word >>> 24) & 255),
			((word >>> 16) & 255),
			((word >>> 8) & 255),
			(word & 255)
		];
	},

	/**
	 *	Converts a hex string to an ASCII-encoded binary string.
	 *	
	 *	@param {string} hex		Hexadecimal string (do not prefix with '0x'}
	 *	@return {string}		ASCII-encoded binary string
	 */
	hex_to_binstring: function(hex)
	{
		if (hex.length % 2 == 1)
			hex = '0'+hex;

		var binary = '';

		for (var i = 0; i < hex.length; i += 2)
			binary += String.fromCharCode(parseInt(hex.substr(i, 2),16));

		return binary;
	},

	/**
	 *	Converts an ASCII-encoded binary string to a hexadecimal string
	 *	
	 *	@param {string} str		ASCII-encoded binary string
	 *	@return {string}		Hexadecimal string
	 */
	binstring_to_hex: function(str)
	{
		var hex = '';
		for (var i=0; i < str.length; i++)
			hex += (str.charCodeAt(i).toString(16).length == 1 ? '0' : '') + str.charCodeAt(i).toString(16);
		
		return hex;
	},

	/**
	 *	@classdesc Static class for Base64 Encoder / Decoder functionality. This is a child of {@link convert}.
	 *	@namespace
	 */
	base64:
	{
		/**
		 *	The list of characters used in the conversion process
		 *	@private
		 */
		chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

		/**
		 *	Encodes string data into Base64 format string
		 *
		 *	@param {string} data	ASCII-encoded string data
		 *	@return {string}		Base64-encoded string
		 *
		 *	@example
		 *
		 *	convert.base64.encode("They don't call me honest nothing for abe!");
		 *	// outputs "VGhleSBkb24ndCBjYWxsIG1lIGhvbmVzdCBub3RoaW5nIGZvciBhYmUh"
		 *
		 */
		encode: function(data)
		{
			var output = '';
			for (i=0, c=data.length; i<c; i += 3)
			{
				var char1 = data.charCodeAt(i) >> 2;
				var char2 = ((data.charCodeAt(i) & 3) << 4) | data.charCodeAt(i+1) >> 4;
				var char3 = ((data.charCodeAt(i+1) & 15) << 2) | data.charCodeAt(i+2) >> 6;
				var char4 = data.charCodeAt(i+2) & 63;

				output 	+= 	this.chars.charAt(char1)
						+ 	this.chars.charAt(char2)
						+	this.chars.charAt(char3)
						+	this.chars.charAt(char4);
			}
			if (c % 3 == 1)
				output = output.substr(0, output.length - 2) + '==';
			else if (c % 3 == 2)
				output = output.substr(0, output.length - 1) + '=';
			
			return output;
		},

		/**
		 *	Decodes data from Base64 format string into plaintext
		 *
		 *	@param {string} str	Base64 string to decode
		 *	@return {string}	ASCII-encoded plaintext string
		 *
		 *	@example
		 *
		 *	convert.base64.decode("VGhleSBkb24ndCBjYWxsIG1lIGhvbmVzdCBub3RoaW5nIGZvciBhYmUh");
		 *	// outputs "They don't call me honest nothing for abe!"
		 *
		 */
		decode: function(str)
		{
			var data = '';

			for (i=0, c=str.length; i<c; i += 4)
			{
				var char1 = this.chars.indexOf(str.charAt(i));
				var char2 = this.chars.indexOf(str.charAt(i+1));
				var char3 = this.chars.indexOf(str.charAt(i+2));
				var char4 = this.chars.indexOf(str.charAt(i+3));

				data += String.fromCharCode(char1 << 2 | char2 >> 4);
				if (char3 != -1)
					data += String.fromCharCode((char2 & 15) << 4 | char3 >> 2)
				if (char4 != -1)
					data += String.fromCharCode((char3 & 3) << 6 | char4);
			}
			return data;
		}
	},

	/**
	 *	@classdesc
	 *	Static class for UTF8 Encode / Decode functionality.
	 *	This is a child of {@link convert}.
	 *
	 *	Since most of our encryption, hashing and {@link convert} methods expect
	 *	ASCII-encoded binary strings (ie. 0 <= [character code] <= 255), they
	 *	will misbehave on non-ASCII characters. We can use 
	 *  {@link convert.utf8.is_utf8_string} to test whether we need to use
	 *	{@link convert.utf8.encode} to encode to ASCII before using elsewhere.
	 *
	 *	@namespace
	 */
	utf8:
	{
		/**
		 *	Encodes UTF8 Unicode data to ASCII.
		 *
		 *	@param {string} data	A non-ASCII string
		 *	@return {string}		An ASCII string
		 *
		 *	@example
		 *
		 *	var unicode_string = "ŞĩŁĿŶ ǙƝȈʗʘɗε";
		 *	convert.utf8.encode(unicode_string);	// ASCII output: "ÅÄ©ÅÄ¿Å¶ ÇÆÈÊÊÉÎµ"
		 *	
		 */
		encode: function(data)
		{
			return unescape(encodeURIComponent(data));
		},

		/**
		 *	Decodes encoded ASCII back to UTF-8.
		 *
		 *	@param {string} data	An ASCII string
		 *	@return {string}		A (potentially) UTF-8 String
		 *
		 *	@example
		 *
		 *	var ascii_string = "ÅÄ©ÅÄ¿Å¶ ÇÆÈÊÊÉÎµ";		// it's really ASCII, trust me.
		 *	convert.utf8.decode(ascii_string);		// Unicode output: "ŞĩŁĿŶ ǙƝȈʗʘɗε"
		 *	
		 *
		 */
		decode: function(data)
		{
			return decodeURIComponent(escape(data));
		},

		/**
		 *	Checks to see if a string has UTF8 characters.
		 *
		 *	(We check for character codes that are multi-byte integer values > 255)
		 *
		 *	@param {string} str		A string, maybe containing UTF8 characters
		 *	@return {boolean}		True if UTF8 characters are found
		 *
		 *	@example
		 *
		 *	convert.utf8.is_utf8_string("ŞĩŁĿŶ ǙƝȈʗʘɗε");	// returns true
		 */
		is_utf8_string: function(str)
		{
			return /[^\u0000-\u00ff]/.test(str);
		}
	}
}