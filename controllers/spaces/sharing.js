var SpacesSharingController = Composer.Controller.extend({
	xdom: true,

	model: null,
	modal: null,

	init: function() {
		if(!this.model) this.model = turtl.profile.current_space();
		if(!this.model) throw new Error('space sharing: no spaces available');

		var title = i18next.t('Collaborators on "{{space}}"', {space: this.model.get('title')});
		this.modal = new TurtlModal({
			show_header: true,
			title: title,
		});

		this.render()
			.bind(this)
			.then(function() {
				this.modal.open(this.el);
			});
		var close = this.modal.close.bind(this.modal);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);
	},

	render: function() {
		var space = this.model.toJSON();
		console.log('space: ', space);
		return this.html(view.render('spaces/sharing', {
			space: space,
		}));
	},
});

