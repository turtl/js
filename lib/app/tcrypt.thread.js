importScripts(
	'../vnd/sodium.js',
	'./tcrypt.js' 
);

self.addEventListener('message', function(e) {
	var cmd = e.data.cmd;
	var args = e.data.args;
	var res = null;
	var transfer = [];
	try
	{
		var run_cmd = function(cmd)
		{
			var parts = cmd.split('.');
			// only hardcode two levels deep
			if(parts.length == 1)
			{
				var fn = tcrypt[parts[0]];
			}
			else if(parts.length == 2)
			{
				var fn = tcrypt[parts[0]][parts[1]];
			}

			return fn.apply(tcrypt, args);
		};
		res = run_cmd(cmd);
		if(res instanceof Uint8Array) {
			transfer.push(res.buffer);
		}
	}
	catch(e)
	{
		var stack = e && e.stack && e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		res = {type: 'error', data: e.message, trace: stack};
	}

	if(!res) res = {type: 'null'};
	else if(!res.type) res = {type: 'success', data: res};

	self.postMessage(res, transfer);
	//self.close();
});

