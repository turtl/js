var Feedback = Composer.Model.extend({
	base_url: '/feedback',

	save: function(options)
	{
		return turtl.api.post(this.get_url(), this.toJSON(), options).bind(this)
			.then(function(data) {
				this.set(data);
			});
	}
});

