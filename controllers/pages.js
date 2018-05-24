var PagesController = Composer.Controller.extend({

	current: null,
	preserve: false,

	init: function()
	{
	},

	load: function(controller_class, params, options)
	{
		params || (params = {});
		options || (options = {});

		var main_sel = turtl.main_container_selector;

		this.trigger('start');
		if(!options.force_reload && this.is(controller_class))
		{
			this.trigger('refresh');
			this.get_subcontroller('sub').trigger('page:refresh');
			return;
		}

		var content = null;
		if(options.slide)
		{
			var sub = this.get_subcontroller('sub');
			var sub_parent = sub.el.getParent();
			content = new Element('div').adopt(sub.el).get('html');
			sub_parent.adopt(sub.el);
		}

		setTimeout(function() {
			var scroll = $('wrap').scrollTop;
			this.trigger('prerelease', options);
			var controller = this.track_subcontroller('sub', function() {
				if(!params.inject) params.inject = main_sel;
				return new controller_class(params);
			});
			this.trigger('load', controller, options);

			if(options.slide) this.slide_content(content, options.slide, scroll);
		}.bind(this), 5);
	},

	slide_content: function(content, slide, scroll)
	{
		if(!content) return false;

		var main_sel = turtl.main_container_selector;
		var main = document.getElement(main_sel);

		document.body.addClass('page-slide');
		var newtop = -scroll;
		var tmp = new Element('div#tmp-slide')
			.setStyles({top: newtop})
			.set('html', content);
		tmp.inject(main, 'before');

		tmp.setStyles({transition: 'none',}).setStyles({left: '0%'});
		main.setStyles({transition: 'none'})
			.setStyles({left: slide == 'left' ? '100%' : '-100%'});
		(function() {
			tmp.setStyles({transition: ''})
				.setStyles({left: slide == 'left' ? '-100%' : '100%'});
			main.setStyles({transition: ''})
				.setStyles({left: ''});
			(function() {
				document.body.removeClass('page-slide');
				tmp.destroy();
			}).delay(500, this);
		}).delay(0, this);
	},

	is: function(types)
	{
		var sub = this.get_subcontroller('sub');
		if(!Array.isArray(types)) types = [types];
		for(var i = 0; i < types.length; i++)
		{
			var type = types[i];
			if(sub instanceof type) return true;
		}
		return false;
	},

	release_sub: function()
	{
		var sub = this.get_subcontroller('sub');
		if(sub) sub.release();
	}
});

