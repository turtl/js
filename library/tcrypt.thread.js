importScripts(
	'./mootools-core-1.4.5-server.js',
	'./cowcrypt/convert.js',
	'./cowcrypt/crypto_math.js',
	'./cowcrypt/biginteger.js',
	'./cowcrypt/block_cipher.js',
	'./cowcrypt/hasher.js',
	'./cowcrypt/sha.js',
	'./cowcrypt/hmac.js',
	'./cowcrypt/aes.js',
	'./cowcrypt/rsa.js',
	'./cowcrypt/pbkdf2.js',
	'./tcrypt.js' 
);

self.addEventListener('message', function(e) {
	var cmd		=	e.data.cmd;
	var key		=	e.data.key;
	var data	=	e.data.data;
	var options	=	e.data.options || {};
	var res		=	null;
	try
	{
		switch(cmd)
		{
			case 'encrypt':
				res	=	tcrypt.encrypt(key, data, options);
				break;
			case 'decrypt':
				res	=	tcrypt.decrypt(key, data, options);
				break;
		}
	}
	catch(e)
	{
		res	=	{type: 'error', data: e.message};
	}

	if(!res) res = {type: 'null'};
	else if(!res.type) res = {type: 'success', data: res.toString()};

	self.postMessage(res);
	self.close();
});

