var BoardShareController = Composer.Controller.extend({
	elements: {
		'div.share-to': 'share_container',
		'div.share-to .select': 'selector',
		'div.share-to input[type=submit]': 'inp_submit'
	},

	events: {
		'click .button.share': 'open_share',
		'submit form': 'share',
		'click a[href=#back]': 'open_manage',
		'click a[href=#remove]': 'remove_user',
		'click a[href=#cancel]': 'cancel_invite'
	},

	board: null,
	from_persona: null,
	to_persona: null,
	persona_selector: null,
	invite: false,

	init: function()
	{
		if(!this.board) return false;
		this.board.bind_relational('personas', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'board:share:monitor_personas');
		this.board.bind('change:privs', this.render.bind(this), 'board:share:monitor_privs');
		this.render();

		this.from_persona = tagit.user.get('personas').first();
		if(!this.from_persona)
		{
			barfr.barf('You must have a persona before being able to share your boards.');
			this.open_manage();
			return;
		}

		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		if(this.board.get('personas').models().length == 0 && Object.getLength(this.board.get('privs')) == 0)
		{
			this.open_share();
		}

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		this.board.unbind_relational('personas', ['add', 'remove', 'reset', 'change'], 'board:share:monitor_personas');
		this.board.unbind('change:privs', 'board:share:monitor_privs');
		if(modal.is_open) modal.close();
		if(this.persona_selector) this.persona_selector.release();
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		// grab board data without serializing notes
		var _notes	=	this.board.get('notes');
		this.board.unset('notes', {silent: true});
		var board	=	toJSON(this.board);
		this.board.set({notes: _notes}, {silent: true});

		var privs		=	this.board.get('privs');
		var personas	=	this.board.get('personas').map(function(p) {
			p		=	toJSON(p);
			p.privs	=	privs[p.id];
			return p;
		});

		var invites	=	[];
		Object.each(privs, function(entry, id) {
			if(!entry || !entry.e) return;
			var invite	=	{
				id: id,
				email: entry.e,
				p: entry.p
			};
			invites.push(invite);
		});

		var content	=	Template.render('boards/share', {
			board: board,
			personas: personas,
			invites: invites
		});
		this.html(content);

		if(this.persona_selector) this.persona_selector.release();
		this.persona_selector = new PersonaSelector({
			inject: this.selector,
			persona: this.to_persona,
			model: this.board,
			tabindex: 1
		});
		this.persona_selector.bind('selected', function(persona) {
			this.to_persona	=	persona;
			this.inp_submit.disabled	=	false;
		}.bind(this));
		this.persona_selector.bind('change-persona', function() {
			this.to_persona	=	false;
			this.inp_submit.disabled	=	true;
			this.invite	=	false;
		}.bind(this));
		this.persona_selector.bind('show-personas', function() {
			this.invite	=	false;
			if(this.to_persona)
			{
				this.inp_submit.disabled	=	false;
			}
			else
			{
				this.inp_submit.disabled	=	true;
			}
		}.bind(this));
		this.persona_selector.bind('show-invite', function() {
			this.inp_submit.disabled	=	false;
			this.invite	=	true;
			this.persona_selector.persona_list.bind('sent', function() {
				this.share_container.addClass('open');
				this.open_share();
			}.bind(this));
		}.bind(this));
	},

	open_share: function(e)
	{
		if(e) e.stop();
		if(this.share_container.hasClass('open'))
		{
			this.share_container.removeClass('open');
		}
		else
		{
			this.share_container.addClass('open');
			var search = this.el.getElement('.search input[type=text]');
			if(search) search.focus();
		}
	},

	share: function(e)
	{
		if(e) e.stop();

		if(this.invite)
		{
			this.persona_selector.persona_list.trigger('submit');
			return;
		}

		if(!this.to_persona || this.to_persona.is_new())
		{
			barfr.barf('Please pick a recipient for this message.')
			if(this.persona_selector && this.persona_selector.inp_email)
			{
				this.persona_selector.inp_email.focus();
			}
			return false;
		}

		if(this.board.get('personas').find_by_id(this.to_persona.id()))
		{
			barfr.barf('This board is already shared with that person.');
			return false;
		}

		var message	=	new Message({
			from: this.from_persona.id(),
			to: this.to_persona.id(),
			notification: true,
			subject: this.from_persona.get('email') + ' wants to share the board "'+ this.board.get('title') + '" with you.',
			body: {
				type: 'share_board',
				board_id: this.board.id(),
				board_key: tcrypt.key_to_string(this.board.key)
			}
		});

		// make sure we generate keys for this recipient
		message.add_recipient(this.from_persona);
		message.add_recipient(this.to_persona);

		tagit.loading(true);
		var perms	=	2;
		this.board.share_with(this.to_persona, perms, {
			success: function() {
				this.from_persona.send_message(message, {
					success: function() {
						tagit.loading(false);
						barfr.barf('Invite sent.');
						this.share_container.removeClass('open');
						var privs	=	Object.clone(this.board.get('privs', {}));
						privs[this.to_persona.id()] = {p: perms, i: true};
						this.board.set({privs: privs});
						this.board.get('personas').add(this.to_persona);

						this.persona_selector.persona	=	new Persona();
						this.persona_selector.render();

						this.to_persona	=	null;
					}.bind(this),
					error: function() {
						tagit.loading(false);
						barfr.barf('There was a problem sending your invite: '+ err);
					}.bind(this)
				});
			}.bind(this),
			error: function(err) {
				tagit.loading(false);
				barfr.barf('There was a problem sharing this board: '+ err);
			}.bind(this)
		});
	},

	open_manage: function(e)
	{
		if(e) e.stop();
		modal.close();

		// open management back up
		new BoardManageController({
			collection: tagit.profile.get('boards')
		});
	},

	remove_user: function(e)
	{
		if(!e) return;
		e.stop();

		if(!confirm('Really UNshare the board with this user?')) return false;

		var pid		=	next_tag_up('li', next_tag_up('li', e.target).getParent()).className.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
		if(!pid) return false;
		var persona	=	this.board.get('personas').find_by_id(pid);
		if(!persona) return false;
		tagit.loading(true);
		this.board.share_with(persona, 0, {
			success: function() {
				tagit.loading(false);
				barfr.barf('User successfully removed from board.');
				this.board.get('personas').remove(persona);
			}.bind(this),
			error: function(err) {
				tagit.loading(false);
				barfr.barf('There was a problem removing that user from the board: '+ err);
			}.bind(this)
		});
	},

	cancel_invite: function(e)
	{
		if(!e) return;
		e.stop();

		if(!confirm('Really cancel this invite?')) return false;

		var iid		=	next_tag_up('li', next_tag_up('li', e.target).getParent()).className.replace(/^.*invite_([0-9a-f-]+).*?$/, '$1');
		var invite	=	new BoardInvite({id: iid});
		invite.cancel(this.board, {
			success: function() {
			},
			error: function() {
			}
		});
	}
});
