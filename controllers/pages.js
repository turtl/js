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
		var main = document.getElement(main_sel);

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
			content = sub.el;
			sub.el = new Element('div');
			console.log('content: ', content);
		}

		var scroll = $('wrap').scrollTop;
		this.trigger('prerelease', options);
		var controller = this.track_subcontroller('sub', function() {
			if(!params.inject) params.inject = main_sel;
			return new controller_class(params);
		});
		this.trigger('load', controller, options);

		if(options.slide) this.slide_content(content, options.slide, scroll);
	},

	slide_content: function(content, slide, scroll)
	{
		if(!content) return false;

		var main_sel = turtl.main_container_selector;
		var main = document.getElement(main_sel);

		document.body.addClass('page-slide');
		var maintop = parseInt(main.getStyle('top'));
		var newtop = maintop - scroll;
		var tmp = new Element('div#tmp-slide')
			.setStyles({top: newtop});
		content.inject(tmp);
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

	is: function(type)
	{
		return this.get_subcontroller('sub') instanceof type;
	},

	release_sub: function()
	{
		var sub = this.get_subcontroller('sub');
		if(sub) sub.release();
	}
});
