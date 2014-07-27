var Feedback = Composer.Model.extend({
	base_url: '/feedback',

	defaults: {
		email: null,
		body: null
	},

	initialize: function()
	{
		// don't use the local DB for feedback!
		this.sync = api_sync;

		return this.parent.apply(this, arguments);
	}
});
