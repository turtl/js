var Tag = Composer.Model.extend({
	id_key: 'name',
	defaults: {
		count: 0
	},

	initialize: function(data, options)
	{
		if(typeOf(data) == 'string')
		{
			data = {name: data};
		}
		this.bind('change:count', function() {
			if(this.get('count', 0) == 0)
			{
				this.set({disabled: true});
			}
			else
			{
				this.unset('disabled');
			}
		}.bind(this));
		return this.parent.apply(this, [data, options]);
	},

	disabled: function()
	{
		return this.get('count', 0) === 0;
	}
});

var Tags = Composer.Collection.extend({
	model: Tag,

	count_reset: function(tagobj)
	{
		var arr = [];
		Object.each(tagobj, function(count, tag) {
			arr.push({name: tag, count: count});
		});
		this.reset(arr);
	},

	count_update: function(tagobj)
	{
		Object.each(tagobj, function(count, tagname) {
			this.upsert(new Tag({name: tagname, count: count}));
		}.bind(this));
	},

	find_by_name: function(tagname)
	{
		return this.find(function(t) { return t.get('name') == tagname; });
	},

	add_tag: function(tag, options)
	{
		options || (options = {});
		var found = this.find_by_name(tag.get('name'));
		if(found)
		{
			found.count(1, options);
			return found;
		}
		else
		{
			var json = tag.toJSON();
			json.count = 1;
			var copy = new Tag(json);
			this.add(copy, options);
			return copy;
		}
	},

	// NOTE: this doesn't actually *remove* the tag unless the count gets to zero
	remove_tag: function(tag, options)
	{
		options || (options = {});
		var found = this.find_by_name(tag.get('name'));
		if(!found) return false;  // odd, but worth checking for

		var count = found.count(-1, options);
		if(count == 0)
		{
			this.remove(found, options);
			return true;
		}
		return found;
	},

	add_tags_from_note: function(note)
	{
		note.get('tags').each(function(t) {
			this.add_tag(t);
		}.bind(this));
	},

	remove_tags_from_note: function(note)
	{
		note.get('tags').each(function(t) {
			this.remove_tag(t);
		}.bind(this));
	},

	diff_tags_from_note: function(note)
	{
		var old_tags = (note.get('old_tags') || []);
		var new_tags = note.get('tags').map(function(t) { return t.get('name'); });

		arrdiff(old_tags, new_tags).each(function(tagname) {
			var tmptag = new Tag(tagname);
			this.remove_tag(tmptag);
		}, this);

		arrdiff(new_tags, old_tags).each(function(tagname) {
			var tmptag = new Tag(tagname);
			this.add_tag(tmptag);
		}, this);
	},

	refresh_from_notes: function(notes_collection, options)
	{
		options || (options = {});
		if(!notes_collection) return false;
		this.clear();
		notes_collection.models().each(function(p) {
			var tags = p.get('tags', []);
			tags.each(function(t) {
				this.add_tag(t, options);
			}.bind(this));
		}.bind(this));
		return this;
	}
});

var TagsFilter = Composer.FilterCollection.extend({
	filter: function(m) { return true; },
	sortfn: function(a, b) {
		var diff = b.get('count') - a.get('count');
		// secondary alpha sort
		if(diff == 0) diff = a.get('name').localeCompare(b.get('name'));
		return diff;
	},
	forward_all_events: false,
	refresh_on_change: false
});
