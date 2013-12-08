var FeedbackButtonController = Composer.Controller.extend({
	elements: {
	},

	events: {
		'click': 'open_feedback'
	},

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var contents	=	Template.render('feedback/button');
		this.html(contents);

		this.el.id	=	'feedback';

		// manual injection
		this.el.remove();
		this.el.inject(document.body, 'top');
	},

	open_feedback: function(e)
	{
		if(e) e.stop();
		new FeedbackController();
	}
});

