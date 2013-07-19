var BoardShareController = Composer.Controller.extend({
	elements: {
		'div.share-to': 'share_container',
		'div.share-to .select': 'selector'
	},

	events: {
		'click .button.share': 'open_share',
		'submit form': 'share',
		'click a[href=#back]': 'open_manage',
		'click a[href=#remove]': 'remove_user'
	},

	board: null,
	from_persona: null,
	to_persona: null,
	persona_selector: null,

	init: function()
	{
		if(!this.board) return false;
		this.board.bind_relational('personas', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'board:share:monitor_personas');
		this.render();

		this.from_persona = tagit.user.get('personas').first();
		if(!this.from_persona)
		{
			barfr.barf('You must have a persona before being able to share your boards.');
			this.release();
			return;
		}

		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		this.board.unbind_relational('personas', ['add', 'remove', 'reset', 'change'], 'board:share:monitor_personas');
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

		var content	=	Template.render('boards/share', {
			board: board,
			personas: personas
		});
		this.html(content);

		if(this.persona_selector) this.persona_selector.release();
		this.persona_selector = new PersonaSelector({
			inject: this.selector,
			persona: this.to_persona,
			tabindex: 1
		});
		this.persona_selector.bind('selected', function(persona) {
			this.to_persona = persona;
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

		if(!this.to_persona || this.to_persona.is_new())
		{
			barfr.barf('Please pick a recipient for this message.')
			if(this.persona_selector && this.persona_selector.inp_screenname)
			{
				this.persona_selector.inp_screenname.focus();
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
			subject: this.from_persona.get('screenname') + ' wants to share the board "'+ this.board.get('title') + '" with you.',
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
	}
});
