Composer.sync = function(method, model, options)
{
	options || (options = {});

	var methods = {
		create: 'add',
		update: 'edit',
		delete: 'delete',
	};

	var action = methods[method];
	if(!action) return options.error(new Error('Composer.sync: bad method: '+method));
	if(!model.sync_type) return options.error(new Error('Composer.sync: bad sync type for model '+model.id()));

	var data = model.toJSON();
	if(action = 'add') {
		data.user_id = turtl.user.id();
	}
	turtl.core.send('profile:sync:model', action, model.sync_type, data)
		.then(options.success)
		.catch(options.error);
};

