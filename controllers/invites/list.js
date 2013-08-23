var InvitesListController	=	Composer.Controller.extend({
	elements: {
	},

	events: {
		'click a[href=#accept]': 'accept_invite',
		'click a[href=#unlock]': 'unlock_invite',
		'click a[href=#deny]': 'deny_invite',
		'submit form.secret': 'do_unlock_invite',
		'click .button.add.persona': 'open_personas'
	},

	collection: null,
	persona: null,

	init: function()
	{
		if(!this.collection) this.collection = new Invites();
		// TODO: persona selector (when allowing multiple personas)
		if(!this.persona) this.persona = turtl.user.get('personas').first();

		if(window.port) window.port.bind('invites-populate', function(invite_data) {
			this.collection.reset(Object.values(invite_data));
		}.bind(this));
		this.collection.bind(['add', 'remove', 'reset', 'change'], this.render.bind(this), 'invites:list:collection:all');
	},

	release: function()
	{
		this.collection.unbind(['add', 'remove', 'reset', 'change'], 'invites:list:collection:all');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content	=	Template.render('invites/list', {
			invites: this.collection.toJSON(),
			num_personas: turtl.user.get('personas').models().length
		});
		this.html(content);
	},

	get_invite_id_from_el: function(el)
	{
		// grab first <li> tag (holds our id val);
		var tmpel	=	el;
		var li		=	null;
		for(var i = 0, n = 10; i < n; i++)
		{
			if(tmpel.get('tag').toLowerCase() == 'li')
			{
				li	=	tmpel;
				break;
			}
			tmpel	=	tmpel.getParent();
		}

		if(!li) return false;

		return li.className.replace(/^.*invite_([0-9a-f-]+).*?$/, '$1');
	},

	key_valid: function(key)
	{
		return key.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/);
	},

	accept_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id	=	this.get_invite_id_from_el(e.target);
		var invite		=	this.collection.find_by_id(invite_id);
		if(!invite) return;

		var board_key	=	invite.decrypt_key(invite.get('data').board_key, invite.get('data').key, '');
		if(!board_key || !this.key_valid(board_key)) return false;

		invite.set({item_key: board_key});
		invite.accept(this.persona, {
			success: function() {
				this.collection.remove(invite);
			}.bind(this),
			error: function(err) {
				barfr.barf('Error accepting invite: '+ err);
			}
		});
	},

	deny_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id	=	this.get_invite_id_from_el(e.target);
		var invite		=	this.collection.find_by_id(invite_id);
		if(!invite) return;
		invite.deny(this.persona, {
			success: function() {
				this.collection.remove(invite);
			}.bind(this),
			error: function(err) {
				barfr.barf('Error denying invite: '+ err);
			}
		});
	},

	unlock_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id	=	this.get_invite_id_from_el(e.target);
		this.el.getElement('li.invite_'+invite_id+' form').setStyle('display', 'block');
		this.el.getElement('li.invite_'+invite_id+' input[name=secret]').focus();
	},

	do_unlock_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var secret	=	e.target.getElement('input[name=secret]').get('value');
		secret		=	secret.clean();
		if(secret == '') return false;

		var invite_id	=	this.get_invite_id_from_el(e.target);
		var invite		=	this.collection.find_by_id(invite_id);
		if(!invite) return false;

		var board_key	=	invite.decrypt_key(invite.get('data').board_key, invite.get('data').key, secret);
		if(!board_key || !this.key_valid(board_key)) return false;

		invite.set({item_key: board_key});
		invite.accept(this.persona, {
			success: function() {
				this.collection.remove(invite);
			}.bind(this),
			error: function(err) {
				barfr.barf('Error accepting invite: '+ err);
			}
		});
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		if(window._in_ext && window.port)
		{
			window.port.send('personas-add-open');
		}
		else
		{
			this.release();
			new PersonasController();
		}
	}
});

