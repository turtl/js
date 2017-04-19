var Member = Composer.Model.extend({
	// used by the member controller
	get_email: function() {
		var email = this.get('username');
		return email && email.toLowerCase();
	}
});

var Members = SyncCollection.extend({
	model: Member
});

