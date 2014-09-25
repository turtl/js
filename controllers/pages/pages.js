var PagesController = Composer.Controller.extend({

	current: null,

	init: function()
	{
	},

	load: function(obj, options)
	{
		options || (options = {});

		this.trigger('prerelease', options);
		this.track_subcontroller('sub', function() {
			return obj;
		});
		this.trigger('load', obj, options);
	}
});
