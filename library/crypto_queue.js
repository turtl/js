"use strict";

(function() {
	this.CryptoQueue = function(options)
	{
		options || (options = {});
		var queue = new Queue(function(task, done) {
			var action = task.action;
			var key = task.key;
			var data = task.data;
			var private_fields = task.private_fields;
			var rawdata = task.rawdata;

			// generate a random seed for sjcl
			var seed = new Uint32Array(32);
			window.crypto.getRandomValues(seed);

			var worker = new Worker(window._base_url + '/library/tcrypt.thread.js');

			switch(action)
			{
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
					cmd: 'encrypt+hash',
					args: [
						key,
						enc_data,
						{
							// can't use window.crypto (for random IV), so generate IV here
							iv: tcrypt.iv(),
							utf8_random: tcrypt.random_number()
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
						log.error('tcrypt.thread: err: ', res);
						return {error: {res: res, stack: e.stack}};
					}
					// TODO: uint8array?
					var enc = tcrypt.words_to_bin(res.data.c);
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
						log.error('tcrypt.thread: err: ', res, e.stack);
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
			worker.postMessage(wmsg);
			worker.addEventListener('message', function(e) {
				try
				{
					var res = completefn(e);
				}
				catch(err)
				{
					res = {error: {res: res, data: err.message, stack: err.stack}}
				}
				worker.terminate();
				done(res);
			}.bind(this));
		}, options.workers || 4);
		this.push = queue.push;
	};
}).apply((typeof exports != 'undefined') ? exports : this);

