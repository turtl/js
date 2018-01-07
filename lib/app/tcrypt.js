"use strict";
var tcrypt = {
	to_base64: function(arr) {
		return sodium.to_base64(arr);
	},

	from_base64: function(str) {
		return sodium.from_base64(str);
	},

	to_hex: function(bytes) {
		return sodium.to_hex(bytes)
	},

	from_hex: function(str) {
		return sodium.from_hex(str);
	},

	to_string: function(bytes) {
		return sodium.to_string(bytes);
	},

	from_string: function(str) {
		return sodium.from_string(str);
	},

	random_bytes: function(len) {
		var arr = new Uint8Array(len);
		window.crypto.getRandomValues(arr);
		return arr;
	},

	sha512: function(bytes) {
		return sodium.crypto_hash(bytes);
	},

	random_float: function() {
		var int_max = Math.pow(2, 32) - 1;
		var bytes = tcrypt.random_bytes(4);
		var u32 = new Uint32Array(bytes.buffer);
		return u32[0] / int_max;
	},
};

