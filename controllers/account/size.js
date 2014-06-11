var AccountProfileSizeController = Composer.Controller.extend({

	loading_size: false,

	init: function()
	{
		if(!turtl.profile) return false;
		this.loading_size	=	true;
		this.render();
		turtl.profile.bind('change:size', this.render.bind(this), 'account:profile:size:render:'+this.cid());
		turtl.user.bind('change:storage', this.render.bind(this), 'account:user:storage:render:'+this.cid());

		if(turtl.profile.profile_data)
		{
			turtl.profile.calculate_size({always_trigger: true});
		}
		else
		{
			turtl.profile.bind_once('populated', function() {
				turtl.profile.calculate_size({always_trigger: true});
			});
		}
	},

	release: function()
	{
		if(turtl.profile) turtl.profile.unbind('change:size', 'account:profile:size:render:'+this.cid());
		if(turtl.user) turtl.user.unbind('change:storage', 'account:user:storage:render:'+this.cid());
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		if(!turtl.profile) return false;

		// show (loading) the first run
		var loading_profile_size	=	this.loading_size;
		this.loading_size			=	false;

		var content	=	Template.render('account/size', {
			profile_size: turtl.profile.get('size', 0),
			loading_profile_size: loading_profile_size,
			storage: turtl.user.get('storage', 100 * 1024 * 1024)
		});
		this.html(content);
	}
});

