describe('Protected model', function() {
	var Base = Protected.extend({
		public_fields: [
			'id',
			'name'
		],
		private_fields: [
			'text',
			'tags'
		]
	});

	turtl.profile = new Profile();
	var keychain = turtl.profile.get('keychain');

	// replace our sync so it's mem-only (no IDB)
	var sync;
	beforeAll(function() {
		sync = Composer.sync;
		Composer.sync = function(method, model, options)
		{
			if(options.success) options.success();
		};
	});
	afterAll(function() {
		Composer.sync = sync;
	});

	it('generates and/or ensures existence of keys', function() {
		var base = new Base();

		expect(base.key).toBe(null);

		var key = base.generate_key();
		expect(Array.isArray(key)).toBe(true);
		expect(base.key).toBe(key);

		var base2 = new Base();
		base2.create_or_ensure_key();
		var key2 = base2.key;
		base2.create_or_ensure_key();
		var key3 = base2.key;

		expect(key2).toBe(key3);
	});

	it('encrypts/decrypts models', function(done) {
		var base = new Base({
			id: 6969,
			name: 'andrew',
			text: 'this will be encrypted',
			tags: 'dogs,chairs,yachts,etc'
		});

		var key = base.generate_key();

		base.serialize()
			.then(function(data) {
				var enc = data[0];
				var keys = Object.keys(enc).sort().join(',');
				expect(keys).toBe(['body', 'id', 'name'].join(','));
				return enc;
			})
			.then(function(enc) {
				var base2 = new Base(enc);
				base2.key = key;
				return base2.deserialize();
			})
			.then(function(data) {
				expect(data.text).toBe('this will be encrypted');
				expect(data.tags).toBe('dogs,chairs,yachts,etc');
			})
			.finally(done);
	});

	it('returns only private/body fields with safe_json()', function(done) {
		var base = new Base({
			id: 123,
			name: 'cwarrrrll',
			text: 'how many more lies must we listen to',
			tags: 'zombies,punks'
		});

		expect(JSON.stringify(base.safe_json())).toBe('{"id":123,"name":"cwarrrrll"}');

		var body = null;
		base.generate_key();
		base.serialize()
			.then(function() {
				body = base.safe_json().body;
			})
			.finally(function() {
				expect(typeof body).toBe('string');
				done();
			});
	});

	it('generates subkeys and finds it\'s decrypting key(s) properly', function() {
		var key = tcrypt.random_key();
		var parent = new Base({id: 1});
		var child = new Base({id: 2});
		parent.key = key;
		keychain.add_key(parent.id(), 'board', parent.key);

		child.generate_key();
		var childkey = child.key;
		child.generate_subkeys([ {b: parent.id(), k: parent.key} ]);

		child.key = null;

		var parent_key = keychain.find_key(parent.id());
		var found = child.find_key(undefined, {b: [{id: parent.id(), k: parent_key}]});
		expect(tcrypt.to_base64(found)).toBe(tcrypt.to_base64(childkey));
	});
});

