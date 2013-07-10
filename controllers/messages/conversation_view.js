var ConversationViewController = Composer.Controller.extend({
	className: 'gutter',

	elements: {
	},

	model: null,

	compose_controller: null,

	init: function()
	{
		this.render();
		tagit.user.bind_relational('personas', ['add', 'remove', 'saved'], this.render.bind(this), 'message:watch_personas:render');
	},

	release: function()
	{
		tagit.user.unbind_relational('personas', ['add', 'remove', 'saved'], 'message:watch_personas:render');
		if(this.compose_controller) this.compose_controller.release();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('messages/conversation_view', {
			messages: this.model ? toJSON(this.model.get('messages', [])) : [],
			num_personas: tagit.user.get('personas').models().length
		});
		this.html(content);
		if(this.model) this.setup_compose();
	}
});
