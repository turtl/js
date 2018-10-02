var SpacesEditController = FormController.extend({
	xdom: true,

	elements: {
		'input[name=title]': 'inp_title',
		'input[name=color]': 'inp_color',
		'input[name=default]': 'inp_default',
	},

	events: {
		'click a[rel=share]': 'share_space',
		'click a[rel=delete]': 'delete_space',
		'click a[rel=leave]': 'leave_space',
	},

	modal: null,
	model: null,
	formclass: 'spaces-edit',

	init: function()
	{
		if(!this.model) {
			this.model = new Space();
			this.bind('release', this.model.unbind.bind(this.model));
		}
		this.action = i18next.t('Save');

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action,
		});

		var set_perms = function() {
			var can_edit = this.model.is_new() ||
				this.model.can_i(Permissions.permissions.edit_space);
			this.disable(!can_edit);
		}.bind(this);
		set_perms();

		this.parent();
		this.render();

		this.with_bind(this.model, 'change', set_perms);
		this.with_bind(this.model, 'change', this.render.bind(this));

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
		this.with_bind(this.model, 'destroy', close);
	},

	render: function()
	{
		var can_edit = this.model.is_new() || 
			this.model.can_i(Permissions.permissions.edit_space);
		var is_shared = this.model.is_shared_with_me();
		var my_spaces = turtl.profile.get('spaces')
			.filter(function(space) { return !space.is_shared_with_me(); });
		var spacedata = this.model.toJSON();
		var color = this.model.get_color().bg;
		var default_space = turtl.user.setting('default_space');
		var show_delete = !this.model.is_new()
			&& (is_shared || this.model.can_i(Permissions.permissions.delete_space));
		return this.html(view.render('spaces/edit', {
			can_edit: can_edit,
			action: this.action,
			space: spacedata,
			color: color,
			shared: is_shared,
			last_space: my_spaces.length <= 1,
			show_delete: show_delete,
			is_default: default_space == this.model.id(),
			is_new: this.model.is_new(),
		})).bind(this)
			.then(function() {
				if(this.model.is_new())
				{
					this.inp_title.focus.delay(300, this.inp_title);
				}
			});
	},

	submit: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value').toString().trim();
		var color = this.inp_color.get('value');
		var default_space = this.inp_default && this.inp_default.get('checked');

		var is_new = this.model.is_new();
		var clone = this.model.clone();

		var data = {title: title};
		if(color) data.color = color;
		clone.set(data);
		clone.save()
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());
				if(default_space) {
					turtl.user.setting('default_space', this.model.id());
				}
				if(is_new) {
					turtl.route_to_space(this.model.id());
				}
				clone.unbind();
				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that space'), err);
				log.error('space: edit: ', this.model.id(), derr(err));
			});
	},

	share_space: function(e)
	{
		// let the link route. just make sure we close the modal in case we're
		// already on the share page the route doesnt trigger
		this.trigger('close');
	},

	delete_space: function(e)
	{
		if(e) e.stop();
		if(!permcheck(this.model, Permissions.permissions.delete_space)) return;
		if(!confirm(i18next.t('Really delete this space and all of its data (boards and notes)?'))) return;
		this.model.destroy()
			.catch(function(err) {
				log.error('space: delete: ', derr(err));
				barfr.barf(i18next.t('There was a problem deleting your space: {{message}}', {message: err.message}));
			});
	},

	leave_space: function(e)
	{
		if(e) e.stop();
		if(!turtl.connected) {
			barfr.barf(i18next.t('Leaving a space requires a connection to the Turtl server'));
			return;
		}
		if(!confirm(i18next.t('Really leave this space?'))) return;
		var member = this.model.get('members').find_user(turtl.user.id());
		if(!member) return false;
		return member.destroy()
			.bind(this)
			.then(function() {
				this.model.destroy({skip_remote_sync: true});
			})
			.catch(function(err) {
				if(err.disconnected) {
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem leaving the space'), err);
				log.error('spaces: edit: leave: ', err, derr(err));
			});
	}
});

