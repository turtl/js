"use strict";

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
			for (var i=0, c=data.length; i<c; i += 3)
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

			for (var i=0, c=str.length; i<c; i += 4)
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
"use strict";

/*
 *	Crypto Math Utilities:
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */
var threaded_mode = false;

// Detect whether we're in threaded mode. and listen for messages if so
if (typeof window === 'undefined')
{
	threaded_mode = true;

	self.addEventListener('message', function(e) {
		var data = e.data;
		
		switch (data.cmd)
		{
			case 'get_probable_prime':
				crypto_math.thread_probable_prime_init(data.request.e, data.request.nlen, data.request.p);
				break;
			case 'get_rsa_encrypt':
				crypto_math.thread_rsa_encrypt(data.request.plaintext, data.request.n, data.request.e);
				break;
			case 'get_rsa_decrypt':
				crypto_math.thread_rsa_decrypt(data.request.ciphertext, data.request.n, data.request.d);
				break;
			case 'put_csprng_random_values':
				var thread_state = crypto_math.thread_state;

				if (thread_state.task == 'probable_prime' && thread_state.stage == 'begin')
				{
					crypto_math.thread_probable_prime_construct_candidate(data.response.random_values);
				}
				else if (thread_state.task == 'probable_prime' && thread_state.stage == 'miller_rabin_test_begin')
				{
					crypto_math.thread_probable_prime_miller_rabin_test_check(data.response.random_values);
				}
				break;

			// RA NOTE ~ Removed provable prime generation until someone whines about it
			/*
			case 'get_provable_prime':
				var result = crypto_math.s_t_random_prime(data.request.bitlength, data.request.seed);
				self.postMessage({
					cmd: 'put_provable_prime',
					response: {
						result: result,
						timers: crypto_math.get_timers()
					}
				});
				break;
			*/
		};
	}, false);
}

/**
 *	@classdesc
 *	This static class offers a grab bag of methods for various types of mathematical operations.
 *
 *	@namespace
 *	@type {Object}
 *
 *	@author		Jeff Lyon <jeff@rubbingalcoholic.com>
 *	@copyright	Copyright (c) 2013, Jeff Lyon. ({@link http://rubbingalcoholic.com})
 *	@license	{@link http://www.opensource.org/licenses/mit-license.php|The MIT License}
 */
var crypto_math = {

	/**
	 *	Table to contain small primes for trial division
	 *	@private
	 *	@type {Array}
	 */
	_primes: [],

	/**
	 *	Users a CSPRNG to generate a random number of a specified bit length
	 *
	 *	@param {Number} bits	The desired bitlength, minimum 32
	 *	@return {BigInt}		A random BigInt
	 */
	get_secure_random_bigint: function(bits)
	{
		var rand	= this.get_csprng_random_values(bits);
		var bigint	= this.words_to_bigint(rand);

		return bigint;
	},

	/**
	 *	Reads bits from a Cryptographically Secure Pseudorandom Number Generator into a word array
	 *
	 *	@param {Number} bits	The desired bitlength, minimum 32
	 *	@return {Array}			Array of 32-bit words
	 */
	get_csprng_random_values: function(bits)
	{
		var len		= Math.ceil(bits/32);
		var rand	= new Uint32Array(len);
		window.crypto.getRandomValues(rand);

		return rand;
	},

	/**
	 *	Generates a random BigInt using an iterated hashing algorithm on a random seed
	 *
	 *	@param {Number} iterations		The number of iterations
	 *	@param {BigInteger} seed		MUST BE A RANDOM SEED. The seed to be used for the random generation.
	 *	@param {Hasher} hasher			A reference to a Hasher subclass
	 *	@return {Object}				An object with property random_val (a BigInteger) and seed (the modified random seed)
	 */
	generate_hashed_random_bigint: function(iterations, seed, hasher)
	{
		var _bigint			= new BigInt();

		var x = [];

		for (var i = 0; i <= iterations; i++)
		{
			var _random_val	= new hasher().hash(this.bigint_to_binstring(_bigint.addInt(seed, i)), {return_format: 'words'});
			x = _random_val.concat(x);
		}
		x = this.words_to_bigint(x);
		
		seed = _bigint.addInt(seed, iterations+1);

		return {
			random_val: x,
			seed: seed
		}
	},

	/**
	 *	Generates a BigInt power of 2
	 *
	 *	@param {Number} power		The power to raise 2 to
	 *	@return {BigInt}			The BigInt
	 */
	get_bigint_power_of_two: function(power)
	{
		var base2 = "1";
		for (var i=0; i<power; i++)
			base2 += "0";

		var leemon_bigint		= new BigInt().str2bigInt(base2, 2);

		return leemon_bigint;
	},

	/**
	 *	Generates a random public exponent
	 *
	 *	@return {BigInt}			Public exponent
	 */
	get_random_public_exponent: function()
	{
		var bits = 32;

		var _bigint	= new BigInt();
		var rand	= this.get_secure_random_bigint(bits);
		var e		= _bigint.add(this.get_bigint_power_of_two(16), rand);

		if (_bigint.modInt(e, 2) == 0)
			e		= _bigint.addInt(e, 1);

		return e;
	},

	/**
	 *	Verifies that a public exponent meets the criteria specified in
	 *	FIPS-186-3 section 3.1
	 *
	 *	@return {Boolean}		Whether the key is valid
	 */
	verify_public_exponent: function(e)
	{
		var _bigint	= new BigInt();
		var two_16	= this.get_bigint_power_of_two(16);
		var two_256	= this.get_bigint_power_of_two(256);

		if (_bigint.greater(two_16, e))
			return false;

		if (_bigint.greater(e, two_256))
			return false;

		return true;
	},

	/**
	 *	Returns an array of prime numbers less than 100,000. The list is generated using the Sieve of Eratosphenes
	 *	algorithm. The list is saved in this.primes, so it only has to be generated once.
	 *
	 *	@return {Array}		An array of prime numbers up to 100,000
	 */
	get_small_primes_table: function()
	{
		if (this._primes.length)
			return this._primes;

		var sieve_length	= 100000;
		var sieve			= new Array(sieve_length);

		for (var i = 2; i < sieve_length; i++)
		{
			if (sieve[i] == 1)
				continue;

			for (var j = 2 * i; j <= sieve_length; j += i)
				sieve[j] = 1;
		}

		for (var i = 2; i < sieve_length; i++)
			if (sieve[i] != 1)
				this._primes.push(i);

		return this._primes;
	},

	/**
	 *	Given BigInts e, p and q, returns an object containing the full private key data
	 *
	 *	@param {BigInt} e	The public exponent
	 *	@param {BigInt} p	Private prime exponent p
	 *	@param {BigInt} q	Private prime exponent q
	 *	@return {Object}	Object containing the following properties: {
	 *							e: 		public exponent,
	 *							n: 		modulus,
	 *							d: 		private exponent,
	 * 							phi_n: 	the value Φ(n),
	 *							p: 		large prime p such that p < q (may be reordered from input),
	 *							q: 		large prime q such that q > p (may be reordered from input),
	 *							u: 		multiplicative inverse of the (potentially reordered) p mod q
	 *						}
	 */
	compute_rsa_key_inverse_data: function(e, p, q)
	{
		var _bigint		= new BigInt();

		if (_bigint.greater(p, q))
		{
			// We want to constrain p < q, to comply with RFC-4880
			var tmp	= q;
			q		= p;
			p		= tmp;
		}

		var n		= _bigint.mult(p, q);
		var phi_n	= _bigint.mult(_bigint.addInt(p, -1), _bigint.addInt(q, -1));

		var d 		= _bigint.inverseMod(e, phi_n);           
		var u 		= _bigint.inverseMod(p, q);  
        
        if (!d)
			throw new Error('The given public exponent was not relatively prime to (p - 1)(q - 1)');

		return {
			e: e,
			n: n,
			d: d,
			phi_n: phi_n,
			p: p,
			q: q,
			u: u
		}
	},

	/**
	 *	Object holding the thread state so we can pass requests to the main thread
	 *	and then go back to the right place on response
	 *	@private
	 *	@type {Object}
	 */
	thread_state: {},

	/**
	 *	Error code for unsupported nlen (security length)
	 *	@private
	 *	@type {Number}
	 */
	THREAD_ERR_NLEN: 1,

	/**
	 *	Error code for invalid public exponent
	 *	@private
	 *	@type {Number}
	 */
	THREAD_ERR_E: 2,

	/**
	 *	Error code for failed probable prime generation
	 *	@private
	 *	@type {Number}
	 */
	THREAD_ERR_PRIME_FAIL: 3,

	/**
	 *	Initialize the probable prime generation thread after doing some sanity checks
	 *
	 *	@param {BigInt} e		The public exponent
	 *	@param {Number} nlen	The desired security length
	 *	@param {BigInt} [p]		Optional constraint for generation of q
	 */
	thread_probable_prime_init: function(e, nlen, p)
	{
		if (nlen != 2048 && nlen != 3072)
			this.thread_error('nlen must be 2048 or 3072 (given '+parseInt(nlen)+')', this.THREAD_ERR_NLEN);

		if (!this.verify_public_exponent(e))
			this.thread_error('invalid public exponent specified', this.THREAD_ERR_E);

		var _bigint			= new BigInt();

		// These numbers correspond to sqrt(2)*2^((nlen / 2) – 1)   ...believe me.
		if (nlen == 2048)
		{
			var lower_bound = '89884656743115795386465259539451236680898848947115328636715040578866337902750481566354238661203768010560056939935696678829394884407208311246423715319737062188883946712432742638151109800623047059726541476042502884419075341171231440736956555270413618581675255342293149119973622969239858152417678164812112068608';
			var abs_min		= '141812983367708498267942666831007057202459354558886953263833223277658525196114003519551116418471942004184601191539094262166460537485590525416453416929473364427849849743600833315151825889043592154525680139765876503569388266265666970077237981829515274335102568192877188951851401217';
			var m_r_count	= 5;
		}
		else
		{
			var lower_bound = '1205156213460516294290058303014157056456046623972844475679837519532628695795901600334542512053673024831724383140444002393931208489397479162484806493945387325727606669690812612385391038958840749838422771568693910028798672928952299554730693561049753982498907820671150338814736677640808714205897081983892935185184484554610795971527116005781379225040289793925450496857446141738323315590757531902436687591130253123496418949352985506262921662200616493428502380169658368';
			var abs_min		= '1901401242966379632441945933122405564502699168890374749247369562864802585451004209832696515053742316846594178854977200165146588192769075840861817416525212691245513043092574076284328636500849137520986958696226722405264137600414778995896732994290595012118789429865204793400110313875721538450343971935482111205157946166348719809392729453341450394667052927912914855801753338166857982316138938427044449697165870468846196415120486732660737';
			var m_r_count	= 4;
		}
		
		this.thread_state = {
			task: 'probable_prime',
			stage: 'init',
			data: {
				e: e,
				nlen: nlen,
				p: p,
				m_r_count: m_r_count,
				i: 0,
				j: 0,
				a: 0,
				m: 0,
				wlen: 0,
				candidate: 0,
				lower_bound: _bigint.str2bigInt(lower_bound, 10),
				abs_min: _bigint.str2bigInt(abs_min, 10)
			}
		};
		this.thread_probable_prime_begin();
	},

	/**
	 *	Begins the probable prime generation loop by requesting random bits from the main thread
	 */
	thread_probable_prime_begin: function()
	{
		var state	= this.thread_state;
		state.stage	= 'begin';

		self.postMessage({
			cmd: 'get_csprng_random_values',
			request: {
				bits: (state.data.nlen / 2)
			}
		});
	},

	/**
	 *	Constructs a prime candidate from random bits passed in from the main thread
	 *
	 *	@param {Uint32Array} random_words	An array of random words
	 */
	thread_probable_prime_construct_candidate: function(random_words)
	{
		var state				= this.thread_state;
		state.stage				= 'construct_candidate';

		var _bigint				= new BigInt();
		var one					= _bigint.str2bigInt("1", 10);
		var candidate			= this.words_to_bigint(random_words);

		// Make sure candidate is odd
		if (_bigint.modInt(candidate, 2) == 0)
			candidate	= _bigint.addInt(candidate, 1);

		// If p exists, then we're obviously generating q, so we must constrain |p – q| > 2^(nlen/2 – 100)
		if (state.data.p)
		{
			// if p > q
			if (_bigint.greater(state.data.p, candidate))
			{
				// if 2^((nlen / 2) - 100) > p - q THEN REJECT
				if (_bigint.greater(state.data.abs_min, _bigint.sub(state.data.p, candidate)))
					return this.thread_probable_prime_reject_candidate(true);	
			}
			// if q > p
			else if (_bigint.greater(candidate, state.data.p))
			{
				// if 2^((nlen / 2) - 100) > q - p THEN REJECT
				if (_bigint.greater(state.data.abs_min, _bigint.sub(candidate, state.data.p)))
					return this.thread_probable_prime_reject_candidate(true);
			}
			// EXTREMELY rare event that p = q
			else if (_bigint.equals(state.data.p, candidate))
				return this.thread_probable_prime_reject_candidate(true);
		}

		// RA NOTE ~ FIPS-186-3 Algorithm B.3.3 Step 4.4 says if (candidate < SQRT(2)*2^((nlen / 2)–1)) THEN REJECT
		if (_bigint.greater(state.data.lower_bound, candidate))
			return this.thread_probable_prime_reject_candidate();		

		// Use trial division to filter out small prime divisors
		var small_primes 		= this.get_small_primes_table();
		for (var i=0; i < small_primes.length; i++)
			if (_bigint.modInt(candidate, small_primes[i])==0 && !_bigint.equalsInt(candidate, small_primes[i]))
				return this.thread_probable_prime_reject_candidate();
		
		// If (GCD(candidate − 1, e) != 1) THEN REJECT
		if (_bigint.equalsInt(_bigint.safeGCD(_bigint.sub(candidate, one), state.data.e), 1) == false)
			return this.thread_probable_prime_reject_candidate();
		
		// Candidate passed our initial sanity check, perform Miller Rabin testing
		state.data.candidate = candidate;
		this.thread_probable_prime_miller_rabin_test_init();
	},

	/**
	 *	Rejects a probable prime candidate, increments the iteration count,
	 *	and restarts the search for a candidate
	 */
	thread_probable_prime_reject_candidate: function(dont_increment_i)
	{
		dont_increment_i || (dont_increment_i = false);

		var state				= this.thread_state;
		state.stage				= 'reject_candidate';
		state.data.candidate	= 0;

		if (dont_increment_i == false)
			state.data.i++;
		
		if (state.data.i >= 5*(state.data.nlen))
			this.thread_error('probable prime generation failed (giving up after too many tries)', this.THREAD_ERR_PRIME_FAIL);

		this.thread_probable_prime_begin();

		return false;
	},

	/**
	 *	Begins Miller-Rabin testing on a prime candidate
	 */
	thread_probable_prime_miller_rabin_test_init: function()
	{
		var state		= this.thread_state;
		state.stage		= 'miller_rabin_test_init';

		var _bigint		= new BigInt();
		var one			= _bigint.str2bigInt("1", 10);
		var two			= _bigint.addInt(one, 1);

		var a 			= 0;
		var m			= _bigint.addInt(state.data.candidate, -1);

		// Find a such that m = (candidate - 1) / 2^a
		while (_bigint.modInt(m, 2) == 0)
		{
			a++;
			m 			= (_bigint.divRem(m, two))[0];
		}
		
		state.data.j	= 0;
		state.data.a	= a;
		state.data.m	= m;
		state.data.wlen	= _bigint.bitSize(state.data.candidate);

		this.thread_probable_prime_miller_rabin_test_begin();
	},

	/**
	 *	Begins the Miller Rabin test requesting random bits from the main thread
	 */
	thread_probable_prime_miller_rabin_test_begin: function()
	{
		var state	= this.thread_state;
		state.stage	= 'miller_rabin_test_begin';

		if (state.data.j >= state.data.m_r_count - 1)
		{
			self.postMessage({
				cmd: 'put_probable_prime',
				response: {
					prime: state.data.candidate
				}
			});
			return true;
		}

		self.postMessage({
			cmd: 'get_csprng_random_values',
			request: {
				bits: state.data.wlen
			}
		});
	},

	/**
	 *	Performs the Miller Rabin test against a prime candidate using a random
	 *	value helpfully passed by the main thread
	 *
	 *	@param {Uint32Array} random_words	An array of random words
	 */
	thread_probable_prime_miller_rabin_test_check: function(random_words)
	{
		var state		= this.thread_state;
		state.stage		= 'miller_rabin_test_check';

		var _bigint		= new BigInt();
		var one			= _bigint.str2bigInt("1", 10);
		var z			= this.words_to_bigint(random_words);
		var w_minus_1	= _bigint.addInt(state.data.candidate, -1);

		// If ( (z ≤ 1) or (z ≥ w−1)) THEN GET ANOTHER RANDOM VALUE
		if (_bigint.equalsInt(z, 0) || _bigint.equalsInt(z, 1) || _bigint.greater(z, w_minus_1)|| _bigint.equals(z, w_minus_1))
			return this.thread_probable_prime_miller_rabin_test_begin();

		// var _double_check = _bigint.millerRabin(state.data.candidate, z);

		_bigint.powMod_(z, state.data.m, state.data.candidate);

		if (_bigint.equalsInt(z, 1) == false && _bigint.equals(z, w_minus_1) == false)
		{
			for (var k = 0; k < state.data.a - 1; k++)
			{
				_bigint.squareMod_(z, state.data.candidate);

				if (_bigint.equalsInt(z, 1) == 0)
					return this.thread_probable_prime_reject_candidate();
			}
			if (!_bigint.equals(z, w_minus_1))
				return this.thread_probable_prime_reject_candidate();	
		}

		/*
		if (!_double_check)
			this.thread_log('LEEMON MILLER RABIN TEST CONFLICT OMGOMG');
		else
			this.thread_log('LEEMON AGREES');
		*/
		
		state.data.j++;
		this.thread_probable_prime_miller_rabin_test_begin();
	},

	/**
	 *	Encrypts an RSA plaintext. You are responsible for doing any encoding (ie. PKCS1 v1.5)
	 *	before calling this
	 *	
	 *	@param {string} plaintext	ASCII-encoded binary string data to encrypt. Any non-ASCII characters
	 *								should be first encoded out using {@link convert.utf8.encode}
	 *	@param {BigInt} n			Modulus n
	 *	@param {BigInt} e			Public Exponent e
	 */
	encrypt: function(plaintext, n, e)
	{
		var big = crypto_math.binstring_to_bigint(padded);

		// encrypt it
		big = new BigInt().powMod(big, key.get_exponent_public(), key.get_modulus());
		
		// convert to a binstring
		var binstring	= crypto_math.bigint_to_binstring(big);

		self.postMessage({
			cmd: 'put_rsa_encrypt',
			response: {
				ciphertext: binstring
			}
		});	
	},

	/**
	 *	Decrypts an RSA ciphertext. You are responsible for doing any decoding (ie. PKCS1 v1.5) afterwards
	 *	
	 *	@param {string} ciphetext	ASCII-encoded binary string data to decrypt. Any non-ASCII characters
	 *								should be first encoded out using {@link convert.utf8.encode}
	 *	@param {BigInt} n			Modulus n
	 *	@param {BigInt} d			Private Exponent d
	 */
	thread_rsa_decrypt: function(ciphertext, n, d)
	{
		var big			= crypto_math.binstring_to_bigint(ciphertext);
		big				= new BigInt().powMod(big, d, n);

		// convert to a binstring
		var binstring	= crypto_math.bigint_to_binstring(big);

		self.postMessage({
			cmd: 'put_rsa_decrypt',
			response: {
				plaintext: binstring
			}
		});	
	},

	/**
	 *	Sends a debug message to the main worker (for possible console.logging)
	 *
	 *	@param {String} msg		The message to send
	 */
	thread_log: function(msg)
	{
		self.postMessage({
			cmd: 'put_console_log',
			response: {
				msg: msg
			}
		});	
	},

	/**
	 *	Throws an error and terminates the thread
	 *
	 *	@param {String} msg		The error message
	 *	@param {Number} code	The error code
	 */
	thread_error: function(msg, code)
	{
		self.postMessage({
			cmd: 'put_error',
			error: {
				msg: msg,
				code: code
			}
		});
		self.close();
	},

	/**
	 *	Converts a BigInteger to an ASCII-encoded binary string
	 *	
	 *	@param {BigInt}	bigint		BigInt
	 *	@return {string}			ASCII-encoded binary string
	 */
	bigint_to_binstring: function(bigint)
	{
		var _bigint	= new BigInt();
		var hex 	= _bigint.bigInt2str(bigint, 16);

		if (hex.length % 2 == 1)
			hex = '0'+hex;

		var binary = '';

		for (var i = 0; i < hex.length; i += 2)
			binary += String.fromCharCode(parseInt(hex.substr(i, 2),16));
		
		return binary;
	},

	/**
	 *	Converts an array of 32-bit integer words to a BigInt value
	 *
	 *	@param {Array} words	Array of 32-bit integer words
	 *	@return {BigInt}		A BigInt object
	 */
	words_to_bigint: function(words)
	{
		var hex 				= '';	// '0x' not needed for Leemon BigInt
		var _bigint				= new BigInt();

		for (var i = 0; i < words.length; i++)
		{
			_tmp_hex = (words[i] >>> 0).toString(16);

			for (var j=0; _tmp_hex.length % 8 != 0; j++)
			{
				var _tmp_hex = '0' + _tmp_hex;
			}

			hex += _tmp_hex;
		}
		return _bigint.str2bigInt(hex, 16, 0);
	},

	/**
	 *	Converts an ASCII-encoded binary string to a BigInt value
	 *	(requires crypto_math.js to be included)
	 *	
	 *	@param {string} str		ASCII-encoded binary string
	 *	@return {BigInt}		Big Integer
	 */
	binstring_to_bigint: function(binstring)
	{
		var hex		= '';

		for (var i = 0; i < binstring.length; i++)
		{
			var octet = binstring.charCodeAt(i).toString(16);

			if (octet.length == 1)
				octet = '0'+octet;

			hex += octet;
		}
		var bigint	= new BigInt().str2bigInt(hex, 16);

		return bigint;		
	}
}

