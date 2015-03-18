var Tag = Composer.Model.extend({
	defaults: {
		count: 1	// the number of notes referencing this tag
	},

	initialize: function(data, options)
	{
		if(typeOf(data) == 'string')
		{
			data = {name: data};
		}
		return this.parent.apply(this, [data, options]);
	},

	count: function(inc, options)
	{
		options || (options = {});
		var newcount = this.get('count') + inc;
		this.set({count: newcount}, options);
		return newcount;
	},

	toJSON: function()
	{
		var data = this.parent.apply(this, arguments);
		if(window._toJSON_disable_protect)
		{
			return data;
		}
		else
		{
			return data.name;
		}
	}
});

var Tags = Composer.Collection.extend({
	model: Tag,

	add_tag: function(tag, options)
	{
		options || (options = {});
		var id = tag.get('name');
		var found = this.find_by_id(id);
		if(found)
		{
			found.count(1, options);
			return found;
		}
		else
		{
			var json = tag.toJSON();
			json.count = 1;
			var copy = new Tag({id: id, count: 1});
			this.add(copy, options);
			return copy;
		}
	},

	// NOTE: this doesn't actually *remove* the tag unless the count gets to zero
	remove_tag: function(tag, options)
	{
		options || (options = {});
		var id = tag.get('name');
		var found = this.find_by_name(id);
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

