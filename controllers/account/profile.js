var AccountProfileController = Composer.Controller.extend({
	elements: {
		'.inviter': 'inviter',
		'.size-container': 'size_container'
	},

	events: {
		'click a[href=#invite]': 'open_inviter'
	},

	size_controller: null,
	open_inviter_on_init: false,

	init: function()
	{
		this.render();
	},

	release: function()
	{
		if(this.size_controller) this.size_controller.release();
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var share_link	=	'https://turtl.it/'+turtl.user.get('invite_code');
		var share_text	=	'Check out Turtl: '+ share_link;

		var num_boards	=	0;
		var num_notes	=	turtl.profile.get('boards').filter(function(b) {
			return !b.get('shared');
		}).map(function(b) {
			num_boards++;
			return b.get('notes').models().length;
		}).reduce(function(a, b) { return a+b }, 0);

		var num_shared_boards	=	turtl.profile.get('boards').filter(function(b) {
			return !b.get('shared') && Object.keys(b.get('privs') || {}).length > 0;
		}).length;
		var num_boards_shared	=	turtl.profile.get('boards').filter(function(b) {
			return b.get('shared');
		}).length;

		var months			=	[
			'Jan', 'Feb', 'Mar', 'Apr',
			'May', 'Jun', 'Jul', 'Aug',
			'Sep', 'Oct', 'Nov', 'Dec'
		];
		var date			=	new Date(parseInt(turtl.user.id().substr(0, 8), 16) * 1000);
		var member_since	=	months[date.getMonth()] + ' ' + date.getDay() + ', ' + date.getFullYear();
		var member_days		=	((new Date().getTime() - date.getTime()) / (1000 * 86400));

		var persona	=	turtl.user.get('personas').first();
		var email	=	persona ? persona.get('email') : null;

		var content	=	Template.render('account/profile', {
			email: email,
			share_link: share_link,
			share_text: share_text,
			num_notes: num_notes,
			num_boards: num_boards,
			num_shared_boards: num_shared_boards,
			num_boards_shared: num_boards_shared,
			member_since: member_since,
			member_days: member_days
		});
		this.html(content);
		this.size_controller	=	new AccountProfileSizeController({
			inject: this.size_container
		});
		if(this.inviter)
		{
			this.inviter.set('slide', {duration: 200});
			this.inviter.get('slide').hide();
			if(this.open_inviter_on_init)
			{
				(function() {
					this.inviter.get('slide').slideIn();
				}).delay(250, this);
				this.open_inviter_on_init	=	false;
			}
		}
	},

	open_inviter: function(e)
	{
		if(e) e.stop();
		this.inviter.get('slide').toggle();
	}
});

