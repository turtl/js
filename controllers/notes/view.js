var NotesViewController = Composer.Controller.extend({
	class_name: 'note',

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('notes: view: no model passed');
		}
		this.render();

		var url = '/notes/view/'+this.model.id();
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		turtl.push_title('View note', turtl.last_url);
		this.bind('release', turtl.pop_title.bind(null, false));

		this.with_bind(this.model, 'change', this.render.bind(this));

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [{name: 'Edit'}, {name: 'Delete'}]}
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'edit': this.open_edit(); break;
				case 'delete': this.open_delete(); break;
			}
		});
		this.bind('release', function() {
			turtl.events.trigger('header:set-actions', false);
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

