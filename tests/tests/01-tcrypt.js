describe('Tcrypt', function() {
	var static_iv = tcrypt.from_base64('Eev+3eO2/zY0T4Lxwz71Xg==');
	var static_utf8_random = 6;
	var static_key = tcrypt.from_base64('xoPRf1z2+3/0tQ+uBT1W8enUVBpAJxuZPuEBTiJ1WX8=');
	var static_payload_ascii = 'This is a very basic ascii payload';
	var static_payload_ascii_enc = atob('AAUCAAER6/7d47b/NjRPgvHDPvVe811KIYhDkS3ChwfS6L4oftlRGcL2iDtvX4kAMz8QuXN+eNMPPflSbmRa+9Y2hnhuMQvH');
	var static_payload_binary = atob('O+SRCDyyiGoGD3Z/DDXURmf7pqPFjJpI1ZdqZUNnfJbOtdivJoJiGJb51hUGnDJEcSDI+ByiaNW2pSwbSv3meTTw393wDm49');
	var static_payload_binary_enc = atob('AAUCAAER6/7d47b/NjRPgvHDPvVe8zLG2fNfStaI4CjS8sBkiv1XkQ02bdaGdDX+eSoyp2OH1wLL/S6eVuGzuQ/bRtaqOXOQrxVRlEAn4Y73xy6MxvZz85cx5KifaQeIlsuA9aKRoju6IscaAe4=');

	var v1_enc = 'YArZh1OUVoqJ8Zv2T9Pbuhy0vUZxClg5kDD+1NPXI/dhhoZ0zENh+CAtBQSe1TPvJKFMxQTB/nR0H7BJx9qFr+XYXzs7j7IlIsw4wlpLBuqU/LlweRaL2xN1vBjX2nCIyfuKSVh7xNPPVN6kcW8eq6BtKzvxrsAdDzw5eRrzIj1tu1yum/u6JKRV3uUlElUm3JM2BxDFW4nRjxVu7kw9M6NgHP7kxx2/KkiSI1fgxTwrgvKXkqB0THUGZO77nxHMek8SrBcFyqhh7gOGOzi6vym5iY1II+FV4t5exPL8UpO0mOF9Pv4vjPwRjiBehO/P:idf602b21e0b2972ef6e085afc8313677';

	it('generates random values (basic test)', function() {
		var data1 = tcrypt.random_bytes(42);
		var data2 = tcrypt.random_bytes(42);

		expect(data1).not.toBe(data2);
	});

	it('encrypts data deterministically', function() {
		var enc_ascii = tcrypt.encrypt(static_key, static_payload_ascii, {iv: static_iv, utf8_random: static_utf8_random});
		var enc_binary = tcrypt.encrypt(static_key, static_payload_binary, {iv: static_iv, utf8_random: static_utf8_random});

		var enc_ascii_base64 = tcrypt.to_base64(enc_ascii);
		var enc_binary_base64 = tcrypt.to_base64(enc_binary);

		expect(enc_ascii_base64).toBe(btoa(static_payload_ascii_enc));
		expect(enc_binary_base64).toBe(btoa(static_payload_binary_enc));
	});

	it('decrypts data deterministically', function() {
		var dec_ascii = tcrypt.decrypt(static_key, static_payload_ascii_enc);
		var dec_binary = tcrypt.decrypt(static_key, static_payload_binary_enc);

		expect(dec_ascii).toBe(static_payload_ascii);
		expect(dec_binary).toBe(static_payload_binary);
	});

	it('decrypts v0 serializations', function() {
		var note_key = tcrypt.from_base64('P63fsgyP/ENrGjlc7cGouqHF2L8iLzWFiVLRgotQGNE=');
		var note_body = 'fftMNo2u6SrbWUUkAfdXd5jbPCgwBxU1zxHhswjyP/a29Er2UAQuPB/5vuGiP+BP/y/LhyKYOpSyfoRe1DmSmDcu2wAotL1YjVfnbPGcqWySZLieTy8d1YHQcQdZbzJ8yWB0UIG3bcnCyXFePGcJUjpOmK0Rh/K8W5Igqi83FrMF9PqMrtl0kSsYsgTXj+aXtSvLE/KXWi+8mAYThTlKQYsnTRcsK+dL5Pnm8zN1qog=:i2fce93ed94567693abc153e2f7e848c5';

		var deserialized = tcrypt.deserialize(note_body);
		expect(deserialized.version).toBe(0);

		var note = tcrypt.decrypt(note_key, note_body);
		note = JSON.parse(note);
		expect(note.title).toBe('Low-code usability testing');
	});

	it('decrypts v3 serializations', function() {
		var note_key = tcrypt.from_base64('w4rCkcKdIsOUw7gsW8KNEcKDwojDucO6QGlQFsKodMOSw4LDrDwtWScBw4toDsOO');
		var note_body = atob('AAM4LcFXh/5/OhZQnCzMKxNxY6pDB8BRNPiej8gcf/L4PAQAAAAAGsG0SsIdljWxpgrAXjWMinlzU/aJ52ShTGKzZskBuKCNLLbQuX6TfCi+1NFEABg5Epaf2NZcL4KSVEXP5Q+02jdhBasq83ALqTpzADQg2qNsKLtW9lSHdQ1JDvIrp4HqixySjzbU8FTJeIVhHqS2EUzPxlj+XXaNpDN7p9d7eMMdZasPl2BaxuBDMk/0BY0XC1P8Q/gLSJ7Z3QQdqiR8ecYhx4ISHdpXCCPRR/MhrwPZ0y0/8tVkmyTk1vSlTlamJ0bDMys1sbhWWryxO+T9rVwLYjA2yssBvGDyS2tqmJJgsALOARKgL/74yT1ddqley7Wh0JZMKlExu3z3sF/9TabcVf8/uvgldgso2QyuyNSXpBzODnPeQ6Hb3h4Sud4PauCEUpFLupQRJEeVFmh7Y2IBP96bY+hl9fe1mDG0bhCtPhib3FuugA9fLvp6f6xVzvsgDbDM3HgcHBo8+GuSUNsFS4c7Grpr9WCsUBXV5hS+K2EOjbb4z1h9fLclQ81gnqNS2IRyRTOgli6tcom7P1c+WM7MsdJVSv+jlPd8RJMZ4/LMUdYZJvc9/tkO6fiBzHg/7ixt0Tsh4EKC7+Y2UlvRXOG+MORpAlyQygWewglZ8QQK4bRRl2wFxoVh4a1JVxnjTvqktvq0ySnr9UBryxmfVsEOR4XTnDzjTkjMEDYLK59nVbcaRaYV3TpCBVgTCIlXfoBXd20hOkigp60fAZB0j7iCOK5/5lw141it5dRCul6FbytZmccLQ+WIDQvq');

		var deserialized = tcrypt.deserialize(note_body);
		expect(deserialized.version).toBe(3);

		var note = tcrypt.decrypt(note_key, note_body);
		note = JSON.parse(note);
		expect(note.title).toBe('MaKey MaKey: An Invention Kit for Everyone by Jay Silver — Kickstarter');
	});

	it('decrypts v4 serializations', function() {
		var note_key = tcrypt.from_base64('rYMgzeHsjMupzeUvqBpbsDRO1pBk/JWlJp9EHw3yGPs=');
		var note_body = atob('AAQRk+ROrg4uNqRIwlAJrPOlTupLliAXexfnZpBt2nsCAAQAAAAA8PxvFb3rlGm50n75m4q7aLkif54G7BMiK1cqOAgKIziV7cN3Hyq+d2DggAkpSjnfcJXDDi60SGM+y0kjLUWOIuq0QVOFVF+c9OlhL6eQ5NsgYAr2ElUatg7jwufGbbCS93vItWssCJ3M5h2PTtaHTLtxhI0IrThkqeQYkV7bvK5tKOvo60Vc4pZ0LdAKfulIp3DJ0tmC15Nab2QVNDrQ35WB0tXZIBnloLIG0AkrBZYE+ig7cYK24QM52Z2sPSSQB33cKVe7U4OOZuS4rXBc1xwAhWKom9NZSMTYg6Ke69H4ZZTILZkkW4Qkgt+yIIJf');

		var deserialized = tcrypt.deserialize(note_body);
		expect(deserialized.version).toBe(4);

		var note = tcrypt.decrypt(note_key, note_body);
		note = JSON.parse(note);
		expect(note.title).toBe('M-Seven - Electronic Flip - YouTube');
	});

	it('decrypts v5 serializations', function() {
		var note_key = tcrypt.from_base64('+f86++9Q/jtDqWy/zgKe0fPRHOfruLLPzM/ksv5I9TY=');
		var note_body = atob('AAUCAAHIhrZD2XoOC7gUkSOuqvPADqblx/ohCKxKTFcbKCJSNqHzlXGNLPv2X7gdyM0RgtOOo+s0I/jr41SMwfV7XrFezt3aQk6AvB6fFINnLogNApGrAJ2Ki9gi3BQ61Qcmks0srS3lb6iG5YKR5SXNMfANKx+0/sHYoCu8Tx00RI23HVMrbs1gZCo+ey7xOP9tlKFOftfIg8V9dCmLnDvzf04JRs5q3SsJi1Yt6WfWYyCsx5cwkOGLB1bUxieyRE4z9TKkVn8zrJusYCQa/Qj3YEHOPowBW3sWXhaSm9MynmIquUv/IgkGyR3sYKQXy1OKJX4ou3FBNX4GPQWTw7VV2YlDvVNl/TQYEQqtfT0P/P1slGZJwEGUEVmvqNv09fu7IqvEeX9STzfrW5aR6oeT53KSELaL5kbeq19/NxaAvSeG1gDTxM5e111/xLtTetJ0X4+a8BJcFQ/FChqOtAHMhCYYqlhOF2LoPwecVQ9G1dTYY89pLA==');

		var deserialized = tcrypt.deserialize(note_body);
		expect(deserialized.version).toBe(5);

		var note = tcrypt.decrypt(note_key, note_body);
		note = JSON.parse(note);
		expect(note.title).toBe('Open-Sourcing My Gambit Scheme iOS Game from 2010');
	});

	it('decrypts encrypted data at the current version', function() {
		var img = atob(data_img1_base64);
		var key = tcrypt.random_key();

		var enc = tcrypt.encrypt(key, img);
		var dec = tcrypt.decrypt(key, enc);

		expect(dec).toBe(img);
	});

	it('hashes things properly', function() {
		var str = 'a string to hash';
		var hash = tcrypt.hash(str);

		expect(hash).toBe('187c7a6cd902bc520f03015550d735a8e24f00f888c0328c9b6bcbd2d7c90cf7');
	});

	it('generates keys', function(done) {
		var generated = 'QGEW+Fj/XAuVHuMuVEh9he5djNNJbviPP+p5sX1wLLw=';
		var salt = tcrypt.hash('im bringin em beef and its not the meat from a cow');
		var password = 'jolly good';
		var key1 = tcrypt.key(password, salt, {key_size: 32, iterations: 8000, hasher: tcrypt.get_hasher('SHA256')});
		expect(tcrypt.to_base64(key1)).toBe(generated);

		var keypromise = tcrypt.key_native(password, salt, {key_size: 32, iterations: 8000, hasher: 'SHA-256'});
		var key2 = null;
		Promise.resolve(keypromise)
			.then(function(_key2) {
				key2 = tcrypt.to_base64(_key2);
			})
			.finally(function() {
				expect(key2).toBe(generated);
				done();
			});
	});
});
