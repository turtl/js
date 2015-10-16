var SharingInvitesListController = Composer.ListController.extend({
	elements: {
		'.item-list': 'el_list',
		'.invite-code': 'el_invite_code',
		'input[name=invite-code]': 'inp_invite_code'
	},

	events: {
		'click a[href=#code]': 'enter_code',
		'submit .invite-code form': 'submit_code'
	},

	empty_msg: '',

	collection: null,

	to_me: false,

	init: function()
	{
		this.bind('list:empty', this.render.bind(this, {empty: true}));
		this.bind('list:notempty', this.render.bind(this));

		this.track(this.collection, function(model, options) {
			return new SharingInviteItemController({
				inject: this.el_list,
				model: model,
				to_me: this.to_me
			});
		}.bind(this));
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('sharing/invites/list', {
			title: 'Invites',
			empty: options.empty === true
		}));
		this.el_invite_code.set('slide', {duration: 300});
		this.el_invite_code.get('slide').hide();
	},

	enter_code: function(e)
	{
		if(e) e.stop();
		if(this.el_invite_code.hasClass('active'))
		{
			this.el_invite_code.removeClass('active');
			this.el_invite_code.slide('out');
			this.inp_invite_code.set('value', '');
		}
		else
		{
			this.el_invite_code.addClass('active');
			this.el_invite_code.slide('in');
			this.inp_invite_code.focus();
		}
	},

	submit_code: function(e)
	{
		if(e) e.stop();
		var code = this.inp_invite_code.get('value').trim();
		var close = function()
		{
			this.el_invite_code.addClass('active');
			this.enter_code();
		}.bind(this);

		if(!code) return close();

		new BoardInvite().get_invite_from_code(code, {save: true, skip_remote_sync: true, skip_serialize: true})
			.bind(this)
			.then(close)
			.catch(function(err) {
				if(err && err.xhr && err.xhr.status == 404)
				{
					barfr.barf('That invite wasn\'t found.');
				}
				else
				{
					barfr.barf('There was a problem grabbing that invite.');
					log.error('sharing: invite code: ', err);
				}
			});
	}
});

