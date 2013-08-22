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