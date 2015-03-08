"use strict";

(function() {
	this.Queue = function(worker, concurrency)
	{
		var self = this;
		var tasks = [];
		var id = 1;

		var workers = [];
		for(var i = 0; i < concurrency; i++)
		{
			workers.push(worker.bind({id: i + 1}));
		}

		var notify = function()
		{
			if(workers.length == 0) return;
			run_worker();
		};

		var run_worker = function()
		{
			var task = tasks.shift();
			if(!task) return;
			var worker = workers.shift();
			var complete = function(res)
			{
				workers.push(worker);
				if(task.complete) task.complete(res);
				notify();
			};
			setTimeout(function() { worker(task.task, complete); });
		};

		this.push = function(task, complete)
		{
			tasks.push({id: id++, task: task, complete: complete});
			notify();
		};
	};
}).apply((typeof exports != 'undefined') ? exports : this);

