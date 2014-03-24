importScripts(
	'./sjcl.js',
	'./tcrypt.js' 
);

// we need CBC for backwards compat
sjcl.beware['CBC mode is dangerous because it doesn\'t protect message integrity.']();

self.addEventListener('message', function(e) {
	var cmd		=	e.data.cmd;
	var args	=	e.data.args;
	var seed	=	e.data.seed;
	var res		=	null;
	try
	{
		if(seed)
		{
			sjcl.random.addEntropy(seed, 1024, "crypto.getRandomValues");
		}

		var run_cmd	=	function(cmd)
		{
			var parts	=	cmd.split('.');
			// only hardcode two levels deep
			if(parts.length == 1)
			{
				var fn	=	tcrypt[parts[0]];
			}
			else if(parts.length == 2)
			{
				var fn	=	tcrypt[parts[0]][parts[1]];
			}

			return fn.apply(tcrypt, args);
		};

		switch(cmd)
		{
			case 'encrypt+hash':
				var enc		=	run_cmd('encrypt');
				var hash	=	tcrypt.hash(enc);
				res			=	{c: enc, h: hash};
				break;
			default:
				res	=	run_cmd(cmd);
				break;
		}
	}
	catch(e)
	{
		var stack = e && e.stack && e.stack.replace(/^[^\(]+?[\n$]/gm, '')
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

