"use strict";

(function() {
	this.Queue = function(worker, concurrency)
	{
		var self = this;
		var tasks = [];
		var active = 0;
		var id = 1;

		var notify = function()
		{
			if(active >= concurrency) return;
			run_worker();
		};

		var run_worker = function()
		{
			var task = tasks.shift();
			if(!task) return;
			var complete = function(res)
			{
				active--;
				if(task.complete) task.complete(res);
				notify();
			};
			active++;
			setTimeout(worker.bind(null, task.task, complete));
		};

		this.push = function(task, complete)
		{
			tasks.push({id: id++, task: task, complete: complete});
			notify();
		};

	};
}).apply((typeof exports != 'undefined') ? exports : this);

