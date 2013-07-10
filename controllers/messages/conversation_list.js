var ConversationListController = Composer.Controller.extend({
	elements: {
		'ul': 'conversation_list'
	},

	events: {
	},

	collection: null,

	init: function()
	{
		this.render();

		// track all changes to our sub-controllers
		this.setup_tracking(this.collection);

		var was_empty = (this.collection.models().length == 0);
		var empty_check = function()
		{
			if(	(this.collection.models().length > 0 && was_empty) ||
				(this.collection.models().length == 0 && !was_empty) )
			{
				was_empty = !was_empty;
				this.render();
				this.collection.trigger('reset');
			}
			
		}.bind(this);

		this.collection.bind(['add', 'remove', 'reset'], empty_check, 'messages:list:render_on_state_change');
	},

	release: function()
	{
		this.release_subcontrollers();
		this.collection.unbind(['add', 'remove', 'reset'], 'messages:list:render_on_state_change');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('messages/conversation_list', {
			num_messages: this.collection.models().length
		});
		this.html(content);
	},

	create_subcontroller: function(message)
	{
		return new ConversationItemController({
			inject: this.conversation_list,
			model: message
		});
	}
}, TrackController);
