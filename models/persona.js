var Persona = Composer.Model.extend({
	get_by_screenname: function(screenname, options)
	{
		options || (options = {});

		tagit.api.get('/personas/screenname/'+screenname, {}, options);
	}
});

var Personas = Composer.Collection.extend({
	model: Persona
});
