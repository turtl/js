var Backstate = Composer.Class.extend({
	states: [],

	/**
	 * push a state (really, means pushing the back action for that state) with
	 * an id that makes it easy to identify whether a popping state is the
	 * correct one for a given action
	 */
	push: function(fn, id)
	{
		this.states.push({id: id, fn: fn});
	},

	/**
	 * go back in the state
	 */
	back: function()
	{
		var fn = this.pop(false);
		if(!fn) return false;
		return fn();
	},

	/**
	 * pop gets the next entry off the list without running it. if an id is
	 * specified, it must match the entry of the next item to effectively pop.
	 */
	pop: function(id)
	{
		var len = this.states.length;
		if(len == 0) return false;
		// make sure the passed id matches the next item before popping. this
		// ensures that we don't double-fire our pop
		if(id && this.states[len - 1].id != id) return false;
		var entry = this.states.pop();
		return entry.fn;
	},

	/**
	 * test if empty
	 */
	empty: function()
	{
		return this.states.length == 0;
	},

	/**
	 * clear all back states
	 */
	clear: function()
	{
		this.states = [];
	}
});

