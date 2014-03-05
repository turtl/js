importScripts(
	'./mootools-core-1.4.5-server.js',
	'./sjcl.js',
	'./tcrypt.js' 
);

// we need CBC for backwards compat
sjcl.beware['CBC mode is dangerous because it doesn\'t protect message integrity.']();

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
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		res	=	{type: 'error', data: e.message, trace: stack};
	}

	if(!res) res = {type: 'null'};
	else if(!res.type) res = {type: 'success', data: res};

	self.postMessage(res);
	self.close();
});

