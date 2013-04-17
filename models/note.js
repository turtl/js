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
		'link',
		'body',
		'image',
		'embed'
	]
}, Protected);

var Notes = Composer.Collection.extend({
	model: Note
});
