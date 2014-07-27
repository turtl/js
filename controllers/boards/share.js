var BoardShareController = Composer.Controller.extend({
	elements: {
		'div.share-to': 'share_container',
		'div.share-to .select': 'selector',
		'div.personas-list': 'personas_list'
	},

	events: {
		'click .button.share': 'open_share',
		'click a[href=#remove]': 'remove_user',
		'click a[href=#cancel]': 'cancel_invite'
	},

	board: null,
	from_persona: null,
	to_persona: null,
	sharer: null,
	invite: false,

	init: function()
	{
		if(!this.board) return false;
		this.board.bind_relational('personas', ['add', 'remove', 'reset', 'change'], this.render_personas.bind(this), 'board:share:monitor_personas');
		this.board.bind('change:privs', this.render_personas.bind(this), 'board:share:monitor_privs');
		this.render();

		this.from_persona = turtl.user.get('personas').first();
		if(!this.from_persona)
		{
			barfr.barf('You must have a persona before being able to share your boards.');
			modal.close();
			return;
		}

		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		this.board.unbind_relational('personas', ['add', 'remove', 'reset', 'change'], 'board:share:monitor_personas');
		this.board.unbind('change:privs', 'board:share:monitor_privs');
		if(modal.is_open) modal.close();
		if(this.sharer) this.sharer.release();
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('boards/share', {
			title: this.board.get('title')
		});
		this.html(content);

		this.render_personas();
		this.render_share();
	},

	render_personas: function()
	{
		// grab board data without serializing notes
		var _notes = this.board.get('notes');
		this.board.unset('notes', {silent: true});
		var board = toJSON(this.board);
		this.board.set({notes: _notes}, {silent: true});

		var privs = this.board.get('privs');
		var personas = this.board.get('personas').map(function(p) {
			p = toJSON(p);
			p.privs = privs[p.id];
			return p;
		});

		var invites = [];
		Object.each(privs, function(entry, id) {
			if(!entry || !entry.email) return;
			var invite = {
				id: id,
				email: entry.email,
				p: entry.perms
			};
			invites.push(invite);
		});

		var content = Template.render('boards/share_personas', {
			board: board,
			personas: personas,
			invites: invites
		});
		this.personas_list.set('html', content);
		this.refresh_elements();
	},

	render_share: function()
	{
		if(this.sharer) this.sharer.release();
		this.sharer = new ShareController({
			inject: this.selector,
			controller: InviteBoardController,
			model: this.board,
			tabindex: 1
		});
		this.sharer.bind('sent', function() {
			this.render_share();
		}.bind(this), 'board:share:sub:sent');
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

	remove_user: function(e)
	{
		if(!e) return;
		e.stop();

		if(!confirm('Really UNshare the board with this user?')) return false;

		var pid = next_tag_up('li', next_tag_up('li', e.target).getParent()).className.replace(/^.*persona_([0-9a-f-]+).*?$/, '$1');
		if(!pid) return false;
		var persona = this.board.get('personas').find_by_id(pid);
		if(!persona) return false;
		turtl.loading(true);
		this.board.share_with(this.from_persona, persona, 0, {
			success: function() {
				turtl.loading(false);
				barfr.barf('User successfully removed from board.');
				this.board.get('personas').remove(persona);
			}.bind(this),
			error: function(err) {
				turtl.loading(false);
				barfr.barf('There was a problem removing that user from the board: '+ err);
			}.bind(this)
		});
	},

	cancel_invite: function(e)
	{
		if(!e) return;
		e.stop();

		if(!confirm('Really cancel this invite?')) return false;

		var iid = next_tag_up('li', next_tag_up('li', e.target).getParent()).className.replace(/^.*invite_([0-9a-f-]+).*?$/, '$1');
		var invite = new BoardInvite({id: iid});
		invite.cancel(this.board, {
			success: function() {
			},
			error: function() {
			}
		});
	}
});
