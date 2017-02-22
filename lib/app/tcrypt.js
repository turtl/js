"use strict";

// define error(s) used by tcrypt
var extend_error = function(extend, errname)
{
	var err = function() {
		var tmp = extend.apply(this, arguments);
		tmp.name = this.name = errname;

		this.stack = tmp.stack
		this.message = tmp.message

		return this;
	};
	err.prototype = Object.create(extend.prototype, { constructor: { value: err } });
	return err;
}
var TcryptError = extend_error(Error, 'TcryptError');
var TcryptDataError = extend_error(TcryptError, 'TcryptDataError');
var TcryptAuthFailed = extend_error(TcryptError, 'TcryptAuthFailed');

var tcrypt = {
	// -------------------------------------------------------------------------
	// NOTE: never inject items into these lists. only append them!!!!
	// NOTE: these lists can only support 256 items each!!!!
	// -------------------------------------------------------------------------
	sym_algorithm: [
		'chacha20poly1305',
	],
	// -------------------------------------------------------------------------

	current_version: 6,		// current serialization version

	/**
	 * Given a serialization version and a payload description u8array, pull
	 * out any pertinant information (algorithm, etc).
	 */
	decode_description: function(_version, desc_bytes) {
		if(!(desc_bytes instanceof Uint8Array)) throw new TcryptDataError('tcrypt.decode_description() -- description bytes given was not a Uint8Array');
		if(desc_bytes.length < 1) throw new TcryptDataError('tcrypt.decode_description() -- bad description length (must be >= 1 byte(s))');
		var sym_algorithm_idx = desc_bytes[0];
		var algorithm = tcrypt.sym_algorithm[sym_algorithm_idx]
		if(!algorithm) throw new TcryptDataError('tcrypt.decode_description() -- bad algorithm index given in description ('+sym_algorithm_idx+')');
		return {
			algorithm: algorithm
		}
	},

	/**
	 * Given a serialization version and a set of information about how a
	 * payload is serialized, return a payload description string
	 */
	encode_description: function(_version, desc) {
		if(!desc || !desc.algorithm) {
			throw new TcryptDataError('tcrypt.encode_description() -- must provide an `algorithm` key in desc');
		}
		var sym_algorithm_idx = tcrypt.sym_algorithm.indexOf(desc.algorithm);
		if(sym_algorithm_idx < 0) throw new TcryptDataError('tcrypt.encode_description() -- unknown `algorithm` ('+desc.algorithm+')');
		var desc = new Uint8Array([sym_algorithm_idx]);
		return desc;
	},

	/**
	 * Deserialize a serialized cryptographic message. Basically, each piece of
	 * crypto data in Turtl has a header, followed by N bytes of ciphertext in
	 * the following format:
	 *
	 *   |-2 bytes-| |-1 byte----| |-N bytes-----------| |-1 byte-----| |-N bytes-| |-N bytes--|
	 *   | version | |desc length| |payload description| |nonce length| |  nonce  | |ciphertext|
	 *
	 * - `version` tells us the serialization version. although it will probably
	 *   not get over 255, it has two bytes just in case. never say never.
	 * - `desc length` is the length of the payload description, which may change
	 *   in length from version to version.
	 * - `payload description` tells us what algorithm/format the encryption uses.
	 *   This holds 1-byte array indexes for our crypto values (SYM_ALGORITHM),
	 *   which tells us the cipher, block mode, etc (and how to decrypt this data).
	 * - `nonce length` is the length of the nonce
	 * - `nonce` is the initial vector of the payload.
	 * - `ciphertext` is our actual encrypted data. DUUUuuuUUUHHH
	 */
	deserialize: function(msg_bytes) {
		if(!(msg_bytes instanceof Uint8Array)) throw new TcryptDataError('tcrypt.deserialize() -- message given was not a Uint8Array');
		var idx = 0;
		function get_bytes(len) {
			var bytes = msg_bytes.slice(idx, idx + len);
			idx += len;
			return bytes;
		}
		function get_byte() {
			var by = msg_bytes[idx];
			idx += 1;
			return by;
		}
		var version = (get_byte() << 8) + get_byte();
		var desc_length = get_byte();
		var desc_bytes = get_bytes(desc_length);
		var desc = tcrypt.decode_description(version, desc_bytes);
		var nonce_length = get_byte();
		var nonce = get_bytes(nonce_length);
		var ciphertext = msg_bytes.slice(idx);
		return {
			version: version,
			desc: desc,
			nonce: nonce,
			ciphertext: ciphertext,
		};
	},

	/**
	 * Given a payload object, serialize its header (mainly, everything before
	 * the ciphertext portion) as a byte array.
	 */
	serialize_header: function(payload_obj) {
		var version = payload_obj.version;
		var desc = payload_obj.desc;
		var nonce = payload_obj.nonce;

		if(!(nonce instanceof Uint8Array)) throw new TcryptDataError('tcrypt.serialize_header() -- payload_obj.nonce must be a Uint8Array');
		var desc_bytes = tcrypt.encode_description(version, desc);

		var idx = 0;
		var ser = new Uint8Array(2 + 1 + desc_bytes.length + 1 + nonce.length);
		function push_byte(by) {
			ser[idx] = by;
			idx += 1;
		}
		function push_bytes(bytes) {
			bytes.forEach(function(by) {
				ser[idx] = by;
				idx++;
			});
		}
		push_byte(version >> 8);
		push_byte(version & 255);
		push_byte(desc_bytes.length);
		push_bytes(desc_bytes);
		push_byte(nonce.length);
		push_bytes(nonce);
		return ser;
	},

	/**
	 * Serialize our encrypted data into the standard format (see the comments
	 * above the deserialize method).
	 */
	serialize: function(payload_obj)
	{
		var header = tcrypt.serialize_header(payload_obj);
		var ser = new Uint8Array(header.length + payload_obj.ciphertext.length);
		ser.set(header, 0);
		ser.set(payload_obj.ciphertext, header.length);
		return ser;
	},

	/**
	 * Decrypt data with key.
	 */
	decrypt: function(key, msg_bytes)
	{
		if(!(key instanceof Uint8Array)) throw new TcryptDataError('tcrypt.decrypt() -- key given was not a Uint8Array');
		if(!(msg_bytes instanceof Uint8Array)) throw new TcryptDataError('tcrypt.decrypt() -- message given was not a Uint8Array');
		var deserialized = tcrypt.deserialize(msg_bytes);
		var desc = deserialized.desc;
		var nonce = deserialized.nonce;
		var ciphertext = deserialized.ciphertext;
		var auth = tcrypt.serialize_header(deserialized);
		var decrypted;
		switch(desc.algorithm) {
			case 'chacha20poly1305':
				try {
					decrypted = sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, ciphertext, auth, nonce, key);
				} catch(e) {
					throw new TcryptAuthFailed('tcrypt.decrypt() -- either the key is invalid or this data has been tampered with');
				}
				break;
			default:
				throw new TcryptDataError('tcrypt.decrypt() -- unknown algorithm ('+desc.algorithm+')');
				break;
		}
		return decrypted;
	},

	/**
	 * Encrypt data with key.
	 */
	encrypt: function(key, plaintext_bytes, options)
	{
		options || (options = {});
		if(!(key instanceof Uint8Array)) throw new TcryptDataError('tcrypt.encrypt() -- key given was not a Uint8Array');
		if(!(plaintext_bytes instanceof Uint8Array)) throw new TcryptDataError('tcrypt.encrypt() -- plaintext given was not a Uint8Array');
		var version = tcrypt.current_version;
		var algorithm = options.algorithm || tcrypt.sym_algorithm[0];
		var nonce = options.nonce || null;
		if(nonce && !(nonce instanceof Uint8Array)) {
			throw new TcryptDataError('tcrypt.encrypt() -- given nonce must be a Uint8Array');
		}
		var build_payload_obj = function(nonce) {
			return {
				version: version,
				desc: {algorithm: algorithm},
				nonce: nonce,
			};
		};
		var encrypted;
		switch(algorithm) {
			case 'chacha20poly1305':
				if(!nonce) nonce = tcrypt.random_bytes(tcrypt.noncelen(algorithm));
				var payload_obj = build_payload_obj(nonce);
				var auth = tcrypt.serialize_header(payload_obj);
				payload_obj.ciphertext = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(plaintext_bytes, auth, null, nonce, key);
				encrypted = tcrypt.serialize(payload_obj);
				break;
			default:
				throw new TcryptDataError('tcrypt.encrypt() -- unknown algorithm ('+desc.algorithm+')');
				break;
		}
		return encrypted;
	},

	keylen: function(algorithm)
	{
		algorithm || (algorithm = 'chacha20poly1305');
		var len;
		switch(algorithm) {
			case 'chacha20poly1305':
				len = sodium.crypto_aead_chacha20poly1305_KEYBYTES;
				break;
			default:
				throw new TcryptDataError('tcrypt.keylen() -- invalid algorithm ('+algorithm+')');
				break;
		}
		return len;
	},

	noncelen: function(algorithm)
	{
		algorithm || (algorithm = 'chacha20poly1305');
		var len;
		switch(algorithm) {
			case 'chacha20poly1305':
				len = sodium.crypto_aead_chacha20poly1305_ietf_NPUBBYTES;
				break;
			default:
				throw new TcryptDataError('tcrypt.noncelen() -- invalid algorithm ('+algorithm+')');
				break;
		}
		return len;
	},

	keygen: function(password, salt, options)
	{
		options || (options = {});
		var algorithm = options.algorithm;	// used for keylen
		var cpu = options.cpu || sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE;
		var mem = options.mem || sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE;
		var saltlen = tcrypt.keygen_saltlen();
		if(salt.length != saltlen) {
			throw new TcryptDataError('tcrypt.keygen() -- salt len must be '+saltlen+' bytes (not '+salt.length+')');
		}
		var keylen = tcrypt.keylen(options.algorithm);
		return sodium.crypto_pwhash_scryptsalsa208sha256(keylen, password, salt, cpu, mem);
	},

	keygen_saltlen: function(seed)
	{
		return sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES;
	},

	hmac: function(key, data_bytes)
	{
		return sodium.crypto_auth(data_bytes, key);
	},

	/**
	 * double-hmac comparison
	 */
	secure_compare: function(bytes1, bytes2)
	{
		var key = tcrypt.random_bytes(sodium.crypto_auth_KEYBYTES);
		return tcrypt.to_base64(tcrypt.hmac(key, bytes1)) == tcrypt.to_base64(tcrypt.hmac(key, bytes2));
	},

	to_base64: function(arr)
	{
		return sodium.to_base64(arr);
	},

	from_base64: function(str)
	{
		return sodium.from_base64(str);
	},

	to_hex: function(bytes)
	{
		return sodium.to_hex(bytes)
	},

	from_hex: function(str)
	{
		return sodium.from_hex(str);
	},

	to_string: function(bytes)
	{
		return sodium.to_string(bytes);
	},

	from_string: function(str)
	{
		return sodium.from_string(str);
	},

	/**
	 * Given a binary key, convert to base64 string
	 */
	key_to_string: function(keywords)
	{
		return tcrypt.to_base64(keywords);
	},

	/**
	 * Given a Base64 encoded key, convert it to a binary key (keys MUST be in
	 * binary format when using tcrypt.encrypt/decrypt)
	 */
	key_from_string: function(base64key)
	{
		return tcrypt.from_base64(base64key);
	},

	random_bytes: function(len)
	{
		var arr = new Uint8Array(len);
		window.crypto.getRandomValues(arr);
		return arr;
	},

	random_key: function(algorithm)
	{
		var numbytes = tcrypt.keylen(algorithm);
		return tcrypt.random_bytes(numbytes);
	},

	sha512: function(bytes)
	{
		return sodium.crypto_hash(bytes);
	},

	random_float: function()
	{
		var int_max = Math.pow(2, 32) - 1;
		var bytes = tcrypt.random_bytes(4);
		var u32 = new Uint32Array(bytes.buffer);
		return u32[0] / int_max;
	},
};

tcrypt.asym = {
	current_version: 3,

	keygen: function()
	{
		var keys = sodium.crypto_box_keypair();
		return {
			type: keys.keyType,
			pubkey: keys.publicKey,
			privkey: keys.privateKey,
		};
	},

	decrypt: function(pubkey, privkey, msg_bytes)
	{
		var version = msg_bytes[0];
		var ciphertext = msg_bytes.slice(1);
		switch(version) {
			case 3:
				try {
					return sodium.crypto_box_seal_open(ciphertext, pubkey, privkey);
				} catch(e) {
					throw new TcryptAuthFailed('tcrypt.asym.decrypt() -- either the key is invalid or this data has been tampered with');
				}
				break;
			default:
				throw new TcryptDataError('tcrypt.asym.decrypt() -- bad asym version ('+version+')');
				break;
		}
	},

	encrypt: function(pubkey, message_bytes)
	{
		var enc = sodium.crypto_box_seal(message_bytes, pubkey);
		var ser = new Uint8Array(1 + enc.length);
		ser[0] = tcrypt.asym.current_version;
		ser.set(enc, 1);
		return ser;
	},
};

