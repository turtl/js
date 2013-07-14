var ConversationListController = TrackController.extend({
	elements: {
		'ul': 'conversation_list'
	},

	events: {
	},

	collection: null,
	filter: null,

	init: function()
	{
		if(!this.collection) return false;

		this.filter	=	new ConversationsFilter(this.collection, {
			filter: function() { return true; },
			sortfn: function(a, b)
			{
				var a_last = a.get('messages').last();
				var b_last = b.get('messages').last();
				if(!a_last || !b_last) return 0;
				return b_last.id().localeCompare(a_last.id());
			}
		});
		this.collection.bind('message_refresh', function() {
			this.filter.trigger('reset');
		}.bind(this), 'conversations:list:reset_on_message_refresh');

		this.render();

		// track all changes to our sub-controllers
		this.setup_tracking(this.filter);

		var was_empty = (this.filter.models().length == 0);
		var empty_check = function()
		{
			if(	(this.filter.models().length > 0 && was_empty) ||
				(this.filter.models().length == 0 && !was_empty) )
			{
				was_empty = !was_empty;
				this.render();
				this.filter.trigger('reset');
			}
			
		}.bind(this);

		this.filter.bind(['add', 'remove', 'reset'], empty_check, 'conversations:list:render_on_state_change');
	},

	release: function()
	{
		this.release_subcontrollers();
		this.filter.unbind(['add', 'remove', 'reset'], 'conversations:list:render_on_state_change');
		this.filter.detach();
		this.collection.unbind('message_refresh', 'conversations:list:reset_on_message_refresh');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('messages/conversation_list', {
			num_convos: this.filter.models().length
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
});

