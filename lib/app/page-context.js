/**
 * This is a module that sits inbetween an interface and the keyboard bindings.
 * The idea is you want the most prominent interface to capture the keyboard
 * bindings exclusively (in a generic way) and keep control of it until another
 * interface supersedes it or it closes and relinquishes control to the one it
 * took control from.
 */
const PageContext = Composer.Event.extend({
	contexts: [],

	initialize: function() {
		turtl.keyboard.bind('all', function(_args) {
			const context = this.contexts[0] && this.contexts[0].context;
			if(!context) return;
			context.trigger.apply(context, arguments);
		}.bind(this));
	},

	grab: function(controller) {
		if(!(controller instanceof Composer.Controller)) {
			throw new Error('PageContext.grab() -- you must pass a composer controller');
		}

		const cid = controller.cid();
		const context = new Composer.Event();
		controller.bind('release', function() {
			this.contexts = this.contexts.filter(function(c) {
				if(c.id != cid) return true;
				c.context.unbind();
				return false;
			});
		}.bind(this));
		this.contexts.unshift({id: cid, context: context});
		return context;
	},
});

