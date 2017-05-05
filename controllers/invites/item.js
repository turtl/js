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
		this.with_bind(turtl.events, ['api:connect', 'api:disconnect'], function() {
			this.render();
		}.bind(this));

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
		if(!turtl.sync.connected) {
			this.passphrase_open = false;
		}
		return this.html(view.render('invites/item', {
			invite: this.model.toJSON(),
			passphrase_open: this.passphrase_open,
			default_passphrase: this.model.default_passphrase,
			confirmed: turtl.user.get('confirmed'),
		})).bind(this)
			.then(function() {
				if(turtl.sync.connected) this.el.removeClass('disconnected');
				else this.el.addClass('disconnected');
			});
	},

	unlock: function(e) {
		if(e) e.stop();
		if(!turtl.sync.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to accept invites.'));
			return;
		}

		var passphrase = this.inp_passphrase.get('value');
		var pubkey = turtl.user.get('pubkey');
		var privkey = turtl.user.get('privkey');
		this.model.open(pubkey, privkey, passphrase)
			.bind(this)
			.then(function() {
				var space_id = this.model.get('space_id');
				var space_key = this.model.get('space_key');
				if(!space_key) throw new Error('Invite was successfully opened but missing space key');
				var keychain = turtl.profile.get('keychain');
				return keychain.upsert_key(space_id, 'space', tcrypt.from_base64(space_key))
					.bind(this)
					.then(function() {
						return this.model.accept()
							.bind(this)
							.then(function() {
								this.model.destroy({skip_remote_sync: true});
								return turtl.sync.poll_api_for_changes({force: true});
							})
							.then(function() {
								var space = turtl.profile.get('spaces').get(space_id) || new Space();
								barfr.barf(i18next.t('Invite accepted! You are now a member of the space "'+space.get('title')+'"'));
								turtl.route('/spaces/'+space_id+'/notes');
							})
							.catch(function(err) {
								if(err.disconnected) {
									barfr.barf(i18next.t('Couldn\'t connect to the server'));
									return;
								}
								turtl.events.trigger('ui-error', i18next.t('There was a problem accepting that invite'), err);
								log.error('invites: accept: ', err, derr(err));
							});
					})
					.catch(function(err) {
						turtl.events.trigger('ui-error', i18next.t('There was a problem adding the invite\'s key to your keychain'), err);
						log.error('invites: accept: ', err, derr(err));
					});
			})
			.catch(function(err) {
				barfr.barf(i18next.t('There was a problem accepting the invite. Most likely, the passphrase given was incorrect.'));
				log.error('invites: accept: ', err, derr(err));
			});
	},

	open_accept: function(e) {
		if(e) e.stop();
		if(!turtl.sync.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to accept invites.'));
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
		if(!turtl.sync.connected) {
			barfr.barf(i18next.t('You must be connected to the Turtl service to delete invites.'));
			return;
		}
		if(!confirm(i18next.t('Really delete this invite?'))) return;
		return this.model.destroy()
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem deleting that invite'), err);
				log.error('invites: delete: ', err, derr(err));
			});
	},
});

