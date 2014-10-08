var PagesController = Composer.Controller.extend({

	current: null,

	init: function()
	{
	},

	load: function(controller_class, params, options)
	{
		params || (params = {});
		options || (options = {});

		var main_sel = turtl.main_container_selector;
		var main = document.getElement(main_sel);

		var content = null;
		if(options.slide)
		{
			var sub = this.get_subcontroller('sub');
			content = sub.el;
			sub.el = new Element('div');
		}

		this.trigger('prerelease', options);
		var controller = this.track_subcontroller('sub', function() {
			if(!params.inject) params.inject = main_sel;
			return new controller_class(params);
		});
		this.trigger('load', controller, options);

		if(options.slide) this.slide_content(content, options.slide);
	},

	slide_content: function(content, slide)
	{
		if(!content) return false;

		document.body.addClass('page-slide');
		var tmp = new Element('div#tmp-slide');
		content.inject(tmp);
		tmp.inject(main, 'before');

		tmp.setStyles({transition: 'none',}).setStyles({left: '0%'});
		main.setStyles({transition: 'none'})
			.setStyles({left: slide == 'left' ? '100%' : '-100%'});
		(function() {
			tmp.setStyles({transition: ''})
				.setStyles({left: slide == 'left' ? '-100%' : '100%'});
			main.setStyles({transition: ''})
				.setStyles({left: '0%'});
			(function() {
				document.body.removeClass('page-slide');
				tmp.destroy();
			}).delay(500, this);
		}).delay(0, this);
	},

	is: function(type)
	{
		return this.get_subcontroller('sub') instanceof type;
	}
});
