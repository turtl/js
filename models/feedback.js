var Feedback = Composer.Model.extend({
	save: function(options) {
		return turtl.core.send('feedback:send', this.toJSON());
	}
});

