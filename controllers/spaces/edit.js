var SpacesEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
		'click a[rel=delete]': 'delete_space',
		'click a[rel=leave]': 'leave_space',
	},

	modal: null,
	model: null,
	formclass: 'spaces-edit',

	init: function()
	{
		if(!this.model) this.model = new Space();
		this.action = this.model.is_new() ? 'Create': 'Edit';

		this.modal = new TurtlModal({
			show_header: true,
			title: this.action + ' space'
		});

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
		this.with_bind(this.model, 'destroy', close);
	},

	render: function()
	{
		var my_spaces = turtl.profile.get('spaces')
			.filter(function(space) { return !space.is_shared(); });
		this.html(view.render('spaces/edit', {
			action: this.action,
			space: this.model.toJSON(),
			shared: this.model.is_shared(),
			last_space: my_spaces.length <= 1,
			is_new: this.model.is_new(),
		}));
		if(this.model.is_new())
		{
			this.inp_title.focus.delay(300, this.inp_title);
		}
	},

	submit: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value').toString().trim();

		var errors = [];
		if(!title) errors.push(i18next.t('Please give your space a title'));

		if(errors.length)
		{
			barfr.barf(errors.join('<br>'));
			return;
		}

		var is_new = this.model.is_new();
		this.model.create_or_ensure_key({silent: true});
		var clone = this.model.clone();
		clone.set({title: title});
		clone.save()
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());

				// add the space to our main space list
				turtl.profile.get('spaces').upsert(this.model);

				if(is_new) {
					turtl.profile.set_current_space(this.model.id());
				}

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that space'), err);
				log.error('space: edit: ', this.model.id(), derr(err));
			});
	},

	delete_space: function(e)
	{
		if(e) e.stop();
		if(!confirm(i18next.t('Really delete this space and all of its data (boards and notes)?'))) return;
		this.model.destroy()
			.catch(function(err) {
				log.error('space: delete: ', derr(err));
				barfr.barf(i18next.t('There was a problem deleting your space: {{message}}', {message: err.message}));
			});
	}
});

