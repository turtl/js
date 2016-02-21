describe('Crypto Queue', function() {
	var cqueue = new CryptoQueue({ workers: 2 });

	var key = tcrypt.random_key();
	var fixed_key = [2143256563, 1329631755, 742972362, -327359185, -11986550, 1799223242, 518990185, 1055896715];
	var fixed_iv = [-1303834133, 822992659, 104404935, 633932547];
	var fixed_utf8 = 0.8186410083013217;

	var testdata = {
		id: '69696969',
		title: 'my file',
		data: atob(data_img1_base64)
	};

	it('accepts and replies to messages', function(done) {
		cqueue.push({action: 'ping', name: 'sandra'}, function(err, res) {
			expect(err).toBe(null);
			expect((res || {}).pong).toBe('sandra');
			done();
		});
	});

	it('encrypts/decrypts data < 128kb', function(done) {
		var slice = testdata.data.substr(0, 4096);
		var msg = {
			action: 'encrypt',
			key: key,
			data: {
				id: testdata.id,
				title: testdata.title,
				data: slice
			},
			private_fields: ['title', 'data']
		};
		cqueue.push(msg, function(err, res) {
			var enc = ((res || {}).success || [])[0];
			expect(err).toBe(null);
			expect(typeof enc).toBe('string')
			expect(enc.length).toBeGreaterThan(4096);
			expect(enc.length).toBeLessThan(10000);

			msg.action = 'decrypt';
			msg.data = enc;
			cqueue.push(msg, function(err, res) {
				var dec = (res || {}).success;
				expect(err).toBe(null);
				expect(dec.title).toBe(testdata.title);
				expect(dec.data).toBe(slice);
				done();
			});
		});
	});

	it('encrypts/decrypts data >= 128kb', function(done) {
		var msg = {
			action: 'encrypt',
			key: key,
			data: testdata,
			private_fields: ['title', 'data']
		};
		cqueue.push(msg, function(err, res) {
			var enc = ((res || {}).success || [])[0];
			expect(err).toBe(null);
			expect(typeof enc).toBe('string')
			expect(enc.length).toBeGreaterThan(testdata.data.length);

			msg.action = 'decrypt';
			msg.data = enc;
			cqueue.push(msg, function(err, res) {
				var dec = (res || {}).success;
				expect(err).toBe(null);
				expect(dec.title).toBe(testdata.title);
				expect(dec.data).toBe(testdata.data);
				done();
			});
		});
	});

	it('handles encrypting/hashing/decrypting raw data (file data) correctly', function(done) {
		var msg = {
			action: 'encrypt+hash',
			// (----
			// use fixed values here so we can predict the hash outcome
			key: fixed_key,
			iv: fixed_iv,
			utf8_random: fixed_utf8,
			// )----
			data: testdata,
			private_fields: ['data'],
			rawdata: true
		};
		cqueue.push(msg, function(err, res) {
			var enc = ((res || {}).success || [])[0];
			var hash = ((res || {}).success || [])[1];
			expect(err).toBe(null);
			// make sure encrypting rawdata only adds a few bytes (since we don't
			// json encode or anything)
			expect(Math.abs(enc.length - testdata.data.length)).toBeLessThan(64);
			expect(hash).toBe('ac5b3138922ade7ceb1eaa908f857b38a4cc5e0dddebebdaa2e72164be52c0bf');

			msg.action = 'decrypt';
			msg.data = enc;
			cqueue.push(msg, function(err, res) {
				var dec = (res || {}).success;
				expect(err).toBe(null);
				expect(dec.data).toBe(testdata.data);
				done();
			});
		});
	});
});

