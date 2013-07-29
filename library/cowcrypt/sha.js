/*
 *	Secure Hash Algorithm classes
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */
 /**
 *	@class
 *	@classdesc		Implements the SHA-1 secure hash algorithm specified in FIPS 180-4 ({@link http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf})
 *	@extends		Hasher
 *	@desc			Creates a new SHA-1 instance.
 *	@requires		convert
 */
var SHA1 = new Class(
/** @lends SHA1.prototype */
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
	outlen: 160,

	/**
	 *	This is called automatically on class instantiation.
	 *	@return {SHA1}
	 */
	initialize: function()
	{
		this.clear();
		return this;
	},

	/**
	 *	Initialize class values, invoking {@link Hasher#clear} before clearing values specific to {@link SHA1}.
	 *	This is called internally at the end of {@link SHA1#finalize}, and can be called explicitly when
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
			0x10325476,
			0xC3D2E1F0
		];
	},

	/**
	 *	Hashes data into the SHA1 class instance.
	 *	
	 *	@param {string} data							ASCII-encoded binary string data to hash. Any non-ASCII characters
	 *													should be first encoded out using {@link convert.utf8.encode}
	 *	@param {Object} [options]						Optional options object
	 *	@param {boolean} [options.stream=false]			Whether to use streaming (progressive hashing) mode. In streaming
	 *													mode, you can repeatedly hash data into the SHA1 object.
	 *													The hash will not be finalized and returned until you call
	 *													{@link SHA1#finalize}. Streaming mode is useful when you have to
	 *													hash a huge amount of data and you don't want to store all
	 *													of it in memory at one time.
	 *	@param {string} [options.return_format='hex']	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {string|Array|SHA1}						Desired output format if streaming mode is turned off. Otherwise this instance (chainable)
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

		for (var i=0; (i+64) <= _buffer.length; i += 64)
		{
			var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], w = convert.to_words(_buffer.slice(i, i+64));

			for (var t = 0; t < 80; t++)
			{
				if (t >= 16)
				{
					var _wt = w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16];
					w[t] = (_wt << 1) | (_wt >>> 31);
				}
			
				var temp = ((a << 5) | (a >>> 27)) + e + w[t];
				if (t < 20)
					temp += ((b & c) | (~b & d)) + 0x5A827999;
				else if (t < 40)
					temp += (b ^ c ^ d) + 0x6ed9eba1;
				else if (t < 60)
					temp += ((b & c) | (b & d) | (c & d)) + 0x8F1BBCDC;
				else // if (t < 80)
					temp += (b ^ c ^ d) + 0xCA62C1D6;

				var e = d, d = c, c = (b << 30) | (b >>> 2), b = a, a = temp;
			}
			
			h[0] += a;
			h[1] += b;
			h[2] += c;
			h[3] += d;
			h[4] += e;

			_processed_length += 512;
		}

		this.buffer 			= _buffer.slice(i);
		this.processed_length	= _processed_length;
		
		if (options.stream == false)
			return this.finalize(options);

		return this;
	}
});

 /**
 *	@class
 *	@classdesc		Implements the SHA-256 secure hash algorithm specified in FIPS 180-4 ({@link http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf})
 *	@extends		Hasher
 *	@desc			Creates a new SHA-256 instance.
 *	@requires		convert
 */
var SHA256 = new Class(
/** @lends SHA256.prototype */
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
	outlen: 256,

	/**
	 *	Constants lookup table used for bitwise operations in the SHA256 algorithm
	 *	@private
	 */
	k: [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	],

	/**
	 *	This is called automatically on class instantiation.
	 *	@return {SHA256}
	 */
	initialize: function()
	{
		this.clear();
	},

	/**
	 *	Initialize class values, invoking {@link Hasher#clear} before clearing values specific to {@link SHA1}.
	 *	This is called internally at the end of {@link SHA256#finalize}, and can be called explicitly when
	 *	using progressive hashing.
	 *	@override
	 */
	clear: function()
	{
		this.parent();
		this.h = [
			0x6a09e667,
			0xbb67ae85,
			0x3c6ef372,
			0xa54ff53a,
			0x510e527f,
			0x9b05688c,
			0x1f83d9ab,
			0x5be0cd19
		];
	},

	/**
	 *	Hashes data into the SHA256 class instance.
	 *	
	 *	@param {string} data							ASCII-encoded binary string data to hash. Any non-ASCII characters
	 *													should be first encoded out using {@link convert.utf8.encode}
	 *	@param {Object} [options]						Optional options object
	 *	@param {boolean} [options.stream=false]			Whether to use streaming (progressive hashing) mode. In streaming
	 *													mode, you can repeatedly hash data into the SHA256 object.
	 *													The hash will not be finalized and returned until you call
	 *													{@link SHA256#finalize}. Streaming mode is useful when you have to
	 *													hash a huge amount of data and you don't want to store all
	 *													of it in memory at one time.
	 *	@param {string} [options.return_format='hex']	(binary|hex|words) The return format. Default: hex
	 *
	 *	@return {string|Array|SHA256}					Desired output format if streaming mode is turned off. Otherwise this instance (chainable)
	 */
	hash: function(data, options)
	{
		options || (options = {});
		options.stream || (options.stream = false);

		if (typeof data == 'string')
			data = convert.to_bytes(data);

		var _buffer 			= this.buffer.concat(data);
		var _processed_length 	= this.processed_length;
		var k					= this.k;
		var h					= this.h;

		for (var i=0; (i+64) <= _buffer.length; i += 64)
		{
			var w	= convert.to_words(_buffer.slice(i, i+64));
			var a	= h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], _h = h[7];

			for (var t = 0; t < 64; t++)
			{
				if (t >= 16)
				{
					w[t]	= (
								(((w[t-2] >>> 17) | (w[t-2] << 15)) ^ ((w[t-2] >>> 19) | (w[t-2] << 13)) ^ (w[t-2] >>> 10))
								+ w[t-7]
								+ (((w[t-15] >>> 7) | (w[t-15] << 25)) ^ ((w[t-15] >>> 18) | (w[t-15] << 14)) ^ (w[t-15] >>> 3))
								+ w[t-16]
							  );
				}
				var temp1 	= (
								_h
								+ (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)))
								+ ((e & f) ^ (~e & g))
								+ k[t]
								+ w[t]
							  ) % Math.pow(2,32);

				var temp2 	= (
								((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)))
								+ ((a & b) ^ (a & c) ^ (b & c)
							  );

				var _h = g, g = f, f = e, e = d + temp1, d = c, c = b, b = a, a = temp1 + temp2;
			}
			
			h[0] += a;
			h[1] += b;
			h[2] += c;
			h[3] += d;
			h[4] += e;
			h[5] += f;
			h[6] += g;
			h[7] += _h;

			_processed_length += 512;
		}

		this.buffer 			= _buffer.slice(i);
		this.processed_length	= _processed_length;
		
		if (options.stream == false)
			return this.finalize(options);

		return this;
	}
});
