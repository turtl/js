var tcrypt = {
	// NOTE: completely unused
	cipher: 'AES',

	TagitFormatter: {
		stringify: function (cipherParams) {
			// create json object with ciphertext
			var jsonObj = {
				ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
			};

			// optionally add iv and salt
			if (cipherParams.iv) {
				jsonObj.iv = cipherParams.iv.toString();
			}
			if (cipherParams.salt) {
				jsonObj.s = cipherParams.salt.toString();
			}

			// stringify json object
			return JSON.stringify(jsonObj);
		},

		parse: function (jsonStr) {
			// parse json string
			var jsonObj = JSON.parse(jsonStr);

			// extract ciphertext from json object, and create cipher params object
			var cipherParams = CryptoJS.lib.CipherParams.create({
				ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
			});

			// optionally extract iv and salt
			if (jsonObj.iv) {
				cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
			}
			if (jsonObj.s) {
				cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
			}

			return cipherParams;
		}
	},

	encrypt: function(key, data)
	{
		return CryptoJS.AES.encrypt(data, key, {
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.AnsiX923,
			format: tcrypt.TagitFormatter
		});
	},

	decrypt: function(key, encrypted, options)
	{
		options || (options = {});
		var de = CryptoJS.AES.decrypt(encrypted, key, {
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.AnsiX923,
			format: tcrypt.TagitFormatter
		});
		if(options.raw) return de;
		return CryptoJS.enc.Utf8.stringify(de);
	},

	hash: function(data, options)
	{
		options || (options = {});
		var hash = CryptoJS.SHA256(data);
		if(options.raw) return hash;
		return CryptoJS.enc.Hex.stringify(hash);
	}
};
