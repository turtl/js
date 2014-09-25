// this is a config for resources that require authentication. the api uses this
// to decide whether or not to use user auth (and subsequently SSL)
config.auth = [
	// join is auth-free
	{method: 'POST', resource: '/users', auth: false},

	// so is logging
	{method: 'POST', resource: '/log/error', auth: false},

	// EVERYTHING ELSE needs auth
	{method: 'GET', resource: '.*', auth: true}
];
