var BinaryIO = new Class({

	defaults: {
		buffer: '',
		parsed_packets: []
	},

	debug_mode: true,

	/**
	 * -------------------------------------------------------
	 * READING METHODS (Remove data from buffer)
	 * -------------------------------------------------------
	 */

	/**
	 *	Decode OpenPGP binary data
	 */
	parse_packets: function()
	{
		this.debug_write('Parsing binary packets!');
		while (!this.is_buffer_empty())
		{
			var parsed = this.shift_packet();
			if (parsed)
			{
				this.get('parsed_packets').push(parsed);
			}
		}
		return this.get('parsed_packets');
	},

	/**
	 *	Pulls the first packet off our binary buffer and parses it into a model
	 */
	shift_packet: function()
	{
		var i		= 0;
		var buffer	= this.get('buffer');
		var code	= buffer.charCodeAt(i++);

		this.debug_write('------------------------------------------');
		this.debug_write('code: '+code.toString(2));

		// Sanity check: The first (leftmost) bit of the packet header needs to be 1.
		if ((code >> 7) != 1)
			throw new Error('Unreadable packet header! Expected first bit to be 1, got 0');

		// Check for new vs. old format packet type (the second bit indicates this)
		var packet_type = ((code >> 6) & 1);

		if (packet_type == 1)
		{
			throw new Error('RA TODO ~ No support for new format packets yet');
		}
		else
		{
			// The packet tag in an old format packet is the next 4 bits after the type bit
			var packet_tag 	= (code >> 2) & 15;

			// The length type in an old format packet is the last two bits of the first byte
			var length_type	= code & 3;

			switch (length_type)
			{
				// Length type of 0: the packet length is encoded in one byte
				case 0:
					var packet_length	=	buffer.charCodeAt(i++);
					break;
				// Length type of 1: the packet length is encoded in two bytes
				case 1:
					var packet_length	=	(buffer.charCodeAt(i++) << 8)
											| buffer.charCodeAt(i++);
					break;
				// Length type of 2: the packet length is encoded in four bytes
				case 2:
					var packet_length	=	(buffer.charCodeAt(i++) << 24)
											| (buffer.charCodeAt(i++) << 16)
											| (buffer.charCodeAt(i++) << 8)
											| buffer.charCodeAt(i++);
					break;
				case 3:
					throw new Error('RA TODO ~ No support for indeterminate packet lengths');
			}
		}
		// Isolate the binary string for the packet body
		var packet_body = this.shift_binary(i + packet_length).substr(i);

		this.debug_write('Packet tag: '+packet_tag);
		this.debug_write('Length type: '+length_type);
		this.debug_write('Length: '+packet_length+'; (as binary: '+packet_length.toString(2)+')');

		// Initialize our model variable, this MAY be populated down the line
		var model = null;

		switch (packet_tag)
		{
			case _CNST_PACKET_SECRET_KEY:
				this.debug_write('5: Secret Key packet');
				model = new SecretKey();
				break;
			case _CNST_PACKET_PUBLIC_KEY:
				this.debug_write('6: Public Key packet');
				model = new PublicKey();
				break;
			case _CNST_PACKET_USER_ID:
				this.debug_write('13: User ID Packet');
				model = new UserID();
				break;
			case _CNST_PACKET_SIGNATURE:
				this.debug_write('2: Signature Packet');
				model = new Signature();
				break;
			default:
				this.debug_write('Unsupported packet tag');
				break;
		}
		if (model)
			model.populate_from_binary(packet_body);

		return model;
	},

	/**
	 *	Clears the buffer, returning whatever data was in it
	 */
	dump_buffer: function()
	{
		var buffer = this.get('buffer');
		this.set({buffer: ''});

		return buffer;
	},

	/**
	 *	Dumps the buffer to an integer array
	 */
	buffer_to_int_array: function(size)
	{
		size || (size = 1);

		var arr = [];

		while (!this.is_buffer_empty())
		{
			arr.push(this.shift_integer(size));
		}
		return arr;
	},

	/**
	 *	Slices n bytes of raw binary off the buffer and returns it
	 */
	shift_binary: function(bytes)
	{
		bytes || (bytes = 1);

		var data = this.get('buffer').substr(0, bytes);
		this.set({buffer: this.get('buffer').substr(bytes)});

		return data;
	},

	/**
	 *	Slices an integer of n bytes (up to 4, default 1) off the binary data
	 */
	shift_integer: function(bytes)
	{
		bytes || (bytes = 1);

		var integer	= 0;

		while (bytes--)
		{
			integer = integer | (this.get('buffer').charCodeAt(0) << (bytes*8));
			this.shift_binary(1);
		}
		return integer;
	},

	/**
	 *	Slices an MPI off the binary data, after computing its length
	 */
	shift_mpi: function()
	{
		var len = this.shift_integer(2);
		var hex = this.shift_hex(Math.ceil(len / 8));
		
		return BigInteger.parse(hex);
	},

	/**
	 *	Slices n bytes off the binary data, returns a hex string
	 */
	shift_hex: function(bytes, options)
	{
		options || (options = {});
		typeof options.hex_prefix != 'undefined' || (options.hex_prefix = true);

		bytes || (bytes = 1);

		var hex = '';

		while (bytes--)
		{
			hex += this.format_hex(this.get('buffer').charCodeAt(0), {hex_prefix: false});
			this.shift_binary(1);
		}
		return (options.hex_prefix ? '0x' : '')+hex.toLowerCase();
	},

	/**
	 * -------------------------------------------------------
	 * WRITING METHODS (Add data to buffer)
	 * -------------------------------------------------------
	 */
	to_binary: function(data, options)
	{
		options || (options = {});
		options.from_hex || (options.from_hex = false);

		// If this is string data, then this is easy
		if (typeof data == 'string')
		{
			if (!options.from_hex)
				this.push_to_buffer(data);
			else
				this.to_binary(convert.hex_to_binstring(data));
		}
		// If it has something called toJSValue then this is an MPI (of class BigInteger)
		else if (typeof data.toJSValue != 'undefined')
		{
			var mpi_base_2 	= data.toString(2);
			var mpi_length	= mpi_base_2.length;

			// Write the MPI length to the buffer
			this.to_binary(mpi_length, {bytes: 2});

			// If necessary, pad out our base-2 representation to have a mod 8 number of bits
			for (i=0; mpi_base_2.length % 8 != 0; i++)
				var mpi_base_2 = '0' + mpi_base_2;

			while (mpi_base_2.length)
			{
				// this.debug_write('            binary: ',mpi_base_2.substr(0,8), '; int: ', parseInt(mpi_base_2.substr(0,8), 2));
				this.push_to_buffer(String.fromCharCode(parseInt(mpi_base_2.substr(0,8), 2)));
				mpi_base_2 = mpi_base_2.substr(8);
			}
		}
		// Otherwise an integer, assuming 1 bytes unless options.bytes is passed in
		else
		{
			options.bytes || (options.bytes = 1);

			if (options.bytes > 4 || options.bytes < 1)
				throw new Error('Invalid value for options.bytes (' + options.bytes+ ')! Unable to convert to binary.');

			var i = options.bytes;
			while (i--)
			{
				this.push_to_buffer(String.fromCharCode(((data>>(i*8))&255)));
			}
		}
		return this.get('buffer');
	},

	/**
	 *	Adds arbitrary data to the buffer
	 */
	push_to_buffer: function(data)
	{
		this.set({buffer: this.get('buffer') + data});

		return data;
	},

	/**
	 *	Sets the buffer from some arbitrary data
	 */
	set_buffer: function(data)
	{
		this.set({buffer: data});
		
		return this;
	},

	/**
	 * -------------------------------------------------------
	 * HELPER METHODS (Useful across the board)
	 * -------------------------------------------------------
	 */

	/**
	 *	Simply gets the buffer. Useful for passing the buffer between models.
	 */
	get_buffer: function()
	{
		return this.get('buffer');
	},

	/**
	 *	Checks to see if there is remaining data in our buffer
	 */
	is_buffer_empty: function()
	{
		return this.get('buffer').length == 0;
	},

	/**
	 *	Formats a number into hexadecimal octets
	 *	The leftmost octet is expressed with a leading 0 if necessary
	 */
	format_hex: function(integer, options)
	{
		options || (options = {});
		typeof options.hex_prefix != 'undefined' || (options.hex_prefix = true);

		var char_code = integer.toString(16);
		if (char_code.length % 2 == 1)
			char_code = '0'+char_code;

		return (options.hex_prefix ? '0x' : '') + char_code;			
	},

	/**
	 *	Compares two binary buffers via debug output, squawking when differences arise
	 */
	debug_compare: function(bin1, bin2)
	{
		this.debug_write('***');
		this.debug_write('* binary comparison');
		this.debug_write('***');

		if (bin1.length > bin2.length)
			var biggest = bin1;
		else
			var biggest = bin2;

		for (i=0; i<biggest.length; i++)
		{
			var _debug_str	= 	'';
			var _char_1 	= 	bin1.charCodeAt(i);
			var _char_2 	= 	bin2.charCodeAt(i);

			_debug_str += 'bin1['+i+']: ' + _char_1 + '; bin2['+i+']: ' + _char_2;
			if (_char_1 != _char_2)
				_debug_str += ' <------- DIFFERENT!!!';

			this.debug_write(_debug_str);
		}
		this.debug_write('***');
	}
});

