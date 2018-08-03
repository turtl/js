var InvitesItemController = Composer.Controller.extend({
	xdom: true,
	tag: 'li',

	elements: {
		'.invite-actions': 'actions_container',
		'input[name=passphrase]': 'inp_passphrase',
	},

	events: {
		'click .menu a[href=#accept]': 'open_accept',
		'click .menu a[href=#delete]': 'open_delete',
		'submit .unseal form': 'unlock',
	},

	model: null,

	passphrase_open: false,

	init: function() {
		if(!this.model) {
			this.release();
			throw new Error('invites: item: no model passed');
		}

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(turtl.events, 'sync:connected', this.render.bind(this));

		this.render()
			.bind(this)
			.then(function() {
				var actions = [
					{name: i18next.t('Accept'), href: '#accept'},
					{name: i18next.t('Delete'), href: '#delete'},
				];
				this.sub('actions', function() {
					return new ItemActionsController({
						inject: this.actions_container,
						actions: [actions],
					});
				}.bind(this));
			});
	},

	render: function() {
		if(!turtl.connected) {
			this.passphrase_open = false;
		}
		return this.html(view.render('invites/item', {
			invite: this.model.toJSON(),
			passphrase_open: this.passphrase_open,
			confirmed: turtl.user.get('confirmed'),
		})).bind(this)
			.then(function() {
				if(turtl.connected) this.el.removeClass('disconnected');
				else this.el.addClass('disconnected');
			});
	},

	unlock: function(e) {
		if(e) e.stop();
		if(!turtl.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to accept invites.'));
			return;
		}

		var passphrase = null;
		if(this.inp_passphrase) {
			passphrase = this.inp_passphrase.get('value') || null;
		}
		this.model.accept(passphrase)
			.bind(this)
			.catch(function(err) {
				barfr.barf(i18next.t('There was a problem accepting the invite. Most likely, the passphrase given was incorrect.'));
				log.error('invites: accept: ', err, derr(err));
			});
	},

	open_accept: function(e) {
		if(e) e.stop();
		if(!turtl.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to accept invites.'));
			return;
		}
		if(!turtl.user.get('confirmed')) {
			barfr.barf(i18next.t('You must confirm your account before accepting invites.'));
			return;
		}
		if(this.model.get('is_passphrase_protected')) {
			if(this.passphrase_open) {
				this.passphrase_open = false;
				return this.render();
			}
			this.passphrase_open = true;
			this.render()
				.bind(this)
				.then(function() {
					if(this.inp_passphrase) this.inp_passphrase.focus();
				});
		} else {
			this.unlock();
		}
	},

	open_delete: function(e) {
		if(e) e.stop();
		if(!turtl.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to delete invites.'));
			return;
		}
		if(!confirm(i18next.t('Really delete this invite?'))) return;
		return this.model.delete()
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting that invite'), err);
				log.error('invites: delete: ', err, derr(err));
			});
	},
});

