var AccountController = Composer.Controller.extend({

	elements: {
		'ul.type': 'tabs',
		'.account-content': 'account_content'
	},

	events: {
		'click ul.type li': 'switch_tab'
	},

	tab: 'profile',
	sub_controller: null,
	sub_controller_args: {},

	init: function()
	{
		this.render();

		turtl.push_title('Account');
		modal.open(this.el);
		modal.objects.container.removeClass('bare');
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		turtl.pop_title();
		turtl.keyboard.attach(); // re-enable shortcuts
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('account/index', {
			curtab: this.tab
		});
		this.html(content);

		if(this.sub_controller) this.sub_controller.release();
		this.sub_controller = null;

		// turn 'profile' into 'Profile', 'export-import' into 'Export', ...
		var tabname = this.tab[0].toUpperCase() + this.tab.slice(1).replace(/-.*/, '');
		var controller = window['Account'+tabname+'Controller'];
		if(controller)
		{
			var args = Object.merge({}, this.sub_controller_args, {
				inject: this.account_content
			});
			this.sub_controller = new controller(args);
			this.sub_controller_args = {};
		}
	},

	switch_tab: function(e)
	{
		if(e) e.stop();

		var tab = e.target;
		var tabname = tab.className.replace(/\bsel\b/, '').clean();
		if(tabname == this.tab) return;

		this.tabs.getElements('li').each(function(el) {
			el.removeClass('sel');
		});
		tab.addClass('sel');
		this.tab = tabname;
		this.render();
	}
});

