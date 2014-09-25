var PairingController = Composer.Controller.extend({
	public_key: null,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var pubkey = tcrypt.to_hex(tcrypt.key_to_bin(this.public_key));
		var content = Template.render('pairing/index', {
			public_key: pubkey
		});
		this.html(content);
		if(window.port) window.port.send('resize');
	}
});