// -------------------------------------------------------------------------------------
// RA NOTE ~ Begin Third Party Code
// -------------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////////////
// Big Integer Library v. 5.5
// Created 2000, last modified 2013
// Leemon Baird
// www.leemon.com
//
// Version history:
// v 5.5  17 Mar 2013
//   - two lines of a form like "if (x<0) x+=n" had the "if" changed to "while" to 
//     handle the case when x<-n. (Thanks to James Ansell for finding that bug)
// v 5.4  3 Oct 2009
//   - added "var i" to greaterShift() so i is not global. (Thanks to PŽter Szab— for finding that bug)
//
// v 5.3  21 Sep 2009
//   - added randProbPrime(k) for probable primes
//   - unrolled loop in mont_ (slightly faster)
//   - millerRabin now takes a bigInt parameter rather than an int
//
// v 5.2  15 Sep 2009
//   - fixed capitalization in call to int2bigInt in randBigInt
//     (thanks to Emili Evripidou, Reinhold Behringer, and Samuel Macaleese for finding that bug)
//
// v 5.1  8 Oct 2007 
//   - renamed inverseModInt_ to inverseModInt since it doesn't change its parameters
//   - added functions GCD and randBigInt, which call GCD_ and randBigInt_
//   - fixed a bug found by Rob Visser (see comment with his name below)
//   - improved comments
//
// This file is public domain.   You can use it for any purpose without restriction.
// I do not guarantee that it is correct, so use it at your own risk.  If you use 
// it for something interesting, I'd appreciate hearing about it.  If you find 
// any bugs or make any improvements, I'd appreciate hearing about those too.
// It would also be nice if my name and URL were left in the comments.  But none 
// of that is required.
//
// This code defines a bigInt library for arbitrary-precision integers.
// A bigInt is an array of integers storing the value in chunks of bpe bits, 
// little endian (buff[0] is the least significant word).
// Negative bigInts are stored two's complement.  Almost all the functions treat
// bigInts as nonnegative.  The few that view them as two's complement say so
// in their comments.  Some functions assume their parameters have at least one 
// leading zero element. Functions with an underscore at the end of the name put
// their answer into one of the arrays passed in, and have unpredictable behavior 
// in case of overflow, so the caller must make sure the arrays are big enough to 
// hold the answer.  But the average user should never have to call any of the 
// underscored functions.  Each important underscored function has a wrapper function 
// of the same name without the underscore that takes care of the details for you.  
// For each underscored function where a parameter is modified, that same variable 
// must not be used as another argument too.  So, you cannot square x by doing 
// multMod_(x,x,n).  You must use squareMod_(x,n) instead, or do y=dup(x); multMod_(x,y,n).
// Or simply use the multMod(x,x,n) function without the underscore, where
// such issues never arise, because non-underscored functions never change
// their parameters; they always allocate new memory for the answer that is returned.
//
// These functions are designed to avoid frequent dynamic memory allocation in the inner loop.
// For most functions, if it needs a BigInt as a local variable it will actually use
// a global, and will only allocate to it only when it's not the right size.  This ensures
// that when a function is called repeatedly with same-sized parameters, it only allocates
// memory on the first call.
//
// Note that for cryptographic purposes, the calls to Math.random() must 
// be replaced with calls to a better pseudorandom number generator.
//
// In the following, "bigInt" means a bigInt with at least one leading zero element,
// and "integer" means a nonnegative integer less than radix.  In some cases, integer 
// can be negative.  Negative bigInts are 2s complement.
// 
// The following functions do not modify their inputs.
// Those returning a bigInt, string, or Array will dynamically allocate memory for that value.
// Those returning a boolean will return the integer 0 (false) or 1 (true).
// Those returning boolean or int will not allocate memory except possibly on the first 
// time they're called with a given parameter size.
// 
// bigInt  add(x,y)               //return (x+y) for bigInts x and y.  
// bigInt  addInt(x,n)            //return (x+n) where x is a bigInt and n is an integer.
// string  bigInt2str(x,base)     //return a string form of bigInt x in a given base, with 2 <= base <= 95
// int     bitSize(x)             //return how many bits long the bigInt x is, not counting leading zeros
// bigInt  dup(x)                 //return a copy of bigInt x
// boolean equals(x,y)            //is the bigInt x equal to the bigint y?
// boolean equalsInt(x,y)         //is bigint x equal to integer y?
// bigInt  expand(x,n)            //return a copy of x with at least n elements, adding leading zeros if needed
// Array   findPrimes(n)          //return array of all primes less than integer n
// bigInt  GCD(x,y)               //return greatest common divisor of bigInts x and y (each with same number of elements).
// boolean greater(x,y)           //is x>y?  (x and y are nonnegative bigInts)
// boolean greaterShift(x,y,shift)//is (x <<(shift*bpe)) > y?
// bigInt  int2bigInt(t,n,m)      //return a bigInt equal to integer t, with at least n bits and m array elements
// bigInt  inverseMod(x,n)        //return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
// int     inverseModInt(x,n)     //return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
// boolean isZero(x)              //is the bigInt x equal to zero?
// boolean millerRabin(x,b)       //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is bigInt, 1<b<x)
// boolean millerRabinInt(x,b)    //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is int,    1<b<x)
// bigInt  mod(x,n)               //return a new bigInt equal to (x mod n) for bigInts x and n.
// int     modInt(x,n)            //return x mod n for bigInt x and integer n.
// bigInt  mult(x,y)              //return x*y for bigInts x and y. This is faster when y<x.
// bigInt  multMod(x,y,n)         //return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
// boolean negative(x)            //is bigInt x negative?
// bigInt  powMod(x,y,n)          //return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
// bigInt  randBigInt(n,s)        //return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
// bigInt  randTruePrime(k)       //return a new, random, k-bit, true prime bigInt using Maurer's algorithm.
// bigInt  randProbPrime(k)       //return a new, random, k-bit, probable prime bigInt (probability it's composite less than 2^-80).
// bigInt  str2bigInt(s,b,n,m)    //return a bigInt for number represented in string s in base b with at least n bits and m array elements
// bigInt  sub(x,y)               //return (x-y) for bigInts x and y.  Negative answers will be 2s complement
// bigInt  trim(x,k)              //return a copy of x with exactly k leading zero elements
//
//
// The following functions each have a non-underscored version, which most users should call instead.
// These functions each write to a single parameter, and the caller is responsible for ensuring the array 
// passed in is large enough to hold the result. 
//
// void    addInt_(x,n)          //do x=x+n where x is a bigInt and n is an integer
// void    add_(x,y)             //do x=x+y for bigInts x and y
// void    copy_(x,y)            //do x=y on bigInts x and y
// void    copyInt_(x,n)         //do x=n on bigInt x and integer n
// void    GCD_(x,y)             //set x to the greatest common divisor of bigInts x and y, (y is destroyed).  (This never overflows its array).
// boolean inverseMod_(x,n)      //do x=x**(-1) mod n, for bigInts x and n. Returns 1 (0) if inverse does (doesn't) exist
// void    mod_(x,n)             //do x=x mod n for bigInts x and n. (This never overflows its array).
// void    mult_(x,y)            //do x=x*y for bigInts x and y.
// void    multMod_(x,y,n)       //do x=x*y  mod n for bigInts x,y,n.
// void    powMod_(x,y,n)        //do x=x**y mod n, where x,y,n are bigInts (n is odd) and ** is exponentiation.  0**0=1.
// void    randBigInt_(b,n,s)    //do b = an n-bit random BigInt. if s=1, then nth bit (most significant bit) is set to 1. n>=1.
// void    randTruePrime_(ans,k) //do ans = a random k-bit true random prime (not just probable prime) with 1 in the msb.
// void    sub_(x,y)             //do x=x-y for bigInts x and y. Negative answers will be 2s complement.
//
// The following functions do NOT have a non-underscored version. 
// They each write a bigInt result to one or more parameters.  The caller is responsible for
// ensuring the arrays passed in are large enough to hold the results. 
//
// void addShift_(x,y,ys)       //do x=x+(y<<(ys*bpe))
// void carry_(x)               //do carries and borrows so each element of the bigInt x fits in bpe bits.
// void divide_(x,y,q,r)        //divide x by y giving quotient q and remainder r
// int  divInt_(x,n)            //do x=floor(x/n) for bigInt x and integer n, and return the remainder. (This never overflows its array).
// int  eGCD_(x,y,d,a,b)        //sets a,b,d to positive bigInts such that d = GCD_(x,y) = a*x-b*y
// void halve_(x)               //do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement.  (This never overflows its array).
// void leftShift_(x,n)         //left shift bigInt x by n bits.  n<bpe.
// void linComb_(x,y,a,b)       //do x=a*x+b*y for bigInts x and y and integers a and b
// void linCombShift_(x,y,b,ys) //do x=x+b*(y<<(ys*bpe)) for bigInts x and y, and integers b and ys
// void mont_(x,y,n,np)         //Montgomery multiplication (see comments where the function is defined)
// void multInt_(x,n)           //do x=x*n where x is a bigInt and n is an integer.
// void rightShift_(x,n)        //right shift bigInt x by n bits.  0 <= n < bpe. (This never overflows its array).
// void squareMod_(x,n)         //do x=x*x  mod n for bigInts x,n
// void subShift_(x,y,ys)       //do x=x-(y<<(ys*bpe)). Negative answers will be 2s complement.
//
// The following functions are based on algorithms from the _Handbook of Applied Cryptography_
//    powMod_()           = algorithm 14.94, Montgomery exponentiation
//    eGCD_,inverseMod_() = algorithm 14.61, Binary extended GCD_
//    GCD_()              = algorothm 14.57, Lehmer's algorithm
//    mont_()             = algorithm 14.36, Montgomery multiplication
//    divide_()           = algorithm 14.20  Multiple-precision division
//    squareMod_()        = algorithm 14.16  Multiple-precision squaring
//    randTruePrime_()    = algorithm  4.62, Maurer's algorithm
//    millerRabin()       = algorithm  4.24, Miller-Rabin algorithm
//
// Profiling shows:
//     randTruePrime_() spends:
//         10% of its time in calls to powMod_()
//         85% of its time in calls to millerRabin()
//     millerRabin() spends:
//         99% of its time in calls to powMod_()   (always with a base of 2)
//     powMod_() spends:
//         94% of its time in calls to mont_()  (almost always with x==y)
//
// This suggests there are several ways to speed up this library slightly:
//     - convert powMod_ to use a Montgomery form of k-ary window (or maybe a Montgomery form of sliding window)
//         -- this should especially focus on being fast when raising 2 to a power mod n
//     - convert randTruePrime_() to use a minimum r of 1/3 instead of 1/2 with the appropriate change to the test
//     - tune the parameters in randTruePrime_(), including c, m, and recLimit
//     - speed up the single loop in mont_() that takes 95% of the runtime, perhaps by reducing checking
//       within the loop when all the parameters are the same length.
//
// There are several ideas that look like they wouldn't help much at all:
//     - replacing trial division in randTruePrime_() with a sieve (that speeds up something taking almost no time anyway)
//     - increase bpe from 15 to 30 (that would help if we had a 32*32->64 multiplier, but not with JavaScript's 32*32->32)
//     - speeding up mont_(x,y,n,np) when x==y by doing a non-modular, non-Montgomery square
//       followed by a Montgomery reduction.  The intermediate answer will be twice as long as x, so that
//       method would be slower.  This is unfortunate because the code currently spends almost all of its time
//       doing mont_(x,x,...), both for randTruePrime_() and powMod_().  A faster method for Montgomery squaring
//       would have a large impact on the speed of randTruePrime_() and powMod_().  HAC has a couple of poorly-worded
//       sentences that seem to imply it's faster to do a non-modular square followed by a single
//       Montgomery reduction, but that's obviously wrong.
////////////////////////////////////////////////////////////////////////////////////////

