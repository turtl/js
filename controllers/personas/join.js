var PersonasJoinController = PersonasEditController.extend({
	formclass: 'user-persona-join',
	buttons: false,

	in_modal: false,

	init: function()
	{
		if(turtl.profile.get('personas').size() > 0) return turtl.route('/');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		turtl.push_title(i18next.t('Add a persona'));
		this.bind('release', turtl.pop_title.bind(null, false));

		this.html(view.render('personas/join', {
			persona: this.model.toJSON()
		}));
		(function() {
			this.inp_email.focus();
		}.delay(300, this));
	},

	submit: function(e)
	{
		this.parent.apply(this, arguments)
			.then(function() {
				barfr.barf(i18next.t('Your public persona has been created!'));
				turtl.route('/');
			});
	}
});

