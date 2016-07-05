var SharingInviteItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.invite-actions': 'actions',
		'.unlocker': 'el_unlocker',
		'input[name=passphrase]': 'inp_passphrase',
		'.unlocker input[type=submit]': 'inp_unlock_submit'
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
			{name: (this.model.get('has_passphrase') ? 'Unlock' : 'Accept'),
			title: (this.model.get('has_passphrase') ? i18next.t('Unlock') : i18next.t('Accept'))},
			{name: 'Reject', title: i18next.t('Title')}
		]];
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				actions: actions
			});
		}.bind(this));
		if(this.el_unlocker)
		{
			this.el_unlocker.set('slide', {duration: 300});
			this.el_unlocker.get('slide').hide();
		}
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

		this.inp_unlock_submit.set('disabled', true);
		return this.model.open(passphrase).bind(this)
			.then(function() {
				this.do_accept();
			})
			.catch(function(err) {
				log.error('invite: unlock: ', err);
				barfr.barf(i18next.t('There was a problem unlocking the invite. Do you have the right passphrase?'));
			})
			.finally(function() {
				this.inp_unlock_submit.set('disabled', false);
			});
	},

	do_accept: function(e)
	{
		if(e) e.stop();
		var persona = turtl.profile.get('personas').first();
		if(!persona)
		{
			barfr.barf(i18next.t('Accepting invites requires a persona.'));
			return;
		}
		this.model.accept()
			.then(function() {
				barfr.barf(i18next.t('Invite accepted!'));
			})
			.catch(function(err) {
				log.error('invite: accept: ', err);
				barfr.barf(i18next.t('There was a problem accepting that invite. Please try again.'));
			});
	},

	open_reject: function(e)
	{
		if(e) e.stop();
		if(!confirm(i18next.t('Really reject this invite?'))) return;
		this.model.reject()
			.catch(function(err) {
				barfr.barf(i18next.t('There was a problem rejecting that invite. Please try again.'));
				log.error('invite: reject: ', err);
			})
	}
});

