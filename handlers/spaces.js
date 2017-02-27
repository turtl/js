var spaces = {
	load: function(space_id) {
		if(!turtl.profile) throw new Error('can\'t load spaces without a profile');
		turtl.profile.set_current_space(space_id);
		turtl.route('/', {replace_state: true});
	}
};

