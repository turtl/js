var ParamRouter = Composer.Class.extend({
	mapped: {},
	_cache: {},
	router: null,

	parse_routes: function(routes) {
		var rewritten = {};
		Composer.object.each(routes, function(routeobj, regex) {
			var paramed_key = this.convert_params_to_regex(regex);
			rewritten[paramed_key] = routeobj;

			// tie the regex route to the new, parameterized one
			this.mapped[paramed_key] = regex;
		}, this);
		return rewritten;
	},

	set_router: function(router) {
		this.router = router;
	},

	process: function(url) {
		var match = this.router.find_matching_route(url, this.mapped);
		if(!match) return {};

		var vals = match.args.slice(1);
		var param_keys = this.get_keys(match.route);

		var url_params = {};
		for(var i = 0, n = Math.min(vals.length, param_keys.length); i < n; i++)
		{
			url_params[param_keys[i]] = decodeURIComponent(vals[i]);
		}
		return url_params;
	},

	get: function() {
		if(!this.router) throw new Error('ParamRouter::get() -- cannot get params without first using set_router()');

		var url = this.router.cur_path();
		if(this._cache[url]) return this._cache[url];
		var params = this.process(url);
		this._cache[url] = params;
		return params;
	},

	convert_params_to_regex: function(regex) {
		return regex
			.replace(/:[a-z_]+\(([^\)]+)\)/gi, '($1)')
			.replace(/:[a-z_]+/gi, '([^/]+)');
	},

	get_keys: function(regex) {
		return (regex.match(/:[a-z_]+/g) || [])
			.map(function(key) { return key.replace(/^:/, ''); });
	}
});

