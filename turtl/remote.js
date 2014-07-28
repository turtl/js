var RemoteHandler = Composer.Event.extend({
	// stores the comm object used to send messages
	comm: null,

	// stores request -> response mappings (via uuid matching)
	reqres: {},

	/**
	 * latch our comm and listen for incoming core events
	 */
	initialize: function(port)
	{
		this.comm = port.comm;
		this.comm.bind('core-recv', this.recv.bind(this), port.ctx);
	},

	/**
	 * send an outbound event.
	 */
	send: function(evname, data, options)
	{
		options || (options = {});

		var id = uuid();
		var ev = {id: id, ev: evname, data: data};
		if(options.success || options.error || options.complete)
		{
			this.reqres[id] = function(ev)
			{
				if(ev.ev == 'error')
				{
					if(options.error) options.error(ev);
				}
				else
				{
					if(options.success) options.success(ev);
				}
				if(options.complete) options.complete(ev);
			};
		}
		this.comm.trigger('core-send', ev);
	},

	/**
	 * events receivable. if an event has a response function associated with it
	 * then run that function, otherwise just broadcast the event on the entire
	 * object (anyone can listen).
	 */
	recv: function(ev)
	{
		var id = ev.id;
		var resfn = this.reqres[id];
		delete this.reqres[id];
		if(resfn)
		{
			// privately trigger the response fn
			resfn(ev);
		}
		else
		{
			// broadcast it
			this.trigger(ev.ev, ev.data);
		}
	}
});

