var SpacesEditController = FormController.extend({
	elements: {
		'input[name=title]': 'inp_title'
	},

	events: {
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
	},

	render: function()
	{
		this.html(view.render('spaces/edit', {
			action: this.action,
			space: this.model.toJSON(),
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

		this.model.create_or_ensure_key({silent: true});
		var clone = this.model.clone();
		clone.set({title: title});
		clone.save()
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());

				// add the space to our main space list
				turtl.profile.get('spaces').upsert(this.model);

				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that space'), err);
				log.error('space: edit: ', this.model.id(), derr(err));
			});
	}
});

