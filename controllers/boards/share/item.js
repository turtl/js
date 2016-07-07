var BoardsShareItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.invite-actions': 'actions'
	},

	events: {
		'click .menu a[rel=unshare]': 'open_delete'
	},

	model: null,
	board: null,
	pending: false,

	init: function()
	{
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.render();
	},

	render: function()
	{
		var data = this.model.toJSON();
		var persona = this.pending ? data.to_persona : data;
		if(!persona.id) persona = false;

		var perms = '';
		var privs = this.board.get('privs') || {};
		switch((privs[persona.id] || {}).perms)
		{
		case 1: perms = i18next.t('Read'); break;
		case 2: perms = i18next.t('Write'); break;
		case 3: perms = i18next.t('Admin'); break;
		}

		this.html(view.render('boards/share/item', {
			pending: this.pending,
			persona: persona,
			permissions: perms,
			share: data,
			timestamp_created: this.pending ? id_timestamp(this.model.id()) : false
		}));

		var actions = [
			[{name: 'Unshare'}],
		];
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				actions: actions
			});
		}.bind(this));
	},

	open_delete: function(e)
	{
		if(e) e.stop();
		if(this.pending)
		{
			if(!confirm(i18next.t('Really remove this invite?'))) return;
		}
		else
		{
			if(!confirm(i18next.t('Really remove this user from the board?'))) return;
		}

		if(this.pending)
		{
			this.model.reject()
				.catch(function(err) {
					barfr.barf(i18next.t('Error removing invite.'));
					log.error('board: share: remove invite: ', err);
				});
		}
		else
		{
			this.board.remove_persona(this.model)
				.catch(function(err) {
					barfr.barf(i18next.t('Error removing share.'));
					log.error('board: share: remove share: ', err);
				});
		}
	}
});

