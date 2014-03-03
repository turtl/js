importScripts(
	'./mootools-core-1.4.5-server.js',
	'./sjcl.js',
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
			case 'encrypt+hash':
				var enc		=	tcrypt.encrypt(key, data, options);
				var hash	=	tcrypt.hash(enc);
				res			=	{c: enc, h: hash};
				break;
			case 'decrypt':
				res	=	tcrypt.decrypt(key, data, options);
				break;
			case 'hash':
				res	=	tcrypt.hash(data);
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

