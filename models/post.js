var Post = Composer.RelationalModel.extend({
	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		}
	}
});

var Posts = Composer.Collection.extend({
	model: Post
});
