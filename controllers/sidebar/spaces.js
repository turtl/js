const SidebarSpacesController = Composer.Controller.extend({
	xdom: true,

	elements: {
		'.filter input[name=filter]': 'inp_space_filter',
	},

	events: {
		'input .spaces .filter input[name=filter]': 'filter_spaces',
		'keyup .spaces .filter input[name=filter]': 'filter_spaces',
		'click .spaces .filter icon': 'clear_space_filter',
		'click .spaces li.add a': 'add_space',
		'click .spaces a.edit': 'edit_space',
	},

	spaces: null,
	space_filter: null,
	viewstate: {},
	sortfn: function(_) { return 0; },

	init: function() {
		this.spaces = new Composer.FilterCollection(turtl.profile.get('spaces'), {
			filter: function(b) {
				var is_in_filter = this.space_filter ?
					fuzzysearch(this.space_filter.toLowerCase(), b.get('title').toLowerCase()) :
					true;
				return is_in_filter;
			}.bind(this),
			sortfn: this.sortfn(Spaces.prototype.sortfn),
		});

		this.render();

		var render_timer = new Timer(50);
		this.with_bind(render_timer, 'fired', this.render.bind(this));
		this.bind('render-async', render_timer.reset.bind(render_timer));
		this.bind('space-filter', function() {
			this.spaces && this.spaces.refresh({diff_events: false});
			this.trigger('render-async');
		}.bind(this));

		this.with_bind(this.spaces, ['add', 'remove', 'change', 'reset'], this.trigger.bind(this, 'render-async'));

		this.bind('release', function() {
			this.spaces.detach();
			this.spaces = null;
		}.bind(this));
	},

	render: function() {
		if(!turtl.profile) return Promise.resolve();
		var current_space = turtl.profile.current_space();
		if(!current_space) return Promise.resolve();
		var cur_space = current_space.toJSON();
		var spaces = this.spaces;
		var space_data = spaces
			.toJSON()
			.map(function(space) { 
				if(space.id == current_space.id()) space.current = true;
				if(space.user_id != turtl.user.id()) space.shared = true;
				space.color = spaces.get(space.id).get_color();
				return space;
			});
		return this.html(view.render('sidebar/spaces', {
			state: this.viewstate,
			cur_space: cur_space,
			spaces: space_data,
			space_filter_active: !!this.space_filter,
		}));
	},

	filter_spaces: function(e) {
		var filter = this.inp_space_filter.get('value');
		if(e) {
			if(e.key == 'enter') {
				var space_a = this.el.getElement('ul.spaces li a.go');
				if(space_a) space_a.click();
				return;
			}
			if(e.key == 'esc') {
				e.stop();
				// if hitting esc on empty filters, close sidebar
				if(filter == '') return this.close();
				filter = null;
				this.inp_space_filter.set('value', '');
			}
		}
		this.space_filter = filter ? filter : null;
		this.trigger('space-filter');
	},

	clear_space_filter: function(e) {
		var current = this.inp_space_filter.get('value');
		if(current == '') return;
		this.inp_space_filter.set('value', '');
		this.filter_spaces();
	},

	add_space: function(e) {
		if(e) e.stop();
		this.close();
		new SpacesEditController();
	},

	edit_space: function(e) {
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var space_id = li.get('rel');
		if(!space_id) return;
		this.close();
		var space = turtl.profile.get('spaces').get(space_id);
		new SpacesEditController({
			model: space,
		});
	},

	close: function(e) {
		this.trigger('close');
	},
});

