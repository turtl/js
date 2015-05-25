"use strict";

(function() {
	this.Queue = function(workerfn, concurrency)
	{
		var self = this;
		var tasks = [];
		var id = 1;

		var workers = [];
		for(var i = 0; i < concurrency; i++)
		{
			// a "worker" is really just a context/state object
			workers.push({id: i + 1});
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
			var was_completed = false;		// prevents double-finishing
			var complete = function(res)
			{
				if(was_completed) return;
				was_completed = true;
				workers.push(worker);
				if(task.complete) task.complete(res);
				notify();
			};
			setTimeout(function() { workerfn.call(worker, task.task, complete); });
		};

		this.push = function(task, complete)
		{
			tasks.push({id: id++, task: task, complete: complete});
			notify();
		};
	};
}).apply((typeof exports != 'undefined') ? exports : this);

