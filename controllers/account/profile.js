var AccountProfileController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	init: function()
	{
		this.render();
	},

	release: function()
	{
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var num_boards	=	0;
		var num_notes	=	turtl.profile.get('boards').filter(function(b) {
			return !b.get('shared');
		}).map(function(b) {
			num_boards++;
			return b.get('notes').models().length;
		}).reduce(function(a, b) { return a+b });

		var num_shared_boards	=	turtl.profile.get('boards').filter(function(b) {
			return !b.get('shared') && Object.keys(b.get('privs')).length > 0;
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

		var content	=	Template.render('account/profile', {
			size: turtl.profile.get('size', 0),
			storage: turtl.user.get('storage', 100 * 1024 * 1024),
			num_notes: num_notes,
			num_boards: num_boards,
			num_shared_boards: num_shared_boards,
			num_boards_shared: num_boards_shared,
			member_since: member_since,
			member_days: member_days
		});
		this.html(content);
	}
});