var BinarySubpacketIO = Composer.Model.extend({

	Extends: BinaryIO,

	defaults: {
		parent_model: null,
		parsed_subpackets: []
	},

	debug_mode: true,

	/**
	 *	Decode binary subpacket data
	 */
	parse_subpackets: function()
	{
		var i = 0;
		while (this.get('buffer').length && i < 1000)
		{
			var parsed = this.shift_subpacket();
			if (parsed)
			{
				this.get('parsed_subpackets').push(parsed);
			}
			i++;
		}
		return this.get('parsed_subpackets');
	},

	/**
	 *	Pulls the first subpacket off our binary buffer and parses it into a model
	 */
	shift_subpacket: function()
	{
		var i				= 0;
		var buffer			= this.get('buffer');
		var first			= buffer.charCodeAt(i++);
		var parent_model	= this.get('parent_model');

		this.debug_write('        ----');

		if (first < 192)
		{
			var subpacket_length 	= first;
		}
		else if (first >= 192 && first < 255)
		{
			var subpacket_length 	= ((first - 192) << 8) + (buffer.charCodeAt(i++)) + 192;
		}
		else
		{
			var subpacket_length	=	(buffer.charCodeAt(i++) << 24)
										| (buffer.charCodeAt(i++) << 16)
										| (buffer.charCodeAt(i++) << 8)
										| buffer.charCodeAt(i++);
		}
		var subpacket 				= this.shift_binary(i + subpacket_length).substr(i);
		var subpacket_type			= subpacket.charCodeAt(0);
		var subpacket_body			= subpacket.substr(1);

		this.debug_write('        SUBPACKET type value: ', subpacket_type);
		this.debug_write('        SUBPACKET subpacket_body.length: ', subpacket_body.length);
		
		switch (subpacket_type)
		{
			case 2:
				var subpacket_name = 'Signature Creation Time';
				parent_model.set_creation_time(subpacket_body, {from_binary: true});
				break;
			case 11:
				var subpacket_name = 'Preferred Symmetric Algorithms';
				parent_model.set_pref_symmetric_algorithms(subpacket_body, {from_binary: true});
				break;
			case 16:
				var subpacket_name = 'Issuer';
				parent_model.set_issuer(subpacket_body, {from_binary: true});
				break;
			case 21:
				var subpacket_name = 'Preferred Hash Algorithms';
				parent_model.set_pref_hash_algorithms(subpacket_body, {from_binary: true});
				break;
			case 22:
				var subpacket_name = 'Preferred Compression Algorithms';
				parent_model.set_pref_compress_algorithms(subpacket_body, {from_binary: true});
				break;
			case 27:
				var subpacket_name = 'Key Flags';
				parent_model.set_key_flags(subpacket_body, {from_binary: true});
				break;
			case 30:
				var subpacket_name = 'Features';
				parent_model.set_features(subpacket_body, {from_binary: true});
				break;
			case 23:
				var subpacket_name = 'Key Server Preferences';
				parent_model.set_key_server_prefs(subpacket_body, {from_binary: true});
				break;
		}
		this.debug_write('        SUBPACKET name: ', subpacket_name);

		return 'foo';
	},

});