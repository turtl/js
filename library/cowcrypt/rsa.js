var RSA = new Class({

	encode_mode: null,

	initialize: function()
	{
		this.encode_mode = PKCS1_v1_5;
	},

	encrypt: function(plaintext, key, options)
	{
		options || (options = {});
		options.return_format || (options.return_format = 'binary');

		var _bigint = new BigInt();

		// first perform padding
		var padded = new this.encode_mode().encode(plaintext, key);

		// turn our padded value into a bigint
		var big = crypto_math.binstring_to_bigint(padded);

		// encrypt it
		big = _bigint.powMod(big, key.get_exponent_public(), key.get_modulus());
		
		if (options.return_format == 'bigint')
			return big;

		return crypto_math.bigint_to_binstring(big);
	},

	decrypt: function(ciphertext, key)
	{
		var _bigint		= new BigInt();

		var big			= crypto_math.binstring_to_bigint(ciphertext);

		// decrypt it
		big				= _bigint.powMod(big, key.get_exponent_private(), key.get_modulus());

		// convert to a binstring
		var binstring	= crypto_math.bigint_to_binstring(big);

		// remove padding
		binstring		= new this.encode_mode().decode(binstring);

		return binstring;
	},

	debug_mode: true

});

var RSAKey	=	new Class({

	// public fields
	n: 0,
	e: 0,

	// secret fields
	d: 0,
	p: 0,
	q: 0,
	u: 0,
	encrypted_secret_field_data: '',
	secret_checksum: '',
	checksum_type: 'sha1',	// sha1 | simple	

	debug_mode: true,

	initialize: function(data) {
		data || (data = false);

		if (!data)
			return this;

		for (var attr in data)
			this[attr] = data[attr];
	},

	get_modulus: function()
	{
		return this.n;
	},

	get_exponent_public: function()
	{
		return this.e;
	},

	get_exponent_private: function()
	{
		return this.d;
	},

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

});

var PKCS1_v1_5 = new Class({
	encode: function(text, key)
	{
		var _bigint			= new BigInt();
		var n				= key.get_modulus();
		var keylen			= _bigint.bitSize(n);
		var k				= Math.ceil(keylen / 8);
		var target_length	= k - text.length - 3;

		if (text.length > k - 11)
			throw new Error('Message too long (limit for this key is '+(k-11)+' bytes lol');

		var rand = new Uint8Array(2*k);
		window.crypto.getRandomValues(rand);

		var ps = '';

		for (var i = 0; i < rand.length && ps.length < target_length; i++)
			if (rand[i] != 0)
				ps += String.fromCharCode(rand[i]);
		
		if (ps.length != target_length)
			throw new Error('Random padding string length didn\'t hit target. Ain\'t that a bitch.');

		var output_str = String.fromCharCode(0) + String.fromCharCode(2) + ps + String.fromCharCode(0) + text;

		return output_str;
	},

	decode: function(text)
	{
		// RA HACK ~ BigInt.js library is cutting off leading zero.
		// Assuming the second octet is 2 will have to suffice for now.
		if (text.charCodeAt(0) != 0)
			text = String.fromCharCode(0) + text;

		if (text.charCodeAt(0) != 0 || text.charCodeAt(1) != 2)
			throw new Error('Plaintext decode failure. Possible decrpytion error (bad key?)');

		for (var i = 2; i < text.length; i++)
			if (text.charCodeAt(i) == 0)
				break;

		text = text.substr(i+1);

		return text;
	}
})