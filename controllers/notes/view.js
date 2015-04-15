var NotesViewController = Composer.Controller.extend({
	class_name: 'note',

	modal: null,

	model: null,

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('notes: view: no model passed');
		}
		this.modal = new TurtlModal({
			show_header: true,
			actions: [
				{name: 'menu', actions: [{name: 'Delete'}]}
			]
		});
		this.render();

		var url = '/notes/view/'+this.model.id();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.modal, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'edit': this.open_edit(); break;
				case 'delete': this.open_delete(); break;
			}
		});
		this.with_bind(this.model, 'destroy', close);

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController({inject: this.modal.el});
			actions.set_actions([{title: 'Edit note', name: 'edit', icon: '&#xe815;'}]);
			this.with_bind(actions, 'actions:fire', this.open_edit.bind(this, null));
			return actions;
		}.bind(this));
	},

	render: function()
	{
		var type_content = view.render('notes/types/'+this.model.get('type'), {
			note: this.model.toJSON(),
			empty: empty
		});
		this.html(view.render('notes/view', {
			note: this.model.toJSON(),
			content: type_content
		}));
		this.el.className = 'note view';
		this.el.addClass(this.model.get('type'));
		this.el.set('rel', this.model.id());

		// let the app know that we're displaying a note of this type
		var remove_class = function()
		{
			this.modal.el.className = this.modal.el.className.replace(/note-[a-z0-9]+/, '');
		}.bind(this);
		var body_class = 'note-'+this.model.get('type');
		remove_class();
		this.modal.el.addClass(body_class);
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new NotesEditController({
			model: this.model
		});
	},

	open_delete: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete this note?')) return false;
		this.model.destroy()
			.catch(function(err) {
				log.error('note: delete: ', derr(err));
				barfr.barf('There was a problem deleting your note: '+ err.message);
			});
	}
});

