var NotesViewController = Composer.Controller.extend({
	class_name: 'note',

	elements: {
		'.info-container': 'el_info',
		'.info-container .info': 'el_info_sub',
		'.info-container .info form input': 'inp_link'
	},

	events: {
		'click .note-gutter .content > h1': 'open_image',
		'click .info-container .preview form input': 'copy',
		'click .info-container .preview > ul': 'toggle_info'
	},

	modal: null,

	model: null,

	_last_scroll: null,

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
				{name: 'menu', actions: [/*{name: 'Edit'},*/ {name: 'Delete'}]}
			]
		});
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model, 'destroy', close);
		this.with_bind(this.modal, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'edit': this.open_edit(); break;
				case 'delete': this.open_delete(); break;
			}
		}.bind(this));
		this.with_bind(this.modal, 'scroll', function(scroll) {
			this.adjust_image_header(scroll);
			this.hide_info(scroll);
		}.bind(this));
		var interval = setInterval(function() {
			this.modal.trigger('scroll', this.modal.el.scrollTop);
		}.bind(this), 100);
		this.bind('release', clearInterval.bind(window, interval));

		var click_outside = function(e)
		{
			var inside = Composer.find_parent('.preview', e.target);
			if(inside || !this.el_info.hasClass('open')) return;
			this.toggle_info();
		}.bind(this);
		document.body.addEvent('click', click_outside);
		this.bind('release', function() { document.body.removeEvent('click', click_outside); });

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
			show_info: true
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
	},

	open_image: function(e)
	{
		if(e) e.stop();
		var url = this.model.get('url');
		var type = this.model.get('type');
		if(type != 'image' || !url) return;

		var img = this.el.getElement('.backing a img');
		if(!img) return;

		img.click();
	},

	copy: function(e)
	{
		if(e) e.stop();
		this.inp_link.select();
	},

	toggle_info: function(e)
	{
		if(e) e.stop();

		if(this.el_info.hasClass('open'))
		{
			this.el_info.removeClass('open');
		}
		else
		{
			this.el_info.addClass('open');
			this.inp_link.select();
		}
	},

	adjust_image_header: function()
	{
		if(this.model.get('type') != 'image') return;
		var header = Composer.find_parent('.turtl-modal', this.el).getElement('header');
		var scroll = this.modal.el.scrollTop;
		var img_bot = this.el.getElement('.backing').getCoordinates().height;
		if(scroll > img_bot)
		{
			header.addClass('scrolled');
		}
		else
		{
			header.removeClass('scrolled');
		}
	},

	hide_info: function(scroll)
	{
		if(this._last_scroll == scroll) return;
		this._last_scroll = scroll;

		if(this.el_info.hasClass('open')) return;

		if(scroll > 50 && !this.el_info.hasClass('scrolled'))
		{
			this.el_info.addClass('scrolled');
			this.el_info.removeClass('open');
			setTimeout(function() {
				if(scroll <= 50) return;
				this.el_info.addClass('hidden');
			}.bind(this), 300);
		}
		else if(scroll <= 50 && this.el_info.hasClass('scrolled'))
		{
			this.el_info.removeClass('hidden');
			setTimeout(function() {
				this.el_info.removeClass('scrolled');
			}.bind(this));
		}
	}
});

