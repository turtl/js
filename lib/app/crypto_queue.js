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
				this.worker = new Worker(window._base_url + '/lib/app/tcrypt.thread.js');
			}
			var action = task.action;
			var args = task.args;

			switch(action)
			{
			case 'ping':
				return done(null, {pong: task.name});
				break;
			default:
				var wmsg = {
					cmd: action,
					args: args,
				};
				var completefn = function(e)
				{
					var res = e.data;
					if(res.type != 'success')
					{
						log.error('tcrypt.thread: err: ', res, e.stack);
						return {error: {res: res, stack: e.stack}};
					}

					if(action == 'encrypt') res.data = {c: res.data, h: null};
					return {success: res.data};
				};
				break;
			}

			var worker = this.worker;
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
			worker.postMessage(wmsg);
		}, num_workers);
		this.push = queue.push;
	};
}).apply((typeof exports != 'undefined') ? exports : this);