var BigInt = (function() {
	//globals
	var bpe=0;         //bits stored per array element
	var mask=0;        //AND this with an array element to chop it down to bpe bits
	var radix=mask+1;  //equals 2^bpe.  A single 1 bit to the left of the last bit of mask.

	//the digits for converting to different bases
	var digitsStr='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_=!@#$%^&*()[]{}|;:,.<>/?`~ \\\'\"+-';

	//initialize the global variables
	for (bpe=0; (1<<(bpe+1)) > (1<<bpe); bpe++);  //bpe=number of bits in the mantissa on this platform
	bpe>>=1;                   //bpe=number of bits in one element of the array representing the bigInt
	mask=(1<<bpe)-1;           //AND the mask with an integer to get its bpe least significant bits
	radix=mask+1;              //2^bpe.  a single 1 bit to the left of the first bit of mask
	var one=null;              //constant used in powMod_(). redefined after int2bigint is defined below

	//the following global variables are scratchpad memory to 
	//reduce dynamic memory allocation in the inner loop
	var t=new Array(0);
	var ss=t;       //used in mult_()
	var s0=t;       //used in multMod_(), squareMod_() 
	var s1=t;       //used in powMod_(), multMod_(), squareMod_() 
	var s2=t;       //used in powMod_(), multMod_()
	var s3=t;       //used in powMod_()
	var s4=t, s5=t; //used in mod_()
	var s6=t;       //used in bigInt2str()
	var s7=t;       //used in powMod_()
	var T=t;        //used in GCD_()
	var sa=t;       //used in mont_()
	var mr_x1=t, mr_r=t, mr_a=t;                                      //used in millerRabin()
	var eg_v=t, eg_u=t, eg_A=t, eg_B=t, eg_C=t, eg_D=t;               //used in eGCD_(), inverseMod_()
	var md_q1=t, md_q2=t, md_q3=t, md_r=t, md_r1=t, md_r2=t, md_tt=t; //used in mod_()

	var primes=t, pows=t, s_i=t, s_i2=t, s_R=t, s_rm=t, s_q=t, s_n1=t, 
		s_a=t, s_r2=t, s_n=t, s_b=t, s_d=t, s_x1=t, s_x2=t, s_aa=t; //used in randTruePrime_()
	  
	var rpprb=t; //used in randProbPrimeRounds() (which also uses "primes")

	////////////////////////////////////////////////////////////////////////////////////////



	//return array of all primes less than integer n
	var findPrimes = function(n) {
	  var i,s,p,ans;
	  s=new Array(n);
	  for (i=0;i<n;i++)
		s[i]=0;
	  s[0]=2;
	  p=0;    //first p elements of s are primes, the rest are a sieve
	  for(;s[p]<n;) {                  //s[p] is the pth prime
		for(i=s[p]*s[p]; i<n; i+=s[p]) //mark multiples of s[p]
		  s[i]=1;
		p++;
		s[p]=s[p-1]+1;
		for(; s[p]<n && s[s[p]]; s[p]++); //find next prime (where s[p]==0)
	  }
	  ans=new Array(p);
	  for(i=0;i<p;i++)
		ans[i]=s[i];
	  return ans;
	}


	//does a single round of Miller-Rabin base b consider x to be a possible prime?
	//x is a bigInt, and b is an integer, with b<x
	var millerRabinInt = function(x,b) {
	  if (mr_x1.length!=x.length) {
		mr_x1=dup(x);
		mr_r=dup(x);
		mr_a=dup(x);
	  }

	  copyInt_(mr_a,b);
	  return millerRabin(x,mr_a);
	}

	//does a single round of Miller-Rabin base b consider x to be a possible prime?
	//x and b are bigInts with b<x
	var millerRabin = function(x,b) {
	  var i,j,k,s;

	  if (mr_x1.length!=x.length) {
		mr_x1=dup(x);
		mr_r=dup(x);
		mr_a=dup(x);
	  }

	  copy_(mr_a,b);
	  copy_(mr_r,x);
	  copy_(mr_x1,x);

	  addInt_(mr_r,-1);
	  addInt_(mr_x1,-1);

	  //s=the highest power of two that divides mr_r
	  k=0;
	  for (i=0;i<mr_r.length;i++)
		for (j=1;j<mask;j<<=1)
		  if (x[i] & j) {
			s=(k<mr_r.length+bpe ? k : 0); 
			 i=mr_r.length;
			 j=mask;
		  } else
			k++;

	  if (s)                
		rightShift_(mr_r,s);

	  powMod_(mr_a,mr_r,x);

	  if (!equalsInt(mr_a,1) && !equals(mr_a,mr_x1)) {
		j=1;
		while (j<=s-1 && !equals(mr_a,mr_x1)) {
		  squareMod_(mr_a,x);
		  if (equalsInt(mr_a,1)) {
			return 0;
		  }
		  j++;
		}
		if (!equals(mr_a,mr_x1)) {
		  return 0;
		}
	  }
	  return 1;  
	}

	//returns how many bits long the bigInt is, not counting leading zeros.
	var bitSize = function(x) {
	  var j,z,w;
	  for (j=x.length-1; (x[j]==0) && (j>0); j--);
	  for (z=0,w=x[j]; w; (w>>=1),z++);
	  z+=bpe*j;
	  return z;
	}

	//return a copy of x with at least n elements, adding leading zeros if needed
	var expand = function(x,n) {
	  var ans=int2bigInt(0,(x.length>n ? x.length : n)*bpe,0);
	  copy_(ans,x);
	  return ans;
	}

	//return a k-bit true random prime using Maurer's algorithm.
	var randTruePrime = function(k) {
	  var ans=int2bigInt(0,k,0);
	  randTruePrime_(ans,k);
	  return trim(ans,1);
	}

	//return a k-bit random probable prime with probability of error < 2^-80
	var randProbPrime = function(k) {
	  if (k>=600) return randProbPrimeRounds(k,2); //numbers from HAC table 4.3
	  if (k>=550) return randProbPrimeRounds(k,4);
	  if (k>=500) return randProbPrimeRounds(k,5);
	  if (k>=400) return randProbPrimeRounds(k,6);
	  if (k>=350) return randProbPrimeRounds(k,7);
	  if (k>=300) return randProbPrimeRounds(k,9);
	  if (k>=250) return randProbPrimeRounds(k,12); //numbers from HAC table 4.4
	  if (k>=200) return randProbPrimeRounds(k,15);
	  if (k>=150) return randProbPrimeRounds(k,18);
	  if (k>=100) return randProbPrimeRounds(k,27);
				  return randProbPrimeRounds(k,40); //number from HAC remark 4.26 (only an estimate)
	}

	//return a k-bit probable random prime using n rounds of Miller Rabin (after trial division with small primes)	
	var randProbPrimeRounds = function(k,n) {
	  var ans, i, divisible, B; 
	  B=30000;  //B is largest prime to use in trial division
	  ans=int2bigInt(0,k,0);
	  
	  //optimization: try larger and smaller B to find the best limit.
	  
	  if (primes.length==0)
		primes=findPrimes(30000);  //check for divisibility by primes <=30000

	  if (rpprb.length!=ans.length)
		rpprb=dup(ans);

	  for (;;) { //keep trying random values for ans until one appears to be prime
		//optimization: pick a random number times L=2*3*5*...*p, plus a 
		//   random element of the list of all numbers in [0,L) not divisible by any prime up to p.
		//   This can reduce the amount of random number generation.
		
		randBigInt_(ans,k,0); //ans = a random odd number to check
		ans[0] |= 1; 
		divisible=0;
	  
		//check ans for divisibility by small primes up to B
		for (i=0; (i<primes.length) && (primes[i]<=B); i++)
		  if (modInt(ans,primes[i])==0 && !equalsInt(ans,primes[i])) {
			divisible=1;
			break;
		  }      
		
		//optimization: change millerRabin so the base can be bigger than the number being checked, then eliminate the while here.
		
		//do n rounds of Miller Rabin, with random bases less than ans
		for (i=0; i<n && !divisible; i++) {
		  randBigInt_(rpprb,k,0);
		  while(!greater(ans,rpprb)) //pick a random rpprb that's < ans
			randBigInt_(rpprb,k,0);
		  if (!millerRabin(ans,rpprb))
			divisible=1;
		}
		
		if(!divisible)
		  return ans;
	  }  
	}

	//return a new bigInt equal to (x mod n) for bigInts x and n.
	var mod = function(x,n) {
	  var ans=dup(x);
	  mod_(ans,n);
	  return trim(ans,1);
	}

	// divide(x,y) returns an array [quotient, remainder]
	var divide = function(x,y)
	{
		var x0 = dup(x);
		var y0 = dup(y);
		var q = new Array(x.length);
		var r = new Array(x.length);
		divide_(x0,y0,q,r);
		return [q, r];
	}

	//return (x+n) where x is a bigInt and n is an integer.
	var addInt = function(x,n) {
	  var ans=expand(x,x.length+1);
	  addInt_(ans,n);
	  return trim(ans,1);
	}

	//return x*y for bigInts x and y. This is faster when y<x.
	var mult = function(x,y) {
	  var ans=expand(x,x.length+y.length);
	  mult_(ans,y);
	  return trim(ans,1);
	}

	//return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
	var powMod = function(x,y,n) {
	  var ans=expand(x,n.length);  
	  powMod_(ans,trim(y,2),trim(n,2),0);  //this should work without the trim, but doesn't
	  return trim(ans,1);
	}

	//return (x-y) for bigInts x and y.  Negative answers will be 2s complement
	var sub = function(x,y) {
	  var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1)); 
	  sub_(ans,y);
	  return trim(ans,1);
	}

	//return (x+y) for bigInts x and y.  
	var add = function(x,y) {
	  var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1)); 
	  add_(ans,y);
	  return trim(ans,1);
	}

	//return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
	var inverseMod = function(x,n) {
	  var ans=expand(x,n.length); 
	  var s;
	  s=inverseMod_(ans,n);
	  return s ? trim(ans,1) : null;
	}

	//return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
	var multMod = function(x,y,n) {
	  var ans=expand(x,n.length);
	  multMod_(ans,y,n);
	  return trim(ans,1);
	}

	//generate a k-bit true random prime using Maurer's algorithm,
	//and put it into ans.  The bigInt ans must be large enough to hold it.
	var randTruePrime_ = function(ans,k) {
	  var c,m,pm,dd,j,r,B,divisible,z,zz,recSize;

	  if (primes.length==0)
		primes=findPrimes(30000);  //check for divisibility by primes <=30000

	  if (pows.length==0) {
		pows=new Array(512);
		for (j=0;j<512;j++) {
		  pows[j]=Math.pow(2,j/511.-1.);
		}
	  }

	  //c and m should be tuned for a particular machine and value of k, to maximize speed
	  c=0.1;  //c=0.1 in HAC
	  m=20;   //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
	  recLimit=20; //stop recursion when k <=recLimit.  Must have recLimit >= 2

	  if (s_i2.length!=ans.length) {
		s_i2=dup(ans);
		s_R =dup(ans);
		s_n1=dup(ans);
		s_r2=dup(ans);
		s_d =dup(ans);
		s_x1=dup(ans);
		s_x2=dup(ans);
		s_b =dup(ans);
		s_n =dup(ans);
		s_i =dup(ans);
		s_rm=dup(ans);
		s_q =dup(ans);
		s_a =dup(ans);
		s_aa=dup(ans);
	  }

	  if (k <= recLimit) {  //generate small random primes by trial division up to its square root
		pm=(1<<((k+2)>>1))-1; //pm is binary number with all ones, just over sqrt(2^k)
		copyInt_(ans,0);
		for (dd=1;dd;) {
		  dd=0;
		  ans[0]= 1 | (1<<(k-1)) | Math.floor(Math.random()*(1<<k));  //random, k-bit, odd integer, with msb 1
		  for (j=1;(j<primes.length) && ((primes[j]&pm)==primes[j]);j++) { //trial division by all primes 3...sqrt(2^k)
			if (0==(ans[0]%primes[j])) {
			  dd=1;
			  break;
			}
		  }
		}
		carry_(ans);
		return;
	  }

	  B=c*k*k;    //try small primes up to B (or all the primes[] array if the largest is less than B).
	  if (k>2*m)  //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
		for (r=1; k-k*r<=m; )
		  r=pows[Math.floor(Math.random()*512)];   //r=Math.pow(2,Math.random()-1);
	  else
		r=.5;

	  //simulation suggests the more complex algorithm using r=.333 is only slightly faster.

	  recSize=Math.floor(r*k)+1;

	  randTruePrime_(s_q,recSize);
	  copyInt_(s_i2,0);
	  s_i2[Math.floor((k-2)/bpe)] |= (1<<((k-2)%bpe));   //s_i2=2^(k-2)
	  divide_(s_i2,s_q,s_i,s_rm);                        //s_i=floor((2^(k-1))/(2q))

	  z=bitSize(s_i);

	  for (;;) {
		for (;;) {  //generate z-bit numbers until one falls in the range [0,s_i-1]
		  randBigInt_(s_R,z,0);
		  if (greater(s_i,s_R))
			break;
		}                //now s_R is in the range [0,s_i-1]
		addInt_(s_R,1);  //now s_R is in the range [1,s_i]
		add_(s_R,s_i);   //now s_R is in the range [s_i+1,2*s_i]

		copy_(s_n,s_q);
		mult_(s_n,s_R); 
		multInt_(s_n,2);
		addInt_(s_n,1);    //s_n=2*s_R*s_q+1
		
		copy_(s_r2,s_R);
		multInt_(s_r2,2);  //s_r2=2*s_R

		//check s_n for divisibility by small primes up to B
		for (divisible=0,j=0; (j<primes.length) && (primes[j]<B); j++)
		  if (modInt(s_n,primes[j])==0 && !equalsInt(s_n,primes[j])) {
			divisible=1;
			break;
		  }      

		if (!divisible)    //if it passes small primes check, then try a single Miller-Rabin base 2
		  if (!millerRabinInt(s_n,2)) //this line represents 75% of the total runtime for randTruePrime_ 
			divisible=1;

		if (!divisible) {  //if it passes that test, continue checking s_n
		  addInt_(s_n,-3);
		  for (j=s_n.length-1;(s_n[j]==0) && (j>0); j--);  //strip leading zeros
		  for (zz=0,w=s_n[j]; w; (w>>=1),zz++);
		  zz+=bpe*j;                             //zz=number of bits in s_n, ignoring leading zeros
		  for (;;) {  //generate z-bit numbers until one falls in the range [0,s_n-1]
			randBigInt_(s_a,zz,0);
			if (greater(s_n,s_a))
			  break;
		  }                //now s_a is in the range [0,s_n-1]
		  addInt_(s_n,3);  //now s_a is in the range [0,s_n-4]
		  addInt_(s_a,2);  //now s_a is in the range [2,s_n-2]
		  copy_(s_b,s_a);
		  copy_(s_n1,s_n);
		  addInt_(s_n1,-1);
		  powMod_(s_b,s_n1,s_n);   //s_b=s_a^(s_n-1) modulo s_n
		  addInt_(s_b,-1);
		  if (isZero(s_b)) {
			copy_(s_b,s_a);
			powMod_(s_b,s_r2,s_n);
			addInt_(s_b,-1);
			copy_(s_aa,s_n);
			copy_(s_d,s_b);
			GCD_(s_d,s_n);  //if s_b and s_n are relatively prime, then s_n is a prime
			if (equalsInt(s_d,1)) {
			  copy_(ans,s_aa);
			  return;     //if we've made it this far, then s_n is absolutely guaranteed to be prime
			}
		  }
		}
	  }
	}

	//Return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
	var randBigInt = function(n,s) {
	  var a,b;
	  a=Math.floor((n-1)/bpe)+2; //# array elements to hold the BigInt with a leading 0 element
	  b=int2bigInt(0,0,a);
	  randBigInt_(b,n,s);
	  return b;
	}

	//Set b to an n-bit random BigInt.  If s=1, then the most significant of those n bits is set to 1.
	//Array b must be big enough to hold the result. Must have n>=1
	var randBigInt_ = function(b,n,s) {
	  var i,a;
	  for (i=0;i<b.length;i++)
		b[i]=0;
	  a=Math.floor((n-1)/bpe)+1; //# array elements to hold the BigInt
	  for (i=0;i<a;i++) {
		b[i]=Math.floor(Math.random()*(1<<(bpe-1)));
	  }
	  b[a-1] &= (2<<((n-1)%bpe))-1;
	  if (s==1)
		b[a-1] |= (1<<((n-1)%bpe));
	}

	//Return the greatest common divisor of bigInts x and y (each with same number of elements).
	var GCD = function(x,y) {
	  var xc,yc;
	  xc=dup(x);
	  yc=dup(y);
	  GCD_(xc,yc);
	  return xc;
	}

	//set x to the greatest common divisor of bigInts x and y (each with same number of elements).
	//y is destroyed.
	var GCD_ = function(x,y) {
	  var i,xp,yp,A,B,C,D,q,sing;
	  if (T.length!=x.length)
		T=dup(x);

	  sing=1;
	  while (sing) { //while y has nonzero elements other than y[0]
		sing=0;
		for (i=1;i<y.length;i++) //check if y has nonzero elements other than 0
		  if (y[i]) {
			sing=1;
			break;
		  }
		if (!sing) break; //quit when y all zero elements except possibly y[0]

		for (i=x.length;!x[i] && i>=0;i--);  //find most significant element of x
		xp=x[i];
		yp=y[i];
		A=1; B=0; C=0; D=1;
		while ((yp+C) && (yp+D)) {
		  q =Math.floor((xp+A)/(yp+C));
		  qp=Math.floor((xp+B)/(yp+D));
		  if (q!=qp)
			break;
		  t= A-q*C;   A=C;   C=t;    //  do (A,B,xp, C,D,yp) = (C,D,yp, A,B,xp) - q*(0,0,0, C,D,yp)      
		  t= B-q*D;   B=D;   D=t;
		  t=xp-q*yp; xp=yp; yp=t;
		}
		if (B) {
		  copy_(T,x);
		  linComb_(x,y,A,B); //x=A*x+B*y
		  linComb_(y,T,D,C); //y=D*y+C*T
		} else {
		  mod_(x,y);
		  copy_(T,x);
		  copy_(x,y);
		  copy_(y,T);
		} 
	  }
	  if (y[0]==0)
		return;
	  t=modInt(x,y[0]);
	  copyInt_(x,y[0]);
	  y[0]=t;
	  while (y[0]) {
		x[0]%=y[0];
		t=x[0]; x[0]=y[0]; y[0]=t;
	  }
	}

	//do x=x**(-1) mod n, for bigInts x and n.
	//If no inverse exists, it sets x to zero and returns 0, else it returns 1.
	//The x array must be at least as large as the n array.
	var inverseMod_ = function(x,n) {
	  var k=1+2*Math.max(x.length,n.length);

	  if(!(x[0]&1)  && !(n[0]&1)) {  //if both inputs are even, then inverse doesn't exist
		copyInt_(x,0);
		return 0;
	  }

	  if (eg_u.length!=k) {
		eg_u=new Array(k);
		eg_v=new Array(k);
		eg_A=new Array(k);
		eg_B=new Array(k);
		eg_C=new Array(k);
		eg_D=new Array(k);
	  }

	  copy_(eg_u,x);
	  copy_(eg_v,n);
	  copyInt_(eg_A,1);
	  copyInt_(eg_B,0);
	  copyInt_(eg_C,0);
	  copyInt_(eg_D,1);
	  for (;;) {
		while(!(eg_u[0]&1)) {  //while eg_u is even
		  halve_(eg_u);
		  if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if eg_A==eg_B==0 mod 2
			halve_(eg_A);
			halve_(eg_B);      
		  } else {
			add_(eg_A,n);  halve_(eg_A);
			sub_(eg_B,x);  halve_(eg_B);
		  }
		}

		while (!(eg_v[0]&1)) {  //while eg_v is even
		  halve_(eg_v);
		  if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if eg_C==eg_D==0 mod 2
			halve_(eg_C);
			halve_(eg_D);      
		  } else {
			add_(eg_C,n);  halve_(eg_C);
			sub_(eg_D,x);  halve_(eg_D);
		  }
		}

		if (!greater(eg_v,eg_u)) { //eg_v <= eg_u
		  sub_(eg_u,eg_v);
		  sub_(eg_A,eg_C);
		  sub_(eg_B,eg_D);
		} else {                   //eg_v > eg_u
		  sub_(eg_v,eg_u);
		  sub_(eg_C,eg_A);
		  sub_(eg_D,eg_B);
		}
	  
		if (equalsInt(eg_u,0)) {
		  while (negative(eg_C)) //make sure answer is nonnegative
			add_(eg_C,n);
		  copy_(x,eg_C);

		  if (!equalsInt(eg_v,1)) { //if GCD_(x,n)!=1, then there is no inverse
			copyInt_(x,0);
			return 0;
		  }
		  return 1;
		}
	  }
	}

	//return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
	var inverseModInt = function(x,n) {
	  var a=1,b=0,t;
	  for (;;) {
		if (x==1) return a;
		if (x==0) return 0;
		b-=a*Math.floor(n/x);
		n%=x;

		if (n==1) return b; //to avoid negatives, change this b to n-b, and each -= to +=
		if (n==0) return 0;
		a-=b*Math.floor(x/n);
		x%=n;
	  }
	}

	//this deprecated function is for backward compatibility only. 
	var inverseModInt_ = function(x,n) {
	   return inverseModInt(x,n);
	}


	//Given positive bigInts x and y, change the bigints v, a, and b to positive bigInts such that:
	//     v = GCD_(x,y) = a*x-b*y
	//The bigInts v, a, b, must have exactly as many elements as the larger of x and y.
	var eGCD_ = function(x,y,v,a,b) {
	  var g=0;
	  var k=Math.max(x.length,y.length);
	  if (eg_u.length!=k) {
		eg_u=new Array(k);
		eg_A=new Array(k);
		eg_B=new Array(k);
		eg_C=new Array(k);
		eg_D=new Array(k);
	  }
	  while(!(x[0]&1)  && !(y[0]&1)) {  //while x and y both even
		halve_(x);
		halve_(y);
		g++;
	  }
	  copy_(eg_u,x);
	  copy_(v,y);
	  copyInt_(eg_A,1);
	  copyInt_(eg_B,0);
	  copyInt_(eg_C,0);
	  copyInt_(eg_D,1);
	  for (;;) {
		while(!(eg_u[0]&1)) {  //while u is even
		  halve_(eg_u);
		  if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if A==B==0 mod 2
			halve_(eg_A);
			halve_(eg_B);      
		  } else {
			add_(eg_A,y);  halve_(eg_A);
			sub_(eg_B,x);  halve_(eg_B);
		  }
		}

		while (!(v[0]&1)) {  //while v is even
		  halve_(v);
		  if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if C==D==0 mod 2
			halve_(eg_C);
			halve_(eg_D);      
		  } else {
			add_(eg_C,y);  halve_(eg_C);
			sub_(eg_D,x);  halve_(eg_D);
		  }
		}

		if (!greater(v,eg_u)) { //v<=u
		  sub_(eg_u,v);
		  sub_(eg_A,eg_C);
		  sub_(eg_B,eg_D);
		} else {                //v>u
		  sub_(v,eg_u);
		  sub_(eg_C,eg_A);
		  sub_(eg_D,eg_B);
		}
		if (equalsInt(eg_u,0)) {
		  while (negative(eg_C)) {   //make sure a (C) is nonnegative
			add_(eg_C,y);
			sub_(eg_D,x);
		  }
		  multInt_(eg_D,-1);  ///make sure b (D) is nonnegative
		  copy_(a,eg_C);
		  copy_(b,eg_D);
		  leftShift_(v,g);
		  return;
		}
	  }
	}


	//is bigInt x negative?
	var negative = function(x) {
	  return ((x[x.length-1]>>(bpe-1))&1);
	}


	//is (x << (shift*bpe)) > y?
	//x and y are nonnegative bigInts
	//shift is a nonnegative integer
	var greaterShift = function(x,y,shift) {
	  var i, k, kx=x.length, ky=y.length;
	  k=((kx+shift)<ky) ? (kx+shift) : ky;
	  for (i=ky-1-shift; i<kx && i>=0; i++) 
		if (x[i]>0)
		  return 1; //if there are nonzeros in x to the left of the first column of y, then x is bigger
	  for (i=kx-1+shift; i<ky; i++)
		if (y[i]>0)
		  return 0; //if there are nonzeros in y to the left of the first column of x, then x is not bigger
	  for (i=k-1; i>=shift; i--)
		if      (x[i-shift]>y[i]) return 1;
		else if (x[i-shift]<y[i]) return 0;
	  return 0;
	}

	//is x > y? (x and y both nonnegative)
	var greater = function(x,y) {
	  var i;
	  var k=(x.length<y.length) ? x.length : y.length;

	  for (i=x.length;i<y.length;i++)
		if (y[i])
		  return 0;  //y has more digits

	  for (i=y.length;i<x.length;i++)
		if (x[i])
		  return 1;  //x has more digits

	  for (i=k-1;i>=0;i--)
		if (x[i]>y[i])
		  return 1;
		else if (x[i]<y[i])
		  return 0;
	  return 0;
	}

	//divide x by y giving quotient q and remainder r.  (q=floor(x/y),  r=x mod y).  All 4 are bigints.
	//x must have at least one leading zero element.
	//y must be nonzero.
	//q and r must be arrays that are exactly the same length as x. (Or q can have more).
	//Must have x.length >= y.length >= 2.
	var divide_ = function(x,y,q,r) {
	  var kx, ky;
	  var i,j,y1,y2,c,a,b;
	  copy_(r,x);
	  for (ky=y.length;y[ky-1]==0;ky--); //ky is number of elements in y, not including leading zeros

	  //normalize: ensure the most significant element of y has its highest bit set  
	  b=y[ky-1];
	  for (a=0; b; a++)
		b>>=1;  
	  a=bpe-a;  //a is how many bits to shift so that the high order bit of y is leftmost in its array element
	  leftShift_(y,a);  //multiply both by 1<<a now, then divide both by that at the end
	  leftShift_(r,a);

	  //Rob Visser discovered a bug: the following line was originally just before the normalization.
	  for (kx=r.length;r[kx-1]==0 && kx>ky;kx--); //kx is number of elements in normalized x, not including leading zeros

	  copyInt_(q,0);                      // q=0
	  while (!greaterShift(y,r,kx-ky)) {  // while (leftShift_(y,kx-ky) <= r) {
		subShift_(r,y,kx-ky);             //   r=r-leftShift_(y,kx-ky)
		q[kx-ky]++;                       //   q[kx-ky]++;
	  }                                   // }

	  for (i=kx-1; i>=ky; i--) {
		if (r[i]==y[ky-1])
		  q[i-ky]=mask;
		else
		  q[i-ky]=Math.floor((r[i]*radix+r[i-1])/y[ky-1]);	

		//The following for(;;) loop is equivalent to the commented while loop, 
		//except that the uncommented version avoids overflow.
		//The commented loop comes from HAC, which assumes r[-1]==y[-1]==0
		//  while (q[i-ky]*(y[ky-1]*radix+y[ky-2]) > r[i]*radix*radix+r[i-1]*radix+r[i-2])
		//    q[i-ky]--;    
		for (;;) {
		  y2=(ky>1 ? y[ky-2] : 0)*q[i-ky];
		  c=y2>>bpe;
		  y2=y2 & mask;
		  y1=c+q[i-ky]*y[ky-1];
		  c=y1>>bpe;
		  y1=y1 & mask;

		  if (c==r[i] ? y1==r[i-1] ? y2>(i>1 ? r[i-2] : 0) : y1>r[i-1] : c>r[i]) 
			q[i-ky]--;
		  else
			break;
		}

		linCombShift_(r,y,-q[i-ky],i-ky);    //r=r-q[i-ky]*leftShift_(y,i-ky)
		if (negative(r)) {
		  addShift_(r,y,i-ky);         //r=r+leftShift_(y,i-ky)
		  q[i-ky]--;
		}
	  }

	  rightShift_(y,a);  //undo the normalization step
	  rightShift_(r,a);  //undo the normalization step
	}

	//do carries and borrows so each element of the bigInt x fits in bpe bits.
	var carry_ = function(x) {
	  var i,k,c,b;
	  k=x.length;
	  c=0;
	  for (i=0;i<k;i++) {
		c+=x[i];
		b=0;
		if (c<0) {
		  b=-(c>>bpe);
		  c+=b*radix;
		}
		x[i]=c & mask;
		c=(c>>bpe)-b;
	  }
	}

	//return x mod n for bigInt x and integer n.
	var modInt = function(x,n) {
	  var i,c=0;
	  for (i=x.length-1; i>=0; i--)
		c=(c*radix+x[i])%n;
	  return c;
	}

	//convert the integer t into a bigInt with at least the given number of bits.
	//the returned array stores the bigInt in bpe-bit chunks, little endian (buff[0] is least significant word)
	//Pad the array with leading zeros so that it has at least minSize elements.
	//There will always be at least one leading 0 element.
	var int2bigInt = function(t,bits,minSize) {   
	  var i,k;
	  k=Math.ceil(bits/bpe)+1;
	  k=minSize>k ? minSize : k;
	  var buff=new Array(k);
	  copyInt_(buff,t);
	  return buff;
	}

	//return the bigInt given a string representation in a given base.  
	//Pad the array with leading zeros so that it has at least minSize elements.
	//If base=-1, then it reads in a space-separated list of array elements in decimal.
	//The array will always have at least one leading zero, unless base=-1.
	var str2bigInt = function(s,base,minSize) {
	  base || (base = 10);
	  var d, i, j, x, y, kk;
	  var k=s.length;
	  if (base==-1) { //comma-separated list of array elements in decimal
		x=new Array(0);
		for (;;) {
		  y=new Array(x.length+1);
		  for (i=0;i<x.length;i++)
			y[i+1]=x[i];
		  y[0]=parseInt(s,10);
		  x=y;
		  d=s.indexOf(',',0);
		  if (d<1) 
			break;
		  s=s.substring(d+1);
		  if (s.length==0)
			break;
		}
		if (x.length<minSize) {
		  y=new Array(minSize);
		  copy_(y,x);
		  return y;
		}
		return x;
	  }

	  x=int2bigInt(0,base*k,0);
	  for (i=0;i<k;i++) {
		d=digitsStr.indexOf(s.substring(i,i+1),0);
		if (base<=36 && d>=36)  //convert lowercase to uppercase if base<=36
		  d-=26;
		if (d>=base || d<0) {   //stop at first illegal character
		  break;
		}
		multInt_(x,base);
		addInt_(x,d);
	  }

	  for (k=x.length;k>0 && !x[k-1];k--); //strip off leading zeros
	  k=minSize>k+1 ? minSize : k+1;
	  y=new Array(k);
	  kk=k<x.length ? k : x.length;
	  for (i=0;i<kk;i++)
		y[i]=x[i];
	  for (;i<k;i++)
		y[i]=0;
	  return y;
	}

	//is bigint x equal to integer y?
	//y must have less than bpe bits
	var equalsInt = function(x,y) {
	  var i;
	  if (x[0]!=y)
		return 0;
	  for (i=1;i<x.length;i++)
		if (x[i])
		  return 0;
	  return 1;
	}

	//are bigints x and y equal?
	//this works even if x and y are different lengths and have arbitrarily many leading zeros
	var equals = function(x,y) {
	  var i;
	  var k=x.length<y.length ? x.length : y.length;
	  for (i=0;i<k;i++)
		if (x[i]!=y[i])
		  return 0;
	  if (x.length>y.length) {
		for (;i<x.length;i++)
		  if (x[i])
			return 0;
	  } else {
		for (;i<y.length;i++)
		  if (y[i])
			return 0;
	  }
	  return 1;
	}

	//is the bigInt x equal to zero?
	var isZero = function(x) {
	  var i;
	  for (i=0;i<x.length;i++)
		if (x[i])
		  return 0;
	  return 1;
	}

	//convert a bigInt into a string in a given base, from base 2 up to base 95.
	//Base -1 prints the contents of the array representing the number.
	var bigInt2str = function(x,base) {
	  var i,t,s="";

	  if (s6.length!=x.length) 
		s6=dup(x);
	  else
		copy_(s6,x);

	  if (base==-1) { //return the list of array contents
		for (i=x.length-1;i>0;i--)
		  s+=x[i]+',';
		s+=x[0];
	  }
	  else { //return it in the given base
		while (!isZero(s6)) {
		  t=divInt_(s6,base);  //t=s6 % base; s6=floor(s6/base);
		  s=digitsStr.substring(t,t+1)+s;
		}
	  }
	  if (s.length==0)
		s="0";
	  return s;
	}

	//returns a duplicate of bigInt x
	var dup = function(x) {
	  var i;
	  var buff=new Array(x.length);
	  copy_(buff,x);
	  return buff;
	}

	//do x=y on bigInts x and y.  x must be an array at least as big as y (not counting the leading zeros in y).
	var copy_ = function(x,y) {
	  var i;
	  var k=x.length<y.length ? x.length : y.length;
	  for (i=0;i<k;i++)
		x[i]=y[i];
	  for (i=k;i<x.length;i++)
		x[i]=0;
	}

	//do x=y on bigInt x and integer y.  
	var copyInt_ = function(x,n) {
	  var i,c;
	  for (c=n,i=0;i<x.length;i++) {
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x+n where x is a bigInt and n is an integer.
	//x must be large enough to hold the result.
	var addInt_ = function(x,n) {
	  var i,k,c,b;
	  x[0]+=n;
	  k=x.length;
	  c=0;
	  for (i=0;i<k;i++) {
		c+=x[i];
		b=0;
		if (c<0) {
		  b=-(c>>bpe);
		  c+=b*radix;
		}
		x[i]=c & mask;
		c=(c>>bpe)-b;
		if (!c) return; //stop carrying as soon as the carry is zero
	  }
	}

	//right shift bigInt x by n bits.  0 <= n < bpe.
	var rightShift_ = function(x,n) {
	  var i;
	  var k=Math.floor(n/bpe);
	  if (k) {
		for (i=0;i<x.length-k;i++) //right shift x by k elements
		  x[i]=x[i+k];
		for (;i<x.length;i++)
		  x[i]=0;
		n%=bpe;
	  }
	  for (i=0;i<x.length-1;i++) {
		x[i]=mask & ((x[i+1]<<(bpe-n)) | (x[i]>>n));
	  }
	  x[i]>>=n;
	}

	//do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement
	var halve_ = function(x) {
	  var i;
	  for (i=0;i<x.length-1;i++) {
		x[i]=mask & ((x[i+1]<<(bpe-1)) | (x[i]>>1));
	  }
	  x[i]=(x[i]>>1) | (x[i] & (radix>>1));  //most significant bit stays the same
	}

	//left shift bigInt x by n bits.
	var leftShift_ = function(x,n) {
	  var i;
	  var k=Math.floor(n/bpe);
	  if (k) {
		for (i=x.length; i>=k; i--) //left shift x by k elements
		  x[i]=x[i-k];
		for (;i>=0;i--)
		  x[i]=0;  
		n%=bpe;
	  }
	  if (!n)
		return;
	  for (i=x.length-1;i>0;i--) {
		x[i]=mask & ((x[i]<<n) | (x[i-1]>>(bpe-n)));
	  }
	  x[i]=mask & (x[i]<<n);
	}

	//do x=x*n where x is a bigInt and n is an integer.
	//x must be large enough to hold the result.
	var multInt_ = function(x,n) {
	  var i,k,c,b;
	  if (!n)
		return;
	  k=x.length;
	  c=0;
	  for (i=0;i<k;i++) {
		c+=x[i]*n;
		b=0;
		if (c<0) {
		  b=-(c>>bpe);
		  c+=b*radix;
		}
		x[i]=c & mask;
		c=(c>>bpe)-b;
	  }
	}

	//do x=floor(x/n) for bigInt x and integer n, and return the remainder
	var divInt_ = function(x,n) {
	  var i,r=0,s;
	  for (i=x.length-1;i>=0;i--) {
		s=r*radix+x[i];
		x[i]=Math.floor(s/n);
		r=s%n;
	  }
	  return r;
	}

	//do the linear combination x=a*x+b*y for bigInts x and y, and integers a and b.
	//x must be large enough to hold the answer.
	var linComb_ = function(x,y,a,b) {
	  var i,c,k,kk;
	  k=x.length<y.length ? x.length : y.length;
	  kk=x.length;
	  for (c=0,i=0;i<k;i++) {
		c+=a*x[i]+b*y[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;i<kk;i++) {
		c+=a*x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do the linear combination x=a*x+b*(y<<(ys*bpe)) for bigInts x and y, and integers a, b and ys.
	//x must be large enough to hold the answer.
	var linCombShift_ = function(x,y,b,ys) {
	  var i,c,k,kk;
	  k=x.length<ys+y.length ? x.length : ys+y.length;
	  kk=x.length;
	  for (c=0,i=ys;i<k;i++) {
		c+=x[i]+b*y[i-ys];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;c && i<kk;i++) {
		c+=x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x+(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
	//x must be large enough to hold the answer.
	var addShift_ = function(x,y,ys) {
	  var i,c,k,kk;
	  k=x.length<ys+y.length ? x.length : ys+y.length;
	  kk=x.length;
	  for (c=0,i=ys;i<k;i++) {
		c+=x[i]+y[i-ys];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;c && i<kk;i++) {
		c+=x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x-(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
	//x must be large enough to hold the answer.
	var subShift_ = function(x,y,ys) {
	  var i,c,k,kk;
	  k=x.length<ys+y.length ? x.length : ys+y.length;
	  kk=x.length;
	  for (c=0,i=ys;i<k;i++) {
		c+=x[i]-y[i-ys];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;c && i<kk;i++) {
		c+=x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x-y for bigInts x and y.
	//x must be large enough to hold the answer.
	//negative answers will be 2s complement
	var sub_ = function(x,y) {
	  var i,c,k,kk;
	  k=x.length<y.length ? x.length : y.length;
	  for (c=0,i=0;i<k;i++) {
		c+=x[i]-y[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;c && i<x.length;i++) {
		c+=x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x+y for bigInts x and y.
	//x must be large enough to hold the answer.
	var add_ = function(x,y) {
	  var i,c,k,kk;
	  k=x.length<y.length ? x.length : y.length;
	  for (c=0,i=0;i<k;i++) {
		c+=x[i]+y[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	  for (i=k;c && i<x.length;i++) {
		c+=x[i];
		x[i]=c & mask;
		c>>=bpe;
	  }
	}

	//do x=x*y for bigInts x and y.  This is faster when y<x.
	var mult_ = function(x,y) {
	  var i;
	  if (ss.length!=2*x.length)
		ss=new Array(2*x.length);
	  copyInt_(ss,0);
	  for (i=0;i<y.length;i++)
		if (y[i])
		  linCombShift_(ss,x,y[i],i);   //ss=1*ss+y[i]*(x<<(i*bpe))
	  copy_(x,ss);
	}

	//do x=x mod n for bigInts x and n.
	var mod_ = function(x,n) {
	  if (s4.length!=x.length)
		s4=dup(x);
	  else
		copy_(s4,x);
	  if (s5.length!=x.length)
		s5=dup(x);  
	  divide_(s4,n,s5,x);  //x = remainder of s4 / n
	}

	//do x=x*y mod n for bigInts x,y,n.
	//for greater speed, let y<x.
	var multMod_ = function(x,y,n) {
	  var i;
	  if (s0.length!=2*x.length)
		s0=new Array(2*x.length);
	  copyInt_(s0,0);
	  for (i=0;i<y.length;i++)
		if (y[i])
		  linCombShift_(s0,x,y[i],i);   //s0=1*s0+y[i]*(x<<(i*bpe))
	  mod_(s0,n);
	  copy_(x,s0);
	}

	//do x=x*x mod n for bigInts x,n.
	var squareMod_ = function(x,n) {
	  var i,j,d,c,kx,kn,k;
	  for (kx=x.length; kx>0 && !x[kx-1]; kx--);  //ignore leading zeros in x
	  k=kx>n.length ? 2*kx : 2*n.length; //k=# elements in the product, which is twice the elements in the larger of x and n
	  if (s0.length!=k) 
		s0=new Array(k);
	  copyInt_(s0,0);
	  for (i=0;i<kx;i++) {
		c=s0[2*i]+x[i]*x[i];
		s0[2*i]=c & mask;
		c>>=bpe;
		for (j=i+1;j<kx;j++) {
		  c=s0[i+j]+2*x[i]*x[j]+c;
		  s0[i+j]=(c & mask);
		  c>>=bpe;
		}
		s0[i+kx]=c;
	  }
	  mod_(s0,n);
	  copy_(x,s0);
	}

	//return x with exactly k leading zero elements
	var trim = function(x,k) {
	  var i,y;
	  for (i=x.length; i>0 && !x[i-1]; i--);
	  y=new Array(i+k);
	  copy_(y,x);
	  return y;
	}

	//do x=x**y mod n, where x,y,n are bigInts and ** is exponentiation.  0**0=1.
	//this is faster when n is odd.  x usually needs to have as many elements as n.
	var powMod_ = function(x,y,n) {
	  var k1,k2,kn,np;
	  if(s7.length!=n.length)
		s7=dup(n);

	  //for even modulus, use a simple square-and-multiply algorithm,
	  //rather than using the more complex Montgomery algorithm.
	  if ((n[0]&1)==0) {
		copy_(s7,x);
		copyInt_(x,1);
		while(!equalsInt(y,0)) {
		  if (y[0]&1)
			multMod_(x,s7,n);
		  divInt_(y,2);
		  squareMod_(s7,n); 
		}
		return;
	  }

	  //calculate np from n for the Montgomery multiplications
	  copyInt_(s7,0);
	  for (kn=n.length;kn>0 && !n[kn-1];kn--);
	  np=radix-inverseModInt(modInt(n,radix),radix);
	  s7[kn]=1;
	  multMod_(x ,s7,n);   // x = x * 2**(kn*bp) mod n

	  if (s3.length!=x.length)
		s3=dup(x);
	  else
		copy_(s3,x);

	  for (k1=y.length-1;k1>0 & !y[k1]; k1--);  //k1=first nonzero element of y
	  if (y[k1]==0) {  //anything to the 0th power is 1
		copyInt_(x,1);
		return;
	  }
	  for (k2=1<<(bpe-1);k2 && !(y[k1] & k2); k2>>=1);  //k2=position of first 1 bit in y[k1]
	  for (;;) {
		if (!(k2>>=1)) {  //look at next bit of y
		  k1--;
		  if (k1<0) {
			mont_(x,one,n,np);
			return;
		  }
		  k2=1<<(bpe-1);
		}    
		mont_(x,x,n,np);

		if (k2 & y[k1]) //if next bit is a 1
		  mont_(x,s3,n,np);
	  }
	}


	//do x=x*y*Ri mod n for bigInts x,y,n, 
	//  where Ri = 2**(-kn*bpe) mod n, and kn is the 
	//  number of elements in the n array, not 
	//  counting leading zeros.  
	//x array must have at least as many elemnts as the n array
	//It's OK if x and y are the same variable.
	//must have:
	//  x,y < n
	//  n is odd
	//  np = -(n^(-1)) mod radix
	var mont_ = function(x,y,n,np) {
	  var i,j,c,ui,t,ks;
	  var kn=n.length;
	  var ky=y.length;

	  if (sa.length!=kn)
		sa=new Array(kn);
		
	  copyInt_(sa,0);

	  for (;kn>0 && n[kn-1]==0;kn--); //ignore leading zeros of n
	  for (;ky>0 && y[ky-1]==0;ky--); //ignore leading zeros of y
	  ks=sa.length-1; //sa will never have more than this many nonzero elements.  

	  //the following loop consumes 95% of the runtime for randTruePrime_() and powMod_() for large numbers
	  for (i=0; i<kn; i++) {
		t=sa[0]+x[i]*y[0];
		ui=((t & mask) * np) & mask;  //the inner "& mask" was needed on Safari (but not MSIE) at one time
		c=(t+ui*n[0]) >> bpe;
		t=x[i];
		
		//do sa=(sa+x[i]*y+ui*n)/b   where b=2**bpe.  Loop is unrolled 5-fold for speed
		j=1;
		for (;j<ky-4;) { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }    
		for (;j<ky;)   { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }
		for (;j<kn-4;) { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
						 c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }  
		for (;j<kn;)   { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }   
		for (;j<ks;)   { c+=sa[j];                  sa[j-1]=c & mask;   c>>=bpe;   j++; }  
		sa[j-1]=c & mask;
	  }

	  if (!greater(n,sa))
		sub_(sa,n);
	  copy_(x,sa);
	}

	// init our one value
	one = int2bigInt(1,1,1); 

	// RA NOTE ~ Added
	// divRem(x,y) returns an array [quotient, remainder]
	var divRem = function(x,y)
	{
		// var x0 = dup(x);
		// var y0 = dup(y);
		var q = new Array(x.length);
		var r = new Array(x.length);
		divide_(x,y,q,r);
		return [q, r];
	}

	// RA NOTE ~ Added
	// safeGCD(x,y) return greatest common divisor of bigInts x and y
	// Given positive bigInts x and y, change the bigints v, a, and b to positive bigInts such that:
	// v = GCD_(x,y) = a*x-b*y
	// The bigInts v, a, b, must have exactly as many elements as the larger of x and y.
	// var eGCD_ = function(x,y,v,a,b) {
	var safeGCD = function(x, y, return_combination)
	{
		return_combination || (return_combination = false);

		var x0 = dup(x);
		var y0 = dup(y);
		if (x.length > y.length)
		{
			var v = new Array(x.length);
			var a = new Array(x.length);
			var b = new Array(x.length);
		}
		else
		{
			var v = new Array(y.length);
			var a = new Array(y.length);
			var b = new Array(y.length);
		}
		eGCD_(x0, y0, v, a, b);

		if (return_combination)
			return [v, a, b];

		return v;
	}

	// exports
	this.findPrimes = findPrimes;
	this.millerRabinInt = millerRabinInt;
	this.millerRabin = millerRabin;
	this.bitSize = bitSize;
	this.expand = expand;
	this.randTruePrime = randTruePrime;
	this.randProbPrime = randProbPrime;
	this.randProbPrimeRounds = randProbPrimeRounds;
	this.mod = mod;
	this.addInt = addInt;
	this.mult = mult;
	this.powMod = powMod;
	this.sub = sub;
	this.add = add;
	this.inverseMod = inverseMod;
	this.multMod = multMod;
	this.randTruePrime_ = randTruePrime_;
	this.randBigInt = randBigInt;
	this.randBigInt_ = randBigInt_;
	this.GCD = GCD;
	this.GCD_ = GCD_;
	this.inverseMod_ = inverseMod_;
	this.inverseModInt = inverseModInt;
	this.inverseModInt_ = inverseModInt_;
	this.eGCD_ = eGCD_;
	this.negative = negative;
	this.greaterShift = greaterShift;
	this.greater = greater;
	this.divide_ = divide_;
	this.carry_ = carry_;
	this.modInt = modInt;
	this.int2bigInt = int2bigInt;
	this.str2bigInt = str2bigInt;
	this.equalsInt = equalsInt;
	this.equals = equals;
	this.isZero = isZero;
	this.bigInt2str = bigInt2str;
	this.dup = dup;
	this.copy_ = copy_;
	this.copyInt_ = copyInt_;
	this.addInt_ = addInt_;
	this.rightShift_ = rightShift_;
	this.halve_ = halve_;
	this.leftShift_ = leftShift_;
	this.multInt_ = multInt_;
	this.divInt_ = divInt_;
	this.linComb_ = linComb_;
	this.linCombShift_ = linCombShift_;
	this.addShift_ = addShift_;
	this.subShift_ = subShift_;
	this.sub_ = sub_;
	this.add_ = add_;
	this.mult_ = mult_;
	this.mod_ = mod_;
	this.multMod_ = multMod_;
	this.squareMod_ = squareMod_;
	this.trim = trim;
	this.powMod_ = powMod_;
	this.mont_ = mont_;

	// RA NOTE ~ Added
	this.divRem = divRem;
	this.safeGCD = safeGCD;
	this.parse = str2bigInt;
});
////////////////////////////////////////////////////////////////////////////////////////
/*
	JavaScript BigInteger library version 0.9
	http://silentmatt.com/biginteger/

	Copyright (c) 2009 Matthew Crumley <email@matthewcrumley.com>
	Copyright (c) 2010,2011 by John Tobey <John.Tobey@gmail.com>
	Licensed under the MIT license.

	Support for arbitrary internal representation base was added by
	Vitaly Magerya.
*/

/*
	File: biginteger.js

	Exports:

		<BigInteger>
*/
(function(exports) {
"use strict";
/*
	Class: BigInteger
	An arbitrarily-large integer.

	<BigInteger> objects should be considered immutable. None of the "built-in"
	methods modify *this* or their arguments. All properties should be
	considered private.

	All the methods of <BigInteger> instances can be called "statically". The
	static versions are convenient if you don't already have a <BigInteger>
	object.

	As an example, these calls are equivalent.

	> BigInteger(4).multiply(5); // returns BigInteger(20);
	> BigInteger.multiply(4, 5); // returns BigInteger(20);

	> var a = 42;
	> var a = BigInteger.toJSValue("0b101010"); // Not completely useless...
*/

var CONSTRUCT = {}; // Unique token to call "private" version of constructor

/*
	Constructor: BigInteger()
	Convert a value to a <BigInteger>.

	Although <BigInteger()> is the constructor for <BigInteger> objects, it is
	best not to call it as a constructor. If *n* is a <BigInteger> object, it is
	simply returned as-is. Otherwise, <BigInteger()> is equivalent to <parse>
	without a radix argument.

	> var n0 = BigInteger();      // Same as <BigInteger.ZERO>
	> var n1 = BigInteger("123"); // Create a new <BigInteger> with value 123
	> var n2 = BigInteger(123);   // Create a new <BigInteger> with value 123
	> var n3 = BigInteger(n2);    // Return n2, unchanged

	The constructor form only takes an array and a sign. *n* must be an
	array of numbers in little-endian order, where each digit is between 0
	and BigInteger.base.  The second parameter sets the sign: -1 for
	negative, +1 for positive, or 0 for zero. The array is *not copied and
	may be modified*. If the array contains only zeros, the sign parameter
	is ignored and is forced to zero.

	> new BigInteger([5], -1): create a new BigInteger with value -5

	Parameters:

		n - Value to convert to a <BigInteger>.

	Returns:

		A <BigInteger> value.

	See Also:

		<parse>, <BigInteger>
*/
function BigInteger(n, s, token) {
	if (token !== CONSTRUCT) {
		if (n instanceof BigInteger) {
			return n;
		}
		else if (typeof n === "undefined") {
			return ZERO;
		}
		return BigInteger.parse(n);
	}

	n = n || [];  // Provide the nullary constructor for subclasses.
	while (n.length && !n[n.length - 1]) {
		--n.length;
	}
	this._d = n;
	this._s = n.length ? (s || 1) : 0;
}

BigInteger._construct = function(n, s) {
	return new BigInteger(n, s, CONSTRUCT);
};

// Base-10 speedup hacks in parse, toString, exp10 and log functions
// require base to be a power of 10. 10^7 is the largest such power
// that won't cause a precision loss when digits are multiplied.
var BigInteger_base = 10000000;
var BigInteger_base_log10 = 7;

BigInteger.base = BigInteger_base;
BigInteger.base_log10 = BigInteger_base_log10;

var ZERO = new BigInteger([], 0, CONSTRUCT);
// Constant: ZERO
// <BigInteger> 0.
BigInteger.ZERO = ZERO;

var ONE = new BigInteger([1], 1, CONSTRUCT);
// Constant: ONE
// <BigInteger> 1.
BigInteger.ONE = ONE;

var M_ONE = new BigInteger(ONE._d, -1, CONSTRUCT);
// Constant: M_ONE
// <BigInteger> -1.
BigInteger.M_ONE = M_ONE;

// Constant: _0
// Shortcut for <ZERO>.
BigInteger._0 = ZERO;

// Constant: _1
// Shortcut for <ONE>.
BigInteger._1 = ONE;

/*
	Constant: small
	Array of <BigIntegers> from 0 to 36.

	These are used internally for parsing, but useful when you need a "small"
	<BigInteger>.

	See Also:

		<ZERO>, <ONE>, <_0>, <_1>
*/
BigInteger.small = [
	ZERO,
	ONE,
	/* Assuming BigInteger_base > 36 */
	new BigInteger( [2], 1, CONSTRUCT),
	new BigInteger( [3], 1, CONSTRUCT),
	new BigInteger( [4], 1, CONSTRUCT),
	new BigInteger( [5], 1, CONSTRUCT),
	new BigInteger( [6], 1, CONSTRUCT),
	new BigInteger( [7], 1, CONSTRUCT),
	new BigInteger( [8], 1, CONSTRUCT),
	new BigInteger( [9], 1, CONSTRUCT),
	new BigInteger([10], 1, CONSTRUCT),
	new BigInteger([11], 1, CONSTRUCT),
	new BigInteger([12], 1, CONSTRUCT),
	new BigInteger([13], 1, CONSTRUCT),
	new BigInteger([14], 1, CONSTRUCT),
	new BigInteger([15], 1, CONSTRUCT),
	new BigInteger([16], 1, CONSTRUCT),
	new BigInteger([17], 1, CONSTRUCT),
	new BigInteger([18], 1, CONSTRUCT),
	new BigInteger([19], 1, CONSTRUCT),
	new BigInteger([20], 1, CONSTRUCT),
	new BigInteger([21], 1, CONSTRUCT),
	new BigInteger([22], 1, CONSTRUCT),
	new BigInteger([23], 1, CONSTRUCT),
	new BigInteger([24], 1, CONSTRUCT),
	new BigInteger([25], 1, CONSTRUCT),
	new BigInteger([26], 1, CONSTRUCT),
	new BigInteger([27], 1, CONSTRUCT),
	new BigInteger([28], 1, CONSTRUCT),
	new BigInteger([29], 1, CONSTRUCT),
	new BigInteger([30], 1, CONSTRUCT),
	new BigInteger([31], 1, CONSTRUCT),
	new BigInteger([32], 1, CONSTRUCT),
	new BigInteger([33], 1, CONSTRUCT),
	new BigInteger([34], 1, CONSTRUCT),
	new BigInteger([35], 1, CONSTRUCT),
	new BigInteger([36], 1, CONSTRUCT)
];

// Used for parsing/radix conversion
BigInteger.digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/*
	Method: toString
	Convert a <BigInteger> to a string.

	When *base* is greater than 10, letters are upper case.

	Parameters:

		base - Optional base to represent the number in (default is base 10).
		       Must be between 2 and 36 inclusive, or an Error will be thrown.

	Returns:

		The string representation of the <BigInteger>.
*/
BigInteger.prototype.toString = function(base) {
	base = +base || 10;
	if (base < 2 || base > 36) {
		throw new Error("illegal radix " + base + ".");
	}
	if (this._s === 0) {
		return "0";
	}
	if (base === 10) {
		var str = this._s < 0 ? "-" : "";
		str += this._d[this._d.length - 1].toString();
		for (var i = this._d.length - 2; i >= 0; i--) {
			var group = this._d[i].toString();
			while (group.length < BigInteger_base_log10) group = '0' + group;
			str += group;
		}
		return str;
	}
	else {
		var numerals = BigInteger.digits;
		base = BigInteger.small[base];
		var sign = this._s;

		var n = this.abs();
		var digits = [];
		var digit;

		while (n._s !== 0) {
			var divmod = n.divRem(base);
			n = divmod[0];
			digit = divmod[1];
			// TODO: This could be changed to unshift instead of reversing at the end.
			// Benchmark both to compare speeds.
			digits.push(numerals[digit.valueOf()]);
		}
		return (sign < 0 ? "-" : "") + digits.reverse().join("");
	}
};

// Verify strings for parsing
BigInteger.radixRegex = [
	/^$/,
	/^$/,
	/^[01]*$/,
	/^[012]*$/,
	/^[0-3]*$/,
	/^[0-4]*$/,
	/^[0-5]*$/,
	/^[0-6]*$/,
	/^[0-7]*$/,
	/^[0-8]*$/,
	/^[0-9]*$/,
	/^[0-9aA]*$/,
	/^[0-9abAB]*$/,
	/^[0-9abcABC]*$/,
	/^[0-9a-dA-D]*$/,
	/^[0-9a-eA-E]*$/,
	/^[0-9a-fA-F]*$/,
	/^[0-9a-gA-G]*$/,
	/^[0-9a-hA-H]*$/,
	/^[0-9a-iA-I]*$/,
	/^[0-9a-jA-J]*$/,
	/^[0-9a-kA-K]*$/,
	/^[0-9a-lA-L]*$/,
	/^[0-9a-mA-M]*$/,
	/^[0-9a-nA-N]*$/,
	/^[0-9a-oA-O]*$/,
	/^[0-9a-pA-P]*$/,
	/^[0-9a-qA-Q]*$/,
	/^[0-9a-rA-R]*$/,
	/^[0-9a-sA-S]*$/,
	/^[0-9a-tA-T]*$/,
	/^[0-9a-uA-U]*$/,
	/^[0-9a-vA-V]*$/,
	/^[0-9a-wA-W]*$/,
	/^[0-9a-xA-X]*$/,
	/^[0-9a-yA-Y]*$/,
	/^[0-9a-zA-Z]*$/
];

/*
	Function: parse
	Parse a string into a <BigInteger>.

	*base* is optional but, if provided, must be from 2 to 36 inclusive. If
	*base* is not provided, it will be guessed based on the leading characters
	of *s* as follows:

	- "0x" or "0X": *base* = 16
	- "0c" or "0C": *base* = 8
	- "0b" or "0B": *base* = 2
	- else: *base* = 10

	If no base is provided, or *base* is 10, the number can be in exponential
	form. For example, these are all valid:

	> BigInteger.parse("1e9");              // Same as "1000000000"
	> BigInteger.parse("1.234*10^3");       // Same as 1234
	> BigInteger.parse("56789 * 10 ** -2"); // Same as 567

	If any characters fall outside the range defined by the radix, an exception
	will be thrown.

	Parameters:

		s - The string to parse.
		base - Optional radix (default is to guess based on *s*).

	Returns:

		a <BigInteger> instance.
*/
BigInteger.parse = function(s, base) {
	// Expands a number in exponential form to decimal form.
	// expandExponential("-13.441*10^5") === "1344100";
	// expandExponential("1.12300e-1") === "0.112300";
	// expandExponential(1000000000000000000000000000000) === "1000000000000000000000000000000";
	function expandExponential(str) {
		str = str.replace(/\s*[*xX]\s*10\s*(\^|\*\*)\s*/, "e");

		return str.replace(/^([+\-])?(\d+)\.?(\d*)[eE]([+\-]?\d+)$/, function(x, s, n, f, c) {
			c = +c;
			var l = c < 0;
			var i = n.length + c;
			x = (l ? n : f).length;
			c = ((c = Math.abs(c)) >= x ? c - x + l : 0);
			var z = (new Array(c + 1)).join("0");
			var r = n + f;
			return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
		});
	}

	s = s.toString();
	if (typeof base === "undefined" || +base === 10) {
		s = expandExponential(s);
	}

	var prefixRE;
	if (typeof base === "undefined") {
		prefixRE = '0[xcb]';
	}
	else if (base == 16) {
		prefixRE = '0x';
	}
	else if (base == 8) {
		prefixRE = '0c';
	}
	else if (base == 2) {
		prefixRE = '0b';
	}
	else {
		prefixRE = '';
	}
	var parts = new RegExp('^([+\\-]?)(' + prefixRE + ')?([0-9a-z]*)(?:\\.\\d*)?$', 'i').exec(s);
	if (parts) {
		var sign = parts[1] || "+";
		var baseSection = parts[2] || "";
		var digits = parts[3] || "";

		if (typeof base === "undefined") {
			// Guess base
			if (baseSection === "0x" || baseSection === "0X") { // Hex
				base = 16;
			}
			else if (baseSection === "0c" || baseSection === "0C") { // Octal
				base = 8;
			}
			else if (baseSection === "0b" || baseSection === "0B") { // Binary
				base = 2;
			}
			else {
				base = 10;
			}
		}
		else if (base < 2 || base > 36) {
			throw new Error("Illegal radix " + base + ".");
		}

		base = +base;

		// Check for digits outside the range
		if (!(BigInteger.radixRegex[base].test(digits))) {
			throw new Error("Bad digit for radix " + base);
		}

		// Strip leading zeros, and convert to array
		digits = digits.replace(/^0+/, "").split("");
		if (digits.length === 0) {
			return ZERO;
		}

		// Get the sign (we know it's not zero)
		sign = (sign === "-") ? -1 : 1;

		// Optimize 10
		if (base == 10) {
			var d = [];
			while (digits.length >= BigInteger_base_log10) {
				d.push(parseInt(digits.splice(digits.length-BigInteger.base_log10, BigInteger.base_log10).join(''), 10));
			}
			d.push(parseInt(digits.join(''), 10));
			return new BigInteger(d, sign, CONSTRUCT);
		}

		// Do the conversion
		var d = ZERO;
		base = BigInteger.small[base];
		var small = BigInteger.small;
		for (var i = 0; i < digits.length; i++) {
			d = d.multiply(base).add(small[parseInt(digits[i], 36)]);
		}
		return new BigInteger(d._d, sign, CONSTRUCT);
	}
	else {
		throw new Error("Invalid BigInteger format: " + s);
	}
};

/*
	Function: add
	Add two <BigIntegers>.

	Parameters:

		n - The number to add to *this*. Will be converted to a <BigInteger>.

	Returns:

		The numbers added together.

	See Also:

		<subtract>, <multiply>, <quotient>, <next>
*/
BigInteger.prototype.add = function(n) {
	if (this._s === 0) {
		return BigInteger(n);
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.subtract(n);
	}

	var a = this._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var sum = new Array(Math.max(al, bl) + 1);
	var size = Math.min(al, bl);
	var carry = 0;
	var digit;

	for (var i = 0; i < size; i++) {
		digit = a[i] + b[i] + carry;
		sum[i] = digit % BigInteger_base;
		carry = (digit / BigInteger_base) | 0;
	}
	if (bl > al) {
		a = b;
		al = bl;
	}
	for (i = size; carry && i < al; i++) {
		digit = a[i] + carry;
		sum[i] = digit % BigInteger_base;
		carry = (digit / BigInteger_base) | 0;
	}
	if (carry) {
		sum[i] = carry;
	}

	for ( ; i < al; i++) {
		sum[i] = a[i];
	}

	return new BigInteger(sum, this._s, CONSTRUCT);
};

/*
	Function: negate
	Get the additive inverse of a <BigInteger>.

	Returns:

		A <BigInteger> with the same magnatude, but with the opposite sign.

	See Also:

		<abs>
*/
BigInteger.prototype.negate = function() {
	return new BigInteger(this._d, (-this._s) | 0, CONSTRUCT);
};

/*
	Function: abs
	Get the absolute value of a <BigInteger>.

	Returns:

		A <BigInteger> with the same magnatude, but always positive (or zero).

	See Also:

		<negate>
*/
BigInteger.prototype.abs = function() {
	return (this._s < 0) ? this.negate() : this;
};

/*
	Function: subtract
	Subtract two <BigIntegers>.

	Parameters:

		n - The number to subtract from *this*. Will be converted to a <BigInteger>.

	Returns:

		The *n* subtracted from *this*.

	See Also:

		<add>, <multiply>, <quotient>, <prev>
*/
BigInteger.prototype.subtract = function(n) {
	if (this._s === 0) {
		return BigInteger(n).negate();
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.add(n);
	}

	var m = this;
	// negative - negative => -|a| - -|b| => -|a| + |b| => |b| - |a|
	if (this._s < 0) {
		m = new BigInteger(n._d, 1, CONSTRUCT);
		n = new BigInteger(this._d, 1, CONSTRUCT);
	}

	// Both are positive => a - b
	var sign = m.compareAbs(n);
	if (sign === 0) {
		return ZERO;
	}
	else if (sign < 0) {
		// swap m and n
		var t = n;
		n = m;
		m = t;
	}

	// a > b
	var a = m._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var diff = new Array(al); // al >= bl since a > b
	var borrow = 0;
	var i;
	var digit;

	for (i = 0; i < bl; i++) {
		digit = a[i] - borrow - b[i];
		if (digit < 0) {
			digit += BigInteger_base;
			borrow = 1;
		}
		else {
			borrow = 0;
		}
		diff[i] = digit;
	}
	for (i = bl; i < al; i++) {
		digit = a[i] - borrow;
		if (digit < 0) {
			digit += BigInteger_base;
		}
		else {
			diff[i++] = digit;
			break;
		}
		diff[i] = digit;
	}
	for ( ; i < al; i++) {
		diff[i] = a[i];
	}

	return new BigInteger(diff, sign, CONSTRUCT);
};

(function() {
	function addOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var carry = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) + 1;
			sum[i] = digit % BigInteger_base;
			if (digit <= BigInteger_base - 1) {
				break;
			}
			++i;
		}

		return new BigInteger(sum, sign, CONSTRUCT);
	}

	function subtractOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var borrow = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) - 1;
			if (digit < 0) {
				sum[i] = digit + BigInteger_base;
			}
			else {
				sum[i] = digit;
				break;
			}
			++i;
		}

		return new BigInteger(sum, sign, CONSTRUCT);
	}

	/*
		Function: next
		Get the next <BigInteger> (add one).

		Returns:

			*this* + 1.

		See Also:

			<add>, <prev>
	*/
	BigInteger.prototype.next = function() {
		switch (this._s) {
		case 0:
			return ONE;
		case -1:
			return subtractOne(this, -1);
		// case 1:
		default:
			return addOne(this, 1);
		}
	};

	/*
		Function: prev
		Get the previous <BigInteger> (subtract one).

		Returns:

			*this* - 1.

		See Also:

			<next>, <subtract>
	*/
	BigInteger.prototype.prev = function() {
		switch (this._s) {
		case 0:
			return M_ONE;
		case -1:
			return addOne(this, -1);
		// case 1:
		default:
			return subtractOne(this, 1);
		}
	};
})();

/*
	Function: compareAbs
	Compare the absolute value of two <BigIntegers>.

	Calling <compareAbs> is faster than calling <abs> twice, then <compare>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger>.

	Returns:

		-1, 0, or +1 if *|this|* is less than, equal to, or greater than *|n|*.

	See Also:

		<compare>, <abs>
*/
BigInteger.prototype.compareAbs = function(n) {
	if (this === n) {
		return 0;
	}

	if (!(n instanceof BigInteger)) {
		if (!isFinite(n)) {
			return(isNaN(n) ? n : -1);
		}
		n = BigInteger(n);
	}

	if (this._s === 0) {
		return (n._s !== 0) ? -1 : 0;
	}
	if (n._s === 0) {
		return 1;
	}

	var l = this._d.length;
	var nl = n._d.length;
	if (l < nl) {
		return -1;
	}
	else if (l > nl) {
		return 1;
	}

	var a = this._d;
	var b = n._d;
	for (var i = l-1; i >= 0; i--) {
		if (a[i] !== b[i]) {
			return a[i] < b[i] ? -1 : 1;
		}
	}

	return 0;
};

/*
	Function: compare
	Compare two <BigIntegers>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger>.

	Returns:

		-1, 0, or +1 if *this* is less than, equal to, or greater than *n*.

	See Also:

		<compareAbs>, <isPositive>, <isNegative>, <isUnit>
*/
BigInteger.prototype.compare = function(n) {
	if (this === n) {
		return 0;
	}

	n = BigInteger(n);

	if (this._s === 0) {
		return -n._s;
	}

	if (this._s === n._s) { // both positive or both negative
		var cmp = this.compareAbs(n);
		return cmp * this._s;
	}
	else {
		return this._s;
	}
};

/*
	Function: isUnit
	Return true iff *this* is either 1 or -1.

	Returns:

		true if *this* compares equal to <BigInteger.ONE> or <BigInteger.M_ONE>.

	See Also:

		<isZero>, <isNegative>, <isPositive>, <compareAbs>, <compare>,
		<BigInteger.ONE>, <BigInteger.M_ONE>
*/
BigInteger.prototype.isUnit = function() {
	return this === ONE ||
		this === M_ONE ||
		(this._d.length === 1 && this._d[0] === 1);
};

/*
	Function: multiply
	Multiply two <BigIntegers>.

	Parameters:

		n - The number to multiply *this* by. Will be converted to a
		<BigInteger>.

	Returns:

		The numbers multiplied together.

	See Also:

		<add>, <subtract>, <quotient>, <square>
*/
BigInteger.prototype.multiply = function(n) {
	// TODO: Consider adding Karatsuba multiplication for large numbers
	if (this._s === 0) {
		return ZERO;
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		if (this._s < 0) {
			return n.negate();
		}
		return n;
	}
	if (n.isUnit()) {
		if (n._s < 0) {
			return this.negate();
		}
		return this;
	}
	if (this === n) {
		return this.square();
	}

	var r = (this._d.length >= n._d.length);
	var a = (r ? this : n)._d; // a will be longer than b
	var b = (r ? n : this)._d;
	var al = a.length;
	var bl = b.length;

	var pl = al + bl;
	var partial = new Array(pl);
	var i;
	for (i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	for (i = 0; i < bl; i++) {
		var carry = 0;
		var bi = b[i];
		var jlimit = al + i;
		var digit;
		for (var j = i; j < jlimit; j++) {
			digit = partial[j] + bi * a[j - i] + carry;
			carry = (digit / BigInteger_base) | 0;
			partial[j] = (digit % BigInteger_base) | 0;
		}
		if (carry) {
			digit = partial[j] + carry;
			carry = (digit / BigInteger_base) | 0;
			partial[j] = digit % BigInteger_base;
		}
	}
	return new BigInteger(partial, this._s * n._s, CONSTRUCT);
};

// Multiply a BigInteger by a single-digit native number
// Assumes that this and n are >= 0
// This is not really intended to be used outside the library itself
BigInteger.prototype.multiplySingleDigit = function(n) {
	if (n === 0 || this._s === 0) {
		return ZERO;
	}
	if (n === 1) {
		return this;
	}

	var digit;
	if (this._d.length === 1) {
		digit = this._d[0] * n;
		if (digit >= BigInteger_base) {
			return new BigInteger([(digit % BigInteger_base)|0,
					(digit / BigInteger_base)|0], 1, CONSTRUCT);
		}
		return new BigInteger([digit], 1, CONSTRUCT);
	}

	if (n === 2) {
		return this.add(this);
	}
	if (this.isUnit()) {
		return new BigInteger([n], 1, CONSTRUCT);
	}

	var a = this._d;
	var al = a.length;

	var pl = al + 1;
	var partial = new Array(pl);
	for (var i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	var carry = 0;
	for (var j = 0; j < al; j++) {
		digit = n * a[j] + carry;
		carry = (digit / BigInteger_base) | 0;
		partial[j] = (digit % BigInteger_base) | 0;
	}
	if (carry) {
		partial[j] = carry;
	}

	return new BigInteger(partial, 1, CONSTRUCT);
};

/*
	Function: square
	Multiply a <BigInteger> by itself.

	This is slightly faster than regular multiplication, since it removes the
	duplicated multiplcations.

	Returns:

		> this.multiply(this)

	See Also:
		<multiply>
*/
BigInteger.prototype.square = function() {
	// Normally, squaring a 10-digit number would take 100 multiplications.
	// Of these 10 are unique diagonals, of the remaining 90 (100-10), 45 are repeated.
	// This procedure saves (N*(N-1))/2 multiplications, (e.g., 45 of 100 multiplies).
	// Based on code by Gary Darby, Intellitech Systems Inc., www.DelphiForFun.org

	if (this._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		return ONE;
	}

	var digits = this._d;
	var length = digits.length;
	var imult1 = new Array(length + length + 1);
	var product, carry, k;
	var i;

	// Calculate diagonal
	for (i = 0; i < length; i++) {
		k = i * 2;
		product = digits[i] * digits[i];
		carry = (product / BigInteger_base) | 0;
		imult1[k] = product % BigInteger_base;
		imult1[k + 1] = carry;
	}

	// Calculate repeating part
	for (i = 0; i < length; i++) {
		carry = 0;
		k = i * 2 + 1;
		for (var j = i + 1; j < length; j++, k++) {
			product = digits[j] * digits[i] * 2 + imult1[k] + carry;
			carry = (product / BigInteger_base) | 0;
			imult1[k] = product % BigInteger_base;
		}
		k = length + i;
		var digit = carry + imult1[k];
		carry = (digit / BigInteger_base) | 0;
		imult1[k] = digit % BigInteger_base;
		imult1[k + 1] += carry;
	}

	return new BigInteger(imult1, 1, CONSTRUCT);
};

/*
	Function: quotient
	Divide two <BigIntegers> and truncate towards zero.

	<quotient> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger>.

	Returns:

		The *this* / *n*, truncated to an integer.

	See Also:

		<add>, <subtract>, <multiply>, <divRem>, <remainder>
*/
BigInteger.prototype.quotient = function(n) {
	return this.divRem(n)[0];
};

/*
	Function: divide
	Deprecated synonym for <quotient>.
*/
BigInteger.prototype.divide = BigInteger.prototype.quotient;

/*
	Function: remainder
	Calculate the remainder of two <BigIntegers>.

	<remainder> throws an exception if *n* is zero.

	Parameters:

		n - The remainder after *this* is divided *this* by *n*. Will be
		    converted to a <BigInteger>.

	Returns:

		*this* % *n*.

	See Also:

		<divRem>, <quotient>
*/
BigInteger.prototype.remainder = function(n) {
	return this.divRem(n)[1];
};

/*
	Function: divRem
	Calculate the integer quotient and remainder of two <BigIntegers>.

	<divRem> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger>.

	Returns:

		A two-element array containing the quotient and the remainder.

		> a.divRem(b)

		is exactly equivalent to

		> [a.quotient(b), a.remainder(b)]

		except it is faster, because they are calculated at the same time.

	See Also:

		<quotient>, <remainder>
*/
BigInteger.prototype.divRem = function(n) {
	n = BigInteger(n);
	if (n._s === 0) {
		throw new Error("Divide by zero");
	}
	if (this._s === 0) {
		return [ZERO, ZERO];
	}
	if (n._d.length === 1) {
		return this.divRemSmall(n._s * n._d[0]);
	}

	// Test for easy cases -- |n1| <= |n2|
	switch (this.compareAbs(n)) {
	case 0: // n1 == n2
		return [this._s === n._s ? ONE : M_ONE, ZERO];
	case -1: // |n1| < |n2|
		return [ZERO, this];
	}

	var sign = this._s * n._s;
	var a = n.abs();
	var b_digits = this._d;
	var b_index = b_digits.length;
	var digits = n._d.length;
	var quot = [];
	var guess;

	var part = new BigInteger([], 0, CONSTRUCT);
	part._s = 1;

	while (b_index) {
		part._d.unshift(b_digits[--b_index]);

		if (part.compareAbs(n) < 0) {
			quot.push(0);
			continue;
		}
		if (part._s === 0) {
			guess = 0;
		}
		else {
			var xlen = part._d.length, ylen = a._d.length;
			var highx = part._d[xlen-1]*BigInteger_base + part._d[xlen-2];
			var highy = a._d[ylen-1]*BigInteger_base + a._d[ylen-2];
			if (part._d.length > a._d.length) {
				// The length of part._d can either match a._d length,
				// or exceed it by one.
				highx = (highx+1)*BigInteger_base;
			}
			guess = Math.ceil(highx/highy);
		}
		do {
			var check = a.multiplySingleDigit(guess);
			if (check.compareAbs(part) <= 0) {
				break;
			}
			guess--;
		} while (guess);

		quot.push(guess);
		if (!guess) {
			continue;
		}
		var diff = part.subtract(check);
		part._d = diff._d.slice();
		if (part._d.length === 0) {
			part._s = 0;
		}
	}

	return [new BigInteger(quot.reverse(), sign, CONSTRUCT),
		   new BigInteger(part._d, this._s, CONSTRUCT)];
};

// Throws an exception if n is outside of (-BigInteger.base, -1] or
// [1, BigInteger.base).  It's not necessary to call this, since the
// other division functions will call it if they are able to.
BigInteger.prototype.divRemSmall = function(n) {
	var r;
	n = +n;
	if (n === 0) {
		throw new Error("Divide by zero");
	}

	var n_s = n < 0 ? -1 : 1;
	var sign = this._s * n_s;
	n = Math.abs(n);

	if (n < 1 || n >= BigInteger_base) {
		throw new Error("Argument out of range");
	}

	if (this._s === 0) {
		return [ZERO, ZERO];
	}

	if (n === 1 || n === -1) {
		return [(sign === 1) ? this.abs() : new BigInteger(this._d, sign, CONSTRUCT), ZERO];
	}

	// 2 <= n < BigInteger_base

	// divide a single digit by a single digit
	if (this._d.length === 1) {
		var q = new BigInteger([(this._d[0] / n) | 0], 1, CONSTRUCT);
		r = new BigInteger([(this._d[0] % n) | 0], 1, CONSTRUCT);
		if (sign < 0) {
			q = q.negate();
		}
		if (this._s < 0) {
			r = r.negate();
		}
		return [q, r];
	}

	var digits = this._d.slice();
	var quot = new Array(digits.length);
	var part = 0;
	var diff = 0;
	var i = 0;
	var guess;

	while (digits.length) {
		part = part * BigInteger_base + digits[digits.length - 1];
		if (part < n) {
			quot[i++] = 0;
			digits.pop();
			diff = BigInteger_base * diff + part;
			continue;
		}
		if (part === 0) {
			guess = 0;
		}
		else {
			guess = (part / n) | 0;
		}

		var check = n * guess;
		diff = part - check;
		quot[i++] = guess;
		if (!guess) {
			digits.pop();
			continue;
		}

		digits.pop();
		part = diff;
	}

	r = new BigInteger([diff], 1, CONSTRUCT);
	if (this._s < 0) {
		r = r.negate();
	}
	return [new BigInteger(quot.reverse(), sign, CONSTRUCT), r];
};

/*
	Function: isEven
	Return true iff *this* is divisible by two.

	Note that <BigInteger.ZERO> is even.

	Returns:

		true if *this* is even, false otherwise.

	See Also:

		<isOdd>
*/
BigInteger.prototype.isEven = function() {
	var digits = this._d;
	return this._s === 0 || digits.length === 0 || (digits[0] % 2) === 0;
};

/*
	Function: isOdd
	Return true iff *this* is not divisible by two.

	Returns:

		true if *this* is odd, false otherwise.

	See Also:

		<isEven>
*/
BigInteger.prototype.isOdd = function() {
	return !this.isEven();
};

/*
	Function: sign
	Get the sign of a <BigInteger>.

	Returns:

		* -1 if *this* < 0
		* 0 if *this* == 0
		* +1 if *this* > 0

	See Also:

		<isZero>, <isPositive>, <isNegative>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.sign = function() {
	return this._s;
};

/*
	Function: isPositive
	Return true iff *this* > 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == 1.

	See Also:

		<sign>, <isZero>, <isNegative>, <isUnit>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.isPositive = function() {
	return this._s > 0;
};

/*
	Function: isNegative
	Return true iff *this* < 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == -1.

	See Also:

		<sign>, <isPositive>, <isZero>, <isUnit>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.isNegative = function() {
	return this._s < 0;
};

/*
	Function: isZero
	Return true iff *this* == 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == 0.

	See Also:

		<sign>, <isPositive>, <isNegative>, <isUnit>, <BigInteger.ZERO>
*/
BigInteger.prototype.isZero = function() {
	return this._s === 0;
};

/*
	Function: exp10
	Multiply a <BigInteger> by a power of 10.

	This is equivalent to, but faster than

	> if (n >= 0) {
	>     return this.multiply(BigInteger("1e" + n));
	> }
	> else { // n <= 0
	>     return this.quotient(BigInteger("1e" + -n));
	> }

	Parameters:

		n - The power of 10 to multiply *this* by. *n* is converted to a
		javascipt number and must be no greater than <BigInteger.MAX_EXP>
		(0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* * (10 ** *n*), truncated to an integer if necessary.

	See Also:

		<pow>, <multiply>
*/
BigInteger.prototype.exp10 = function(n) {
	n = +n;
	if (n === 0) {
		return this;
	}
	if (Math.abs(n) > Number(MAX_EXP)) {
		throw new Error("exponent too large in BigInteger.exp10");
	}
	if (n > 0) {
		var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);

		for (; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
			k._d.unshift(0);
		}
		if (n == 0)
			return k;
		k._s = 1;
		k = k.multiplySingleDigit(Math.pow(10, n));
		return (this._s < 0 ? k.negate() : k);
	} else if (-n >= this._d.length*BigInteger_base_log10) {
		return ZERO;
	} else {
		var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);

		for (n = -n; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
			k._d.shift();
		}
		return (n == 0) ? k : k.divRemSmall(Math.pow(10, n))[0];
	}
};

/*
	Function: pow
	Raise a <BigInteger> to a power.

	In this implementation, 0**0 is 1.

	Parameters:

		n - The exponent to raise *this* by. *n* must be no greater than
		<BigInteger.MAX_EXP> (0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* raised to the *nth* power.

	See Also:

		<modPow>
*/
BigInteger.prototype.pow = function(n) {
	if (this.isUnit()) {
		if (this._s > 0) {
			return this;
		}
		else {
			return BigInteger(n).isOdd() ? this : this.negate();
		}
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return ONE;
	}
	else if (n._s < 0) {
		if (this._s === 0) {
			throw new Error("Divide by zero");
		}
		else {
			return ZERO;
		}
	}
	if (this._s === 0) {
		return ZERO;
	}
	if (n.isUnit()) {
		return this;
	}

	if (n.compareAbs(MAX_EXP) > 0) {
		throw new Error("exponent too large in BigInteger.pow");
	}
	var x = this;
	var aux = ONE;
	var two = BigInteger.small[2];

	while (n.isPositive()) {
		if (n.isOdd()) {
			aux = aux.multiply(x);
			if (n.isUnit()) {
				return aux;
			}
		}
		x = x.square();
		n = n.quotient(two);
	}

	return aux;
};

/*
	Function: modPow
	Raise a <BigInteger> to a power (mod m).

	Because it is reduced by a modulus, <modPow> is not limited by
	<BigInteger.MAX_EXP> like <pow>.

	Parameters:

		exponent - The exponent to raise *this* by. Must be positive.
		modulus - The modulus.

	Returns:

		*this* ^ *exponent* (mod *modulus*).

	See Also:

		<pow>, <mod>
*/
BigInteger.prototype.modPow = function(exponent, modulus) {
	var result = ONE;
	var base = this;

	while (exponent.isPositive()) {
		if (exponent.isOdd()) {
			result = result.multiply(base).remainder(modulus);
		}

		exponent = exponent.quotient(BigInteger.small[2]);
		if (exponent.isPositive()) {
			base = base.square().remainder(modulus);
		}
	}

	return result;
};

/*
	Function: log
	Get the natural logarithm of a <BigInteger> as a native JavaScript number.

	This is equivalent to

	> Math.log(this.toJSValue())

	but handles values outside of the native number range.

	Returns:

		log( *this* )

	See Also:

		<toJSValue>
*/
BigInteger.prototype.log = function() {
	switch (this._s) {
	case 0:	 return -Infinity;
	case -1: return NaN;
	default: // Fall through.
	}

	var l = this._d.length;

	if (l*BigInteger_base_log10 < 30) {
		return Math.log(this.valueOf());
	}

	var N = Math.ceil(30/BigInteger_base_log10);
	var firstNdigits = this._d.slice(l - N);
	return Math.log((new BigInteger(firstNdigits, 1, CONSTRUCT)).valueOf()) + (l - N) * Math.log(BigInteger_base);
};

/*
	Function: valueOf
	Convert a <BigInteger> to a native JavaScript integer.

	This is called automatically by JavaScipt to convert a <BigInteger> to a
	native value.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <toJSValue>
*/
BigInteger.prototype.valueOf = function() {
	return parseInt(this.toString(), 10);
};

/*
	Function: toJSValue
	Convert a <BigInteger> to a native JavaScript integer.

	This is the same as valueOf, but more explicitly named.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <valueOf>
*/
BigInteger.prototype.toJSValue = function() {
	return parseInt(this.toString(), 10);
};

var MAX_EXP = BigInteger(0x7FFFFFFF);
// Constant: MAX_EXP
// The largest exponent allowed in <pow> and <exp10> (0x7FFFFFFF or 2147483647).
BigInteger.MAX_EXP = MAX_EXP;

(function() {
	function makeUnary(fn) {
		return function(a) {
			return fn.call(BigInteger(a));
		};
	}

	function makeBinary(fn) {
		return function(a, b) {
			return fn.call(BigInteger(a), BigInteger(b));
		};
	}

	function makeTrinary(fn) {
		return function(a, b, c) {
			return fn.call(BigInteger(a), BigInteger(b), BigInteger(c));
		};
	}

	(function() {
		var i, fn;
		var unary = "toJSValue,isEven,isOdd,sign,isZero,isNegative,abs,isUnit,square,negate,isPositive,toString,next,prev,log".split(",");
		var binary = "compare,remainder,divRem,subtract,add,quotient,divide,multiply,pow,compareAbs".split(",");
		var trinary = ["modPow"];

		for (i = 0; i < unary.length; i++) {
			fn = unary[i];
			BigInteger[fn] = makeUnary(BigInteger.prototype[fn]);
		}

		for (i = 0; i < binary.length; i++) {
			fn = binary[i];
			BigInteger[fn] = makeBinary(BigInteger.prototype[fn]);
		}

		for (i = 0; i < trinary.length; i++) {
			fn = trinary[i];
			BigInteger[fn] = makeTrinary(BigInteger.prototype[fn]);
		}

		BigInteger.exp10 = function(x, n) {
			return BigInteger(x).exp10(n);
		};
	})();
})();

exports.BigInteger = BigInteger;
})(typeof exports !== 'undefined' ? exports : this);
"use strict";

/*
 *	RSA Cryptography classes
 *	Copyright (c) 2013, Jeff Lyon. (http://rubbingalcoholic.com)
 * 
 *	Licensed under The MIT License. (http://www.opensource.org/licenses/mit-license.php)
 *	Redistributions of files must retain the above copyright notice.
 */

/**
 *	@class
 *	@classdesc		Implements RSA encryption and decryption functionality
 *	@desc			Creates a new RSA instance.
 *	@requires		crypto_math
 */
var RSA = new Class(
/** @lends RSA.prototype */
{

	/**
	 *	The data encoding class. The default is {@link PKCS1_v1_5}, set by {@link RSA#initialize}
	 *	@type {Class}
	 *	@private
	 */
	encode_mode: null,

	/**
	 *	Invoked during initialization. Sets the default encoding class.
	 */
	initialize: function()
	{
		this.encode_mode = PKCS1_v1_5;
	},

	/**
	 *	Encrypts data
	 *	
	 *	@param {string} plaintext							ASCII-encoded binary string data to encrypt. Any non-ASCII characters
	 *														should be first encoded out using {@link convert.utf8.encode}
	 *	@param {RSAKey} key									Required RSAKey containing public exponent and modulus
	 *	@param {string} [options.return_format='binary']	(binary|BigInt) The return format.
	 *	@return {string|BigInt}								Either an ASCII-encoded binary string or a BigInt value
	 */
	encrypt: function(plaintext, key, options)
	{
		options || (options = {});
		options.return_format || (options.return_format = 'binary');

		// first perform padding
		var padded = new this.encode_mode().encode(plaintext, key);

		// turn our padded value into a bigint
		var big = crypto_math.binstring_to_bigint(padded);

		// encrypt it
		big = new BigInt().powMod(big, key.get_exponent_public(), key.get_modulus());
		
		if (options.return_format == 'bigint')
			return big;

		return crypto_math.bigint_to_binstring(big);
	},

	/**
	 *	Decrypts data
	 *	
	 *	@param {string} ciphertext	ASCII-encoded binary ciphertext string.
	 *	@param {RSAKey} key			Required RSAKey containing private decryption exponent and modulus
	 *	@return {string}			ASCII-encoded binary plaintext string
	 */
	decrypt: function(ciphertext, key)
	{
		var big			= crypto_math.binstring_to_bigint(ciphertext);

		// decrypt it
		big				= new BigInt().powMod(big, key.get_exponent_private(), key.get_modulus());

		// convert to a binstring
		var binstring	= crypto_math.bigint_to_binstring(big);

		// remove padding
		binstring		= new this.encode_mode().decode(binstring);

		return binstring;
	},

	debug_mode: true

});

/**
 *	@class
 *	@classdesc		Defines RSA key functionality for public and private key pairs
 *	@desc			Creates a new RSAKey instance.
 *	@param {Object} data	Initialization options for the class, passed automatically into {@link RSAKey#initialize}
 *	@requires		crypto_math
 */
var RSAKey	=	new Class(
/** @lends RSAKey.prototype */
{

	// public fields -----------------------------------------------------------------
	/**
	 *	The public modulus. Used in both public and private keys.
	 *	@type {BigInt}
	 *	@private
	 */
	n: 0,

	/**
	 *	The public encryption exponent.
	 *	@type {BigInt}
	 *	@private
	 */
	e: 0,

	// secret fields ------------------------------------------------------------------
	/**
	 *	The private (decryption) exponent.
	 *	@type {BigInt}
	 *	@private
	 */
	d: 0,

	/**
	 *	A big random prime number, less than q (private, n is constructed using this and q)
	 *	@type {BigInt}
	 *	@private
	 */
	p: 0,

	/**
	 *	Another big random prime number (private, n is constructed using this and p)
	 *	@type {BigInt}
	 *	@private
	 */
	q: 0,

	/**
	 *	The multiplicative inverse of p (mod q). Private. OpenPGP wants to have this around.
	 *	@type {BigInt}
	 *	@private
	 */
	u: 0,

	/* RA NOTE ~ OpenPGP support related ;) */
	// encrypted_secret_field_data: '',
	// secret_checksum: '',
	// checksum_type: 'sha1',	// sha1 | simple	

	// debug_mode: true,

	/**
	 *	Initializes the class with properties,
	 *
	 *	@param {Object} data		A list of properties used to initialize the class.
	 *	@param {BigInt} [data.n]	The public / private modulus
	 *	@param {BigInt} [data.e]	The public exponent
	 *	@param {BigInt} [data.d]	The private exponent
	 *	@param {BigInt} [data.p]	Big prime p (private, less than q)
	 *	@param {BigInt} [data.q]	Big prime q (private)
	 *	@param {BigInt} [data.u]	Multiplicative inverse of p mod q (private)
	 */
	initialize: function(data) {
		data || (data = false);

		if (!data)
			return this;

		for (var attr in data)
			this[attr] = data[attr];
	},

	/**
	 *	Gets modulus n
	 *	@return {BigInt}
	 */
	get_modulus: function() { return this.n; },

	/**
	 *	Sets modulus n, return the instance.
	 *	@param {BigInt} n
	 *	@return {RSAKey}
	 */
	set_modulus: function(n) { this.n = n; return this; },

	/**
	 *	Gets public exponent e
	 *	@return {BigInt}
	 */
	get_exponent_public: function() { return this.e; },

	/**
	 *	Sets public exponent e, return the instance.
	 *	@param {BigInt} e
	 *	@return {RSAKey}
	 */
	set_exponent_public: function(e) { this.e = e; return this; },

	/**
	 *	Gets private exponent d
	 *	@return {BigInt}
	 */
	get_exponent_private: function() { return this.d; },

	/**
	 *	Sets private exponent d, return the instance.
	 *	@param {BigInt} d
	 *	@return {RSAKey}
	 */
	set_exponent_private: function(d) { this.d = d; return this; },

	/**
	 *	Gets private large prime p
	 *	@return {BigInt}
	 */
	get_p: function() { return this.p; },

	/**
	 *	Sets private large prime p, return the instance.
	 *	@param {BigInt} p
	 *	@return {RSAKey}
	 */
	set_p: function(p) { this.p = p; return this; },

	/**
	 *	Gets private large prime q
	 *	@return {BigInt}
	 */
	get_q: function() { return this.q; },

	/**
	 *	Sets private large prime q, return the instance.
	 *	@param {BigInt} q
	 *	@return {RSAKey}
	 */
	set_q: function(q) { this.q = q; return this; },

	/**
	 *	Gets private multiplicative inverse of p (mod q)
	 *	@return {BigInt}
	 */
	get_u: function() { return this.q; },

	/**
	 *	Sets multiplicative inverse of p (mod q). Returns the instance.
	 *	@param {BigInt} u
	 *	@return {RSAKey}
	 */
	set_u: function(u) { this.u = u; return this; },

	/**
	 *	Alias for {@link RSAKey#get_exponent_public}
	 */
	get_e: this.get_exponent_public,

	/**
	 *	Alias for {@link RSAKey#set_exponent_public}
	 */
	set_e: this.set_exponent_public,

	/**
	 *	Alias for {@link RSAKey#get_exponent_private}
	 */
	get_d: this.get_exponent_private,

	/**
	 *	Alias for {@link RSAKey#set_exponent_private}
	 */
	set_d: this.set_exponent_private,

	// RA NOTE ~ This won't be useful until I release full OpenPGP data format support ;)
	/*
	populate_public: function()
	{
		var	n	= this.binary_io().shift_mpi();
		var	e	= this.binary_io().shift_mpi();

		this.debug_write('    RSAKey.n: '+n.toString());
		this.debug_write('    RSAKey.e: '+e.toString());
		this.debug_write('    buffer is empty? '+this.binary_io().is_buffer_empty());

		this.set({
			n: n,
			e: e
		});

		return this;
	},

	populate_secret: function(options)
	{
		options || (options = {});

		if (options.encrypted)
		{
			this.debug_write('    RSAKey secret data is encrypted! Storing encrypted buffer...');
			this.set({encrypted_secret_field_data: this.binary_io().dump_buffer()});
			return this;
		}

		try
		{
			var d	= this.binary_io().shift_mpi();
			var p	= this.binary_io().shift_mpi();
			var q	= this.binary_io().shift_mpi();
			var u	= this.binary_io().shift_mpi();
		}
		catch(err)
		{
			throw new Error('Unable to decrypt private key with the given passphrase!');	
		}

		if (!this.binary_io().is_buffer_empty() && this.get('checksum_type') == 'sha1')
		{
			var secret_checksum = this.binary_io().shift_binary(20);
			var _io	= new BinaryIO();
			_io.to_binary(d);
			_io.to_binary(p);
			_io.to_binary(q);
			_io.to_binary(u);
			var _plaintext_sha1 = new sha1().hash(_io.get_buffer(), {return_binstring: true});
			this.debug_write('    Encrypted Checksum:    ', convert.binstring_to_hex(secret_checksum));
			this.debug_write('    Actual Checksum:       ', convert.binstring_to_hex(_plaintext_sha1));

			if (_plaintext_sha1 != secret_checksum)
				throw new Error('Unable to decrypt private key with the given passphrase!');	
		}
		else if (!this.binary_io().is_buffer_empty() && this.get('checksum_type') == 'simple')
			throw new Error('RA TODO ~ Support simple secret key data checksum type.');
		else
			var secret_checksum = '';

		var secret_data = {
			d: d,
			p: p,
			q: q,
			u: u,
			secret_checksum: secret_checksum
		};
		this.set(secret_data);

		this.debug_write('    RSAKey secret data (lol turn off debug mode):', secret_data);

		return this;
	},

	get_public_binary: function(options)
	{
		options || (options = {});

		if (options.init_io)
			this.init_binary_io();

		this.binary_io().to_binary(this.get('n'));
		this.binary_io().to_binary(this.get('e'));

		return this.binary_io().get_buffer();
	},

	get_encrypted_secret_data: function()
	{
		return this.get('encrypted_secret_field_data');
	}
	*/
});

/**
 *	@class
 *	@classdesc				Implements PKCS1 v1.5 encoding and decoding (as specified in RFC-4880). Used to "pad"
 *							plaintext out to the bitlength of the key modulus.
 *	@desc					Creates a new PKCS1 v1.5 coder
 */
var PKCS1_v1_5 = new Class(
/** @lends PKCS1_v1_5.prototype */
{
	/**
	 *	Performs the PKCS1 v1.5 encoding process for a given plaintext with a public key
	 *
	 *	@param {String} plaintext	ASCII-encoded binary string plaintext
	 *	@param {RSAKey} key			RSA Key with public fields
	 *	@return {String}			ASCII-encoded binary string, encoded text
	 */
	encode: function(plaintext, key)
	{
		var _bigint			= new BigInt();
		var n				= key.get_modulus();
		var keylen			= _bigint.bitSize(n);
		var k				= Math.ceil(keylen / 8);
		var target_length	= k - plaintext.length - 3;

		if (plaintext.length > k - 11)
			throw new Error('Message too long (limit for this key is '+(k-11)+' bytes lol');

		var rand = new Uint8Array(2*k);
		window.crypto.getRandomValues(rand);

		var ps = '';

		for (var i = 0; i < rand.length && ps.length < target_length; i++)
			if (rand[i] != 0)
				ps += String.fromCharCode(rand[i]);
		
		if (ps.length != target_length)
			throw new Error('Random padding string length didn\'t hit target. Ain\'t that a bitch.');

		var output_str = String.fromCharCode(0) + String.fromCharCode(2) + ps + String.fromCharCode(0) + plaintext;

		return output_str;
	},

	/**
	 *	Performs the PKCS1 v1.5 decoding process for a string
	 *
	 *	@param {String} encoded_text	ASCII-encoded binary string encoded text
	 *	@return {String}				ASCII-encoded binary string decoded text
	 */
	decode: function(encoded_text)
	{
		// RA HACK ~ BigInt.js library is cutting off leading zero.
		// Assuming the second octet is 2 will have to suffice for now.
		if (encoded_text.charCodeAt(0) != 0)
			encoded_text = String.fromCharCode(0) + encoded_text;

		if (encoded_text.charCodeAt(0) != 0 || encoded_text.charCodeAt(1) != 2)
			throw new Error('Plaintext decode failure. Possible decrpytion error (bad key?)');

		for (var i = 2; i < encoded_text.length; i++)
			if (encoded_text.charCodeAt(i) == 0)
				break;

		var decoded_text = encoded_text.substr(i+1);

		return decoded_text;
	}
})
