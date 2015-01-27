var InvitesListController = Composer.Controller.extend({
	elements: {
	},

	events: {
		'click li.message a[href=#accept]': 'accept_message_invite',
		'click li.message a[href=#deny]': 'deny_message_invite',
		'click li.invite a[href=#accept]': 'accept_invite',
		'click li.invite a[href=#unlock]': 'unlock_invite',
		'click li.invite a[href=#deny]': 'deny_invite',
		'submit form.secret': 'do_unlock_invite',
		'click .button.add.persona': 'open_personas'
	},

	collection: null,
	persona: null,

	edit_in_modal: false,

	init: function()
	{
		this.collection = turtl.invites;

		// TODO: persona selector (when allowing multiple personas)
		if(!this.persona) this.persona = turtl.user.get('personas').first();

		this.collection.bind(['add', 'remove', 'reset', 'change'], this.render.bind(this), 'invites:list:collection:all');
		turtl.messages.bind(['add', 'remove', 'reset', 'change'], this.render.bind(this), 'invites:list:messages:all');
		if(this.edit_in_modal)
		{
			this.render()
			modal.open(this.el);
			var close_fn = function() {
				this.release({from_modal: true});
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}
		else
		{
			this.render();
		}
	},

	release: function(options)
	{
		options || (options = {});

		if(!options.from_modal && modal.is_open && this.edit_in_modal) modal.close();
		if(window.port) window.port.unbind('invites-populate');
		this.collection.unbind(['add', 'remove', 'reset', 'change'], 'invites:list:collection:all');
		turtl.messages.unbind(['add', 'remove', 'reset', 'change'], 'invites:list:messages:all');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('invites/list', {
			invites: this.collection.toJSON(),
			messages: toJSON(turtl.messages),
			num_personas: turtl.user.get('personas').models().length
		});
		this.html(content);
		if(window.port) window.port.send('resize');
	},

	get_invite_id_from_el: function(el)
	{
		// grab first <li> tag (holds our id val);
		var tmpel = el;
		var li = null;
		for(var i = 0, n = 10; i < n; i++)
		{
			if(tmpel.get('tag').toLowerCase() == 'li')
			{
				li = tmpel;
				break;
			}
			tmpel = tmpel.getParent();
		}

		if(!li) return false;

		return li.className.replace(/^.*(invite|message)_([0-9a-f-]+).*?$/, '$2');
	},

	key_valid: function(key)
	{
		return key.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/);
	},

	accept_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id = this.get_invite_id_from_el(e.target);
		var invite = this.collection.find_by_id(invite_id);
		if(!invite) return;

		var board_key = invite.decrypt_key(invite.get('data').board_key, invite.get('data').key, '');
		if(!board_key || !this.key_valid(board_key)) return false;

		invite.set({item_key: board_key});
		invite.accept(this.persona).bind(this)
			.then(function() {
				this.collection.remove(invite);
			})
			.catch(function(err) {
				if(err.xhr && err.xhr.status == 404)
				{
					barfr.barf('That invite wasn\'t found.');
					this.collection.remove(invite);
				}
				else
				{
					log.error('error: accepting invite: ', err);
					barfr.barf('Error accepting invite: '+ err);
				}
			});
	},

	deny_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id = this.get_invite_id_from_el(e.target);
		var invite = this.collection.find_by_id(invite_id);
		if(!invite) return;
		invite.deny(this.persona).bind(this)
			.then(function() {
				this.collection.remove(invite);
			})
			.catch(function(err) {
				if(err.xhr && err.xhr.status == 404)
				{
					// invite doesn't exist. can it.
					this.collection.remove(invite);
				}
				else
				{
					log.error('error: debying invite: ', err);
					barfr.barf('Error denying invite: '+ err);
				}
			});
	},

	unlock_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var invite_id = this.get_invite_id_from_el(e.target);
		this.el.getElement('li.invite_'+invite_id+' form').setStyle('display', 'block');
		this.el.getElement('li.invite_'+invite_id+' input[name=secret]').focus();
	},

	do_unlock_invite: function(e)
	{
		if(!e) return;
		e.stop();

		var secret = e.target.getElement('input[name=secret]').get('value');
		secret = secret.clean();
		if(secret == '') return false;

		var invite_id = this.get_invite_id_from_el(e.target);
		var invite = this.collection.find_by_id(invite_id);
		if(!invite) return false;

		var board_key = invite.decrypt_key(invite.get('data').board_key, invite.get('data').key, secret);
		if(!board_key || !this.key_valid(board_key))
		{
			barfr.barf('Sorry, that answer wasn\'t correct.');
			return false;
		}

		invite.set({item_key: board_key});
		invite.accept(this.persona).bind(this)
			.then(function() {
				this.collection.remove(invite);
			})
			.catch(function(err) {
				log.error('error: accepting invite: ', err);
				barfr.barf('Error accepting invite: '+ err);
			});
	},

	accept_message_invite: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid = this.get_invite_id_from_el(e.target);
		var message = turtl.messages.find_by_id(nid);
		if(!message) return;

		var body = message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id = body.board_id;
			var board_key = tcrypt.key_to_bin(body.board_key);
			var persona = turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			// this should never happen, but you never know
			if(!board_id || !board_key)
			{
				persona.delete_message(message);
				return false;
			}
			var board = new Board({
				id: board_id
			});
			board.key = board_key;
			turtl.loading(true);
			board.accept_share(persona).bind(this)
				.then(function() {
					// removeing the message from turtl.messages isn't necessary,
					// but is less visually jarring since otherwise we'd have to
					// wait for a sync to remove it
					turtl.messages.remove(message);

					// actually delete the message
					persona.delete_message(message);
					barfr.barf('Invite accepted!');
				})
				.catch(function(err) {
					log.error('error: accept invite: ', err);
					barfr.barf('There was a problem accepting the invite: '+ err);
				})
				.finally(function() {
					turtl.loading(false);
				});
			break;
		default:
			return false;
			break;
		}
	},

	deny_message_invite: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid = this.get_invite_id_from_el(e.target);
		var message = turtl.messages.find_by_id(nid);
		if(!message) return;

		var body = message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id = body.board_id;
			var persona = turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			turtl.loading(true);
			persona.delete_message(message).bind(this)
				.finally(function() { turtl.loading(false); });
			break;
		default:
			return false;
			break;
		}
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		if(window._in_ext && window.port && !window._in_desktop)
		{
			window.port.send('personas-add-open');
		}
		else
		{
			this.release();
			new PersonaEditController();
		}
	}
});

