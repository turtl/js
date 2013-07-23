var TagItemController = Composer.Controller.extend({
	tag: 'li',

	events: {
		'click': 'select_tag'
	},

	model: null,

	init: function()
	{
		if(!this.model) return false;
		this.model.bind('change', this.render.bind(this), 'tag:item:change:render');
		this.model.bind('gray', this.render.bind(this), 'tag:item:gray:render');
		this.render();
	},

	release: function()
	{
		this.model.unbind('change', 'tag:item:change:render');
		this.model.unbind('gray', 'tag:item:gray:render');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('tags/item', {
			tag: toJSON(this.model)
		});
		this.html(content);

		var cls = '';
		if(this.model.get('selected')) cls = 'sel';
		if(this.model.get('excluded')) cls = 'exclude';
		if(this.model.get('disabled')) cls += ' disabled';

		this.el.className = cls;
	},

	select_tag: function(e)
	{
		if(e) e.stop();

		var exclude = e.control;

		if(this.model.get('selected', false))
		{
			this.model.unset('selected');
		}
		else if(this.model.get('excluded', false))
		{
			this.model.unset('excluded');
		}
		else
		{
			if(exclude)
			{
				this.model.set({excluded: true});
			}
			else
			{
				this.model.set({selected: true});
			}
		}
	}
});
