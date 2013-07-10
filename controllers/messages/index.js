var MessagesController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
	},

	events: {
	},

	// holds the messages collection
	messages: null,

	init: function()
	{
		this.messages = tagit.messages;

		this.render();

		tagit.controllers.HeaderBar.select_app(null, 'messages');
	},

	release: function()
	{
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('messages/index', {
			messages: toJSON(this.messages)
		});
		this.html(content);
	}
});
