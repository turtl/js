var Tag = Composer.Model.extend({
	id_key: 'name',

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
		var data = this.parent.apply(this, arguments);
		return data.name;
	}
});

var Tags = Composer.Collection.extend({
	model: Tag
});

