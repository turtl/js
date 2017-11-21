CoreComm.adapters.websocket = Composer.Event.extend({
	options: {
		endpoint: 'ws://127.0.0.1:7472',
	},

	conn: null,

	initialize: function(options) {
		options || (options = {});
		Object.keys(options).forEach(function(key) {
			this.options[key] = options[key];
		}.bind(this));
		this.reconnect();
	},

	close: function() {
		if(this.conn) {
			['onopen', 'onclose', 'onerror', 'onmessage'].forEach(function(k) {
				this.conn[k] = null;
			}.bind(this));
			this.conn.close();
		}
		this.conn = null;
	},

	reconnect: function() {
		this.close();
		this.conn = new WebSocket(this.options.endpoint);
		this.conn.onopen = function() {
			this.trigger('connected', true);
		}.bind(this);
		this.conn.onclose = function() {
			this.trigger('connected', false);
			this.trigger('reset');
			this.reconnect();
		}.bind(this);
		this.conn.onerror = function(err) {
			this.trigger('error', err);
		}.bind(this);
		this.conn.onmessage = function(msg_ws) {
			this.trigger('message', msg_ws.data);
		}.bind(this);
	},

	send: function(msg) {
		this.conn.send(msg);
	},
});

