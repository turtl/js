/**
 *	MD5 Hashing Class
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 *
 *	@class
 *	@classdesc				Implements the MD5 Hashing Algorithm specified in RFC 1321 ({@link https://tools.ietf.org/html/rfc1321})
 *	@extends				Hasher
 *	@requires				convert
 *
 *	@author					Jeff Lyon <jeff@rubbingalcoholic.com>
 *	@copyright				Copyright (c) 2013, Jeff Lyon.
 *	@license				{@link http://www.opensource.org/licenses/mit-license.php|The MIT License}
 *
 *	@desc					Creates a new MD5 instance
 */
var MD5 = new Class(
/** @lends MD5.prototype */
{
	Extends: Hasher,

	/**
	 *	The block size in bits for the hashing operation
	 *	@private
	 *	@type {number}
	 */
	block_size: 512,

	/**
	 *	The length in bits of the output block
	 *	@private
	 *	@type {number}
	 */
	outlen: 128,

	/**
	 *	Whether this hasher lists the word bytes in small endian order (from small to big)
	 *	@private
	 *	@type {boolean}
	 */
	reverse_endian_words: true,

	/**
	 *	T lookup table (filled in by {@link MD5#initialize} method)
	 *	@type {Array}
	 *	@private
	 */
	_t: [],

	/**
	 *	This is called automatically on class instantiation. It performs some one-time
	 *	computation to create a lookup table used by the hashing algorithm.
	 *	@return {MD5}
	 */
	initialize: function()
	{
		this.clear();

		if (this._t.length == 0)
			for (var i = 0; i < 64; i++)
				this._t[i] = Math.floor(Math.abs(Math.sin(i+1)) * 4294967296);

		return this;
	},

	/**
	 *	Initialize class values, invoking {@link Hasher#clear} before clearing values specific to {@link MD5}.
	 *	This is called internally at the end of {@link MD5#finalize}, and can be called explicitly when
	 *	using progressive hashing.
	 *	@override
	 */
	clear: function()
	{
		this.parent();
		this.h = [
			0x67452301,
			0xEFCDAB89,
			0x98BADCFE,
			0x10325476
		];
	},

	/**
	 *	Hashes data into the MD5 class instance.
	 *	
	 *	@param {string} data							ASCII-encoded binary string data to hash. Any non-ASCII characters
	 *													should be first encoded out using {@link convert.utf8.encode}
	 *	@param {Object} [options]						Optional options object
	 *	@param {boolean} [options.stream=false]			Whether to use streaming (progressive hashing) mode. In streaming
	 *													mode, you can repeatedly hash data into the MD5 object.
	 *													The hash will not be finalized and returned until you call
	 *													{@link MD5#finalize}. Streaming mode is useful when you have to
	 *													hash a huge amount of data and you don't want to store all
	 *													of it in memory at one time.
	 *	@param {string} [options.return_format='hex']	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {string|Array|MD5}						Desired output format if streaming mode is turned off. Otherwise this instance (chainable)
	 */
	hash: function(data, options)
	{
		options || (options = {});
		options.stream || (options.stream = false);

		if (typeof data == 'string')
			data = convert.to_bytes(data);

		var _buffer 			= this.buffer.concat(data);
		var _processed_length 	= this.processed_length;
		var h					= this.h;
		var t					= this._t;

		var r1 = function(a, b, c, d, k, s, i)
		{
			var val = a + ((b & c) | (~b & d)) + x[k] + t[i];
			return ((val << s) | (val >>> (32 - s))) + b;
		}

		var r2 = function(a, b, c, d, k, s, i)
		{
			var val = a + ((b & d) | (c & ~d)) + x[k] + t[i];
			return ((val << s) | (val >>> (32 - s))) + b;
		}

		var r3 = function(a, b, c, d, k, s, i)
		{
			var val = a + (b ^ c ^ d) + x[k] + t[i];
			return ((val << s) | (val >>> (32 - s))) + b;
		}

		var r4 = function(a, b, c, d, k, s, i)
		{
			var val = a + (c ^ (b | ~d)) + x[k] + t[i];
			return ((val << s) | (val >>> (32 - s))) + b;
		}

		for (var i = 0; (i+64) <= _buffer.length; i += 64)
		{
			var a = h[0], b = h[1], c = h[2], d = h[3], w = _buffer.slice(i, i+64), x = [];

			// Convert the 64-bytes to an array of reverse endian words
			for (var j = 0; j < 64; j += 4)
				x.push(((w[j+3] & 255) << 24) | ((w[j+2] & 255) << 16) | ((w[j+1] & 255) << 8) | (w[j] & 255));

			var a = r1(a, b, c, d, 0,	7,	0);
			var d = r1(d, a, b, c, 1,	12,	1);
			var c = r1(c, d, a, b, 2,	17,	2);
			var b = r1(b, c, d, a, 3,	22,	3);
			var a = r1(a, b, c, d, 4,	7,	4);
			var d = r1(d, a, b, c, 5,	12,	5);
			var c = r1(c, d, a, b, 6,	17,	6);
			var b = r1(b, c, d, a, 7,	22,	7);
			var a = r1(a, b, c, d, 8,	7,	8);
			var d = r1(d, a, b, c, 9,	12,	9);
			var c = r1(c, d, a, b, 10,	17,	10);
			var b = r1(b, c, d, a, 11,	22,	11);
			var a = r1(a, b, c, d, 12,	7,	12);
			var d = r1(d, a, b, c, 13,	12,	13);
			var c = r1(c, d, a, b, 14,	17,	14);
			var b = r1(b, c, d, a, 15,	22,	15);

			var a = r2(a, b, c, d, 1,	5,	16);
			var d = r2(d, a, b, c, 6,	9,	17);
			var c = r2(c, d, a, b, 11,	14,	18);
			var b = r2(b, c, d, a, 0,	20,	19);
			var a = r2(a, b, c, d, 5,	5,	20);
			var d = r2(d, a, b, c, 10,	9,	21);
			var c = r2(c, d, a, b, 15,	14,	22);
			var b = r2(b, c, d, a, 4,	20,	23);
			var a = r2(a, b, c, d, 9,	5,	24);
			var d = r2(d, a, b, c, 14,	9,	25);
			var c = r2(c, d, a, b, 3,	14,	26);
			var b = r2(b, c, d, a, 8,	20,	27);
			var a = r2(a, b, c, d, 13,	5,	28);
			var d = r2(d, a, b, c, 2,	9,	29);
			var c = r2(c, d, a, b, 7,	14,	30);
			var b = r2(b, c, d, a, 12,	20,	31);

			var a = r3(a, b, c, d, 5,	4,	32);
			var d = r3(d, a, b, c, 8,	11,	33);
			var c = r3(c, d, a, b, 11,	16,	34);
			var b = r3(b, c, d, a, 14,	23,	35);
			var a = r3(a, b, c, d, 1,	4,	36);
			var d = r3(d, a, b, c, 4,	11,	37);
			var c = r3(c, d, a, b, 7,	16,	38);
			var b = r3(b, c, d, a, 10,	23,	39);
			var a = r3(a, b, c, d, 13,	4,	40);
			var d = r3(d, a, b, c, 0,	11,	41);
			var c = r3(c, d, a, b, 3,	16,	42);
			var b = r3(b, c, d, a, 6,	23,	43);
			var a = r3(a, b, c, d, 9,	4,	44);
			var d = r3(d, a, b, c, 12,	11,	45);
			var c = r3(c, d, a, b, 15,	16,	46);
			var b = r3(b, c, d, a, 2,	23,	47);

			var a = r4(a, b, c, d, 0,	6,	48);
			var d = r4(d, a, b, c, 7,	10,	49);
			var c = r4(c, d, a, b, 14,	15,	50);
			var b = r4(b, c, d, a, 5,	21,	51);
			var a = r4(a, b, c, d, 12,	6,	52);
			var d = r4(d, a, b, c, 3,	10,	53);
			var c = r4(c, d, a, b, 10,	15,	54);
			var b = r4(b, c, d, a, 1,	21,	55);
			var a = r4(a, b, c, d, 8,	6,	56);
			var d = r4(d, a, b, c, 15,	10,	57);
			var c = r4(c, d, a, b, 6,	15,	58);
			var b = r4(b, c, d, a, 13,	21,	59);
			var a = r4(a, b, c, d, 4,	6,	60);
			var d = r4(d, a, b, c, 11,	10,	61);
			var c = r4(c, d, a, b, 2,	15,	62);
			var b = r4(b, c, d, a, 9,	21,	63);

			h[0] = (h[0] + a) | 0;
			h[1] = (h[1] + b) | 0;
			h[2] = (h[2] + c) | 0;
			h[3] = (h[3] + d) | 0;

			_processed_length += 512;
		}

		this.buffer 			= _buffer.slice(i);
		this.processed_length	= _processed_length;
		
		if (options.stream == false)
			return this.finalize(options);

		return this;
	}
});