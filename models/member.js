var Member = Composer.Model.extend({
	get_email: function() {
		return this.get('username');
	}
});

var Members = SyncCollection.extend({
	model: Member
});

