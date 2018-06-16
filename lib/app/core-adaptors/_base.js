var CoreComm = Composer.Event.extend({
	options: {},

	adapter: null,
	next_msg_id: 1,

	resmap: {},
	connected: false,

	initialize: function(adapter, options) {
		options || (options = {});
		Object.keys(options).forEach(function(key) {
			this.options[key] = options[key];
		}.bind(this));

		if(!CoreComm.adapters[adapter]) {
			throw new Error('CoreComm.adapters['+adapter+'] is missing, so core cannot be initialized.');
		}
		this.adapter = new CoreComm.adapters[adapter](options);

		this.adapter.bind('error', this.trigger.bind(this, 'error'));
		this.adapter.bind('connected', function(connstatus) {
			this.connected = connstatus;
			this.trigger('connected', connstatus);
		}.bind(this));
		this.adapter.bind('message', function(msg_json) {
			try {
				var msg = JSON.parse(msg_json);
			} catch(e) {
				this.trigger('error', e);
				return;
			}
			var id = msg.id;
			if(id) {
				var mapped = this.resmap[id.toString()];
				delete this.resmap[id];
				if(mapped) {
					if(msg.e === 0) {
						mapped.resolve(msg.d);
					} else {
						mapped.reject(msg.d);
					}
				} else {
					this.trigger('error', {missing_handler: id});
				}
			} else {
				this.trigger('event', msg.e, msg.d);
			}
		}.bind(this));
		this.adapter.bind('reset', function() {
			Object.keys(this.resmap).forEach(function(k) {
				var mapped = this.resmap[k];
				if(mapped.reject) { mapped.reject({closed: true}); }
			}.bind(this));
		}.bind(this));
	},

	get_next_id: function() {
		return (this.next_msg_id++).toString();
	},

	send: function() {
		var args = Array.prototype.slice.call(arguments, 0);
		return new Promise(function(resolve, reject) {
			if(!this.connected) throw new Error('not connected');
			var msg_id = this.get_next_id();
			if(this.resmap[msg_id]) throw new Error('re-used msg id: '+msg_id);
			this.resmap[msg_id] = {resolve: resolve, reject: reject};
			this.adapter.send(JSON.stringify([msg_id.toString()].concat(args)));
		}.bind(this));
	},
});
CoreComm.adapters = {};


