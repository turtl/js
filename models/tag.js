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

	toJSON: function()
	{
		var data	=	this.parent.apply(this, arguments);
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

	refresh_from_notes: function(notes_collection)
	{
		if(!notes_collection) return false;
		this.clear();
		notes_collection.models().each(function(p) {
			var tags = p.get('tags', []);
			tags.each(function(t) {
				var exists = this.find(function(_t) {
					return _t.get('name') == t.get('name');
				});
				if(exists)
				{
					exists.set({count: exists.get('count', 0) + 1});
				}
				else
				{
					// copy, don't use ref
					this.add(t.toJSON());
				}
			}.bind(this));
		}.bind(this));
		return this;
	}
});
