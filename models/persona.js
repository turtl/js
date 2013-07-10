var Persona = Composer.Model.extend({
	base_url: '/personas',

	public_fields: [
		'id',
		'pubkey',
		'screenname',
		'name',
		'email'
	],

	private_fields: [
		'secret',
		'privkey'
	],

	destroy_persona: function(options)
	{
		options || (options = {});
		this.get_challenge({
			success: function(res) {
				var challenge = res;
				options.args = {challenge: this.generate_response(challenge)};
				this.destroy(options);
			}.bind(this),
			error: options.error
		});
	},

	get_by_screenname: function(screenname, options)
	{
		options || (options = {});
		var args = {};

		// this prevents a persona from returning from the call if it is already
		// the owner of the screenname
		if(options.ignore_this_persona && this.id(true))
		{
			args.ignore_persona_id = this.id(true);
		}
		tagit.api.get('/personas/screenname/'+screenname, args, options);
	},

	generate_secret: function(key)
	{
		return tcrypt.encrypt(key, tcrypt.uuid()).toString().replace(/:.*/, '');
	},

	get_challenge: function(options)
	{
		options || (options = {});
		var args = {};
		if(options.expire) args.expire = options.expire;
		if(options.persist) args.persist = 1;
		tagit.api.post('/personas/'+this.id()+'/challenge', args, {
			success: function(challenge) {
				if(options.persist) this.challenge = challenge;
				if(options.success) options.success(challenge);
			}.bind(this),
			error: options.error
		});
	},

	generate_response: function(challenge)
	{
		return tcrypt.hash(this.get('secret') + challenge);
	}
}, Protected);

var Personas = Composer.Collection.extend({
	model: Persona
});
