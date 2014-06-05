var AccountProfileController = Composer.Controller.extend({
	elements: {
		'.inviter': 'inviter'
	},

	events: {
		'click a[href=#invite]': 'open_inviter'
	},

	loading_size: false,

	init: function()
	{
		this.loading_size	=	true;
		this.render();
		turtl.profile.bind('change:size', this.render.bind(this), 'account:profile:size:render:'+this.cid());
		turtl.user.bind('change:storage', this.render.bind(this), 'account:user:storage:render:'+this.cid());
		turtl.profile.calculate_size({always_trigger: true});
	},

	release: function()
	{
		turtl.profile.unbind('change:size', 'account:profile:size:render:'+this.cid());
		turtl.user.unbind('change:storage', 'account:user:storage:render:'+this.cid());
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		// show (loading) the first run
		var loading_profile_size	=	this.loading_size;
		this.loading_size			=	false;

		var share_link	=	'https://turtl.it/'+turtl.user.get('invite_code');
		var share_text	=	'Check out Turtl: '+ share_link;

		var num_boards	=	0;
		var num_notes	=	turtl.profile.get('boards').filter(function(b) {
			return !b.get('shared');
		}).map(function(b) {
			num_boards++;
			return b.get('notes').models().length;
		}).reduce(function(a, b) { return a+b });

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
			profile_size: turtl.profile.get('size', 0),
			loading_profile_size: loading_profile_size,
			storage: turtl.user.get('storage', 100 * 1024 * 1024),
			num_notes: num_notes,
			num_boards: num_boards,
			num_shared_boards: num_shared_boards,
			num_boards_shared: num_boards_shared,
			member_since: member_since,
			member_days: member_days
		});
		this.html(content);
		this.inviter.set('slide', {duration: 200});
		this.inviter.get('slide').hide();
	},

	open_inviter: function(e)
	{
		if(e) e.stop();
		this.inviter.get('slide').toggle();
	}
});

