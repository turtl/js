var Note = Composer.RelationalModel.extend({
	base_url: '/notes',

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
		'keys',
		'body',
		'meta',
		'sort'
	],

	private_fields: [
		'type',
		'title',
		'tags',
		'url',
		'text',
		'embed'
	],

	init: function()
	{
		var save_old = function() {
			// keep a delayed record of the last tag set
			(function() {
				this.set({old_tags: this.get('tags').map(function(t) {
					return t.get('name');
				})}, {silent: true});
			}).delay(0, this);
		}.bind(this);
		this.bind('change:tags', save_old);
		save_old();
	},

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
	},

	has_tag: function(tagname)
	{
		return this.get('tags').find(function(t) {
			return t.get('name') == tagname;
		});
	},

	save: function(options)
	{
		options || (options == {});
		var url	=	this.id(true) ? '/notes/'+this.id() : '/projects/'+this.get('project_id')+'/notes';
		var fn	=	(this.id(true) ? tagit.api.put : tagit.api.post).bind(tagit.api);
		fn(url, {data: this.toJSON()}, {
			success: function(note_data) {
				this.set(note_data);
				if(options.success) options.success(note_data);
			}.bind(this),
			error: function (e) {
				barfr.barf('There was a problem saving your note: '+ e);
				if(options.error) options.error(e);
			}.bind(this)
		});
	}
}, Protected);

var Notes = Composer.Collection.extend({
	model: Note
});

var NotesFilter = Composer.FilterCollection.extend({
});
