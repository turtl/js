var UserJoinController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm'
	},

	events: {
		'submit form': 'do_join'
	},

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('users/join');
		this.html(content);
	},

	do_join: function(e)
	{
		if(e) e.stop();
	}
});
