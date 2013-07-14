var ConversationItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
	},

	events: {
		'click': 'select_conversation'
	},

	model: null,

	init: function()
	{
		if(!this.model) return false;
		this.render();
		this.model.bind(['personas', 'change'], this.render.bind(this), 'conversations:item:render');
	},

	release: function()
	{
		this.model.unbind(['personas', 'change'], 'conversations:item:render');
		this.unbind('select', 'conversations:item:select');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var personas		=	this.model.get('personas');
		var my_personas		=	personas.select({mine: true})
			.map(function(p) { return toJSON(p); });
		var their_personas	=	personas.filter(function(p) { return !p.get('mine', false); })
			.map(function(p) { return toJSON(p); });
		var content = Template.render('messages/conversation_item', {
			conversation: toJSON(this.model),
			my_personas: my_personas,
			their_personas: their_personas,
			num_unread: this.model.get('messages').select({unread: true}).length
		});
		this.html(content);
		if(this.model.get('selected', false)) this.el.addClass('sel');
		else this.el.removeClass('sel');
		if(this.model.get('messages').select({unread: true}).length > 0)
		{
			this.el.addClass('unread');
		}
		else
		{
			this.el.removeClass('unread');
		}
	},

	select_conversation: function(e)
	{
		if(e) e.stop();
		this.model.set({selected: true});
	}
});
