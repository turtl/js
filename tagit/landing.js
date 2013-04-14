var MusioLandingInviteController = Composer.Controller.extend({
	el: 'div.invite',

	events: {
		'submit form': 'submit'
	},

	elements: {
		'input[type=text]': 'invite_code'
	},

	submit: function(e)
	{
		if(e) e.stop();

		var code	=	this.invite_code.value;
		Cookie.write('musio:invite', code, {duration: 86400});
		window.location	=	new String(window.location).replace(/\?.*/, '');
	}
});

