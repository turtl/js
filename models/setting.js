var Setting = Composer.Model.extend({
	value: function(value, options)
	{
		options || (options = {});
		if(typeof value == 'undefined')
		{
			return this.get('value');
		}
		else
		{
			this.set({value: value}, options);
		}
	}
});

var Settings = Composer.Collection.extend({
	model: 'Setting',

	get_by_key: function(key, options)
	{
		options || (options = {});
		var setting = this.find(function(setting) {
			return setting.get('key') == key;
		});

		if(!setting && !options.skip_create)
		{
			var setting = new Setting({key: key});
			this.add(setting);
		}
		return setting;
	},

	clear_setting: function(key)
	{
		var setting = this.find(function(setting) {
			return setting.get('key') == key;
		});

		if(!setting) return;
		this.remove(setting);
	}
});

