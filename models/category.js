var Category = Composer.RelationalModel.extend({
	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		}
	},

	update_tags: function(tag_collection)
	{
		if(!tag_collection) return false;
		var tags = this.get('tags');
		tags.clear();
		tag_collection.each(function(t) {
			if(t.get('category') != this.get('name'))  return false;
			// copy, don't use ref
			tags.add(t.toJSON());
		}.bind(this));
		return this;
	}
});

var Categories = Composer.Collection.extend({
	model: Category
});
