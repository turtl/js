"use strict";

(function() {
	this.CryptoQueue = function(options)
	{
		options || (options = {});
		var num_workers = options.workers || 4;
		var datafn = options.data || false;

		var queue = new Queue(function(task, done) {
			if(!this.worker)
			{
				this.worker = new Worker(window._base_url + '/library/tcrypt.thread.js');
			}
			var action = task.action;
			var key = task.key;
			var data = task.data;
			var private_fields = task.private_fields;
			var rawdata = task.rawdata;
			var iv = task.iv;
			var utf8_random = task.utf8_random;

			// generate a random seed for sjcl
			var seed = new Uint32Array(32);
			window.crypto.getRandomValues(seed);

			switch(action)
			{
			case 'ping':
				return done(null, {pong: task.name});
				break;
			case 'encrypt+hash':
			case 'encrypt':
				// if we only have 1 (one) private field, forgo JSON serialization and
				// instead just encrypt that field directly.
				if(rawdata)
				{
					var enc_data = data[private_fields[0]];
				}
				else
				{
					var enc_data = JSON.stringify(data);
				}

				var wmsg = {
					cmd: action,
					args: [
						key,
						enc_data,
						{
							// can't use window.crypto (for random IV), so generate IV here
							iv: iv || tcrypt.iv(),
							utf8_random: utf8_random || tcrypt.random_number()
						}
					],
					seed: seed
				};
				var completefn = function(e)
				{
					var res = e.data;
					if(res.type != 'success')
					{
						var enc = false;
						log.error('tcrypt.thread: err: ', res, e.stack);
						return {error: {res: res, stack: e.stack}};
					}

					// if we didn't hash, return the standard response with null
					// for hash
					if(action == 'encrypt') res.data = {c: res.data, h: null};

					if(rawdata)
					{
						var enc = new Uint8Array(sjcl.codec.bytes.fromBits(res.data.c));
					}
					else
					{
						var enc = tcrypt.words_to_bin(res.data.c);
					}
					var hash = res.data.h;

					return {success: [enc, hash]};
				};
				break;
			case 'decrypt':
				var wmsg = {
					cmd: 'decrypt',
					args: [key, data],
					seed: seed
				};
				var completefn = function(e)
				{
					var res = e.data;
					if(res.type != 'success')
					{
						var dec = false;
						log.error('tcrypt.thread: err: ', res);
						return {error: {res: res, stack: e.stack}};
					}
					// if we only have one private field, assume that field was
					// encrypted *without* JSON serialization (and shove it into a
					// new object)
					if(rawdata)
					{
						var dec = {};
						dec[private_fields[0]] = res.data;
					}
					else
					{
						var dec = JSON.parse(res.data);
					}

					return {success: dec};
				};
				break;
			}

			// if we have less than 128kb, run the crypto sync
			if(data.length < (1024 * 128))
			{
				var cmd = wmsg.cmd;
				var args = wmsg.args;
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

				setTimeout(function() {
					var res;
					try
					{
						switch(action)
						{
						case 'encrypt+hash':
							var enc = run_cmd('encrypt');
							var hash = tcrypt.hash(enc);
							res = {c: enc, h: hash};
							break;
						default:
							res = run_cmd(cmd);
							break;
						}
						if(!res) res = {type: 'null'};
						else res = {type: 'success', data: res};
						res = {data: res};
						res = completefn(res);
					}
					catch(err)
					{
						log.error('tcrypt.sync: err: ', res, derr(err));
						res = {type: 'error', data: err.message, trace: err.stack};
						res = {data: res};
						res = completefn(res);
					}
					done(null, res);
				});
			}
			// data is largish, might block interface. run this in a worker
			else
			{
				var worker = this.worker;
				worker.postMessage(wmsg);
				var msgfn = function(e)
				{
					worker.removeEventListener('message', msgfn);
					try
					{
						var res = completefn(e);
					}
					catch(err)
					{
						res = {error: {res: res, data: err.message, stack: err.stack}}
					}
					done(null, res);
				}.bind(this);
				worker.addEventListener('message', msgfn);
			}

		}, num_workers);
		this.push = queue.push;
	};
}).apply((typeof exports != 'undefined') ? exports : this);

