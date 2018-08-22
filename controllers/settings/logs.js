var LogsController = Composer.Controller.extend({
	xdom: true,

	elements: {
		'textarea[name="contents"]': 'contents',
		'select[name="lines"]': 'inp_lines',
	},

	events: {
		'change select[name="lines"]': 'change_lines',
	},

	model: null,

	init: function() {
		turtl.push_title(i18next.t('Debug log'), '/settings');
		this.render()
			.then(this.refresh_logs.bind(this));
	},

	render: function() {
		return this.html(view.render('settings/logs', {}));
	},

	refresh_logs: function(num_lines) {
		return (new App()).get_logs(num_lines)
			.bind(this)
			.then(function(logdata) {
				log.info('loaded log: '+logdata.length);
				this.contents.set('html', logdata);
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem loading the debug log'), err);
				log.error('settings: logs: ', derr(err));
			});
	},

	change_lines: function(e) {
		if(e) e.stop();
		if(!this.inp_lines) return;
		var num_lines = parseInt(this.inp_lines.get('value'));
		this.refresh_logs(num_lines);
	},
});


