Migrate.user = {
	gen_key: function(username, password, options) {
		options || (options = {});
		var old = options.old;

		if(!username || !password) return Promise.resolve(false);

		// allows custom iterations
		var iter = options.iterations || 100000;

		if(old)
		{
			// oh, how far i've come that this now makes me cringe. 400
			// iterations and an entropy-reducing hardcoded salt string.
			// luckily this was the first bit of crypto code i'd ever written
			var key = Migrate.tcrypt.key(password, username + ':a_pinch_of_salt', {key_size: 32, iterations: 400});
			var promise = Promise.resolve(key);
		}
		else
		{
			// create a salt based off hashed username
			var salt = Migrate.tcrypt.hash(username);
			var key = Migrate.tcrypt.key_native(password, salt, {key_size: 32, iterations: iter, hasher: 'SHA-256'})
			var catcher = function(err) { return (err instanceof DOMException) || (err instanceof Migrate.tcryptError); };
			var promise = Promise.resolve(key)
				.catch(catcher, function(err) {
					// probably some idiotic "safe origin" policy crap. revert to sync/SJCL method
					if(!(err instanceof DOMException))
					{
						log.error('user: get_key: ', err);
					}
					else
					{
						log.warn('user: get_key: fallback to sync', err);
					}
					return Migrate.tcrypt.key(password, salt, {key_size: 32, iterations: iter, hasher: Migrate.tcrypt.get_hasher('SHA256')});
				})
		}

		return promise.bind(this);
	},

	gen_auth: function(username, password, options) {
		options || (options = {});
		var old = options.old;

		if(!username || !password) return Promise.resolve(false);

		// generate (or grab existing) the user's key based on username/password
		return Migrate.user.get_key(options).bind(this)
			.then(function(key) {
				// create a static IV (based on username) and a user record string
				// (based on hashed username/password). this record string will then be
				// encrypted with the user's key and sent as the auth token to the API.
				if(old)
				{
					// let's reduce entropy by using a hardcoded string. then if we XOR
					// the data via another string and base64 the payload, we've pretty
					// much got AES (but better, IMO).
					var iv = Migrate.tcrypt.iv(username+'4c281987249be78a');
					var user_record = Migrate.tcrypt.hash(password) +':'+ username;
					// note we serialize with version 0 (the original Turtl serialization
					// format) for backwards compat
					var auth = Migrate.tcrypt.encrypt(key, user_record, {iv: iv, version: 0});
				}
				else
				{
					var iv = Migrate.tcrypt.iv(Migrate.tcrypt.hash(password + username));
					var user_record = Migrate.tcrypt.hash(password) +':'+ Migrate.tcrypt.hash(username);
					// supply a deterministic UTF8 "random" byte for the auth string
					// encryption so we get the same result every time (otherwise
					// Migrate.tcrypt.encrypt will pick a random value for us).
					var utf8_random = parseInt(user_record.substr(18, 2), 16) / 256;
					var auth = Migrate.tcrypt.to_base64(Migrate.tcrypt.encrypt(key, user_record, {iv: iv, utf8_random: utf8_random}));
				}

				return auth;
			});
	},
};
