const LoadErrorController = Composer.Controller.extend({
	inject: '#main',
	xdom: true,
	class_name: 'load-error',

	error: null,

	init: function() {
		turtl.push_title(i18next.t('Error'));
		this.render();
	},

	render: function() {
		return this.html(view.render('error/index', {
			error_msg: derr(this.error),
			error_raw: this.error,
		}));
	},
});

