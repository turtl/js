var TagitTips = new Class({
	Extends: Tips,

	initialize: function(selector, options)
	{
		var elements = selector;
		if(typeOf(selector) == 'string')
		{
			elements = document.getElements(selector);
		}
		elements.each(function(el) {
			var title = el.get('title');
			var split = title.split(/ *:: */);
			if(split.length > 1)
			{
				el.store('tip:title', split[0]);
				el.store('tip:text', split[1]);
			}
		});
		this.parent.apply(this, arguments);
	}
});
