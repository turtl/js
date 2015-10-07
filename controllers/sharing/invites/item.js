var SharingInviteItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.invite-actions': 'actions',
		'.unlocker': 'el_unlocker',
		'input[name=passphrase]': 'inp_passphrase'
	},

	events: {
		'click a[href=#status-unlock]': 'open_unlocker',
		'click .menu a[rel=unlock]': 'open_unlocker',
		'submit .unlocker form': 'unlock_invite',
		'click .menu a[rel=accept]': 'do_accept',
		'click .menu a[rel=reject]': 'open_reject'
	},

	model: null,

	init: function()
	{
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.render();
	},

	render: function()
	{
		var timestamp = id_timestamp(this.model.id());

		this.html(view.render('sharing/invites/item', {
			invite: this.model.toJSON(),
			timestamp_created: timestamp
		}));
		var actions = [[
			{name: (this.model.get('has_passphrase') ? 'Unlock' : 'Accept')},
			{name: 'Reject'}
		]];
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				actions: actions
			});
		}.bind(this));
		this.el_unlocker.set('slide', {duration: 300});
		this.el_unlocker.get('slide').hide();
	},

	open_unlocker: function(e)
	{
		if(e) e.stop();
		if(this.el_unlocker.hasClass('active'))
		{
			this.el_unlocker.removeClass('active');
			this.el_unlocker.slide('out');
			this.inp_passphrase.set('value', '');
		}
		else
		{
			this.el_unlocker.addClass('active');
			this.el_unlocker.slide('in');
			this.inp_passphrase.focus();
		}
	},

	unlock_invite: function(e)
	{
		if(e) e.stop();
		var passphrase = this.inp_passphrase.get('value');
	},

	open_accept: function(e)
	{
		if(e) e.stop();
		console.log('accept')
	},

	open_reject: function(e)
	{
		if(e) e.stop();
		console.log('reject')
	}
});

