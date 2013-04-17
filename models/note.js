var Note = Composer.RelationalModel.extend({
	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'project_id',
		'body',
		'meta',
		'sort'
	],

	private_fields: [
		'tags',
		'link',
		'body',
		'image',
		'embed'
	],

	add_tag: function(tag)
	{
		var tags = this.get('tags');
		if(tags.find(function(t) { return t.get('name') == tag; })) return false;
		tags.add({name: tag});
		return true;
	},

	remove_tag: function(tag)
	{
		var tags = this.get('tags');
		var found = tags.select({name: tag});
		found.each(function(t) {
			tags.remove(t);
		});
	}
}, Protected);

var Notes = Composer.Collection.extend({
	model: Note
});
