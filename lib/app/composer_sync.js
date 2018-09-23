Composer.sync = function(method, model, options)
{
	options || (options = {});
	if(options.skip_remote_sync) return options.success(model.toJSON());

	var methods = {
		create: 'add',
		update: 'edit',
		delete: 'delete',
	};

	var action = methods[method];
	if(options.custom_method) action = options.custom_method;
	if(!action) return options.error(new Error('Composer.sync: bad method: '+method));
	if(!model.sync_type) {
		log.error('composer_sync: model has no sync_type: ', model);
		return options.error(new Error('Composer.sync: bad sync type for model '+model.id()));
	}

	var data = model.toJSON();
	if(action == 'add' && !data.user_id) {
		data.user_id = turtl.user.id();
	}
	turtl.core.send('profile:sync:model', action, model.sync_type, data)
		.then(options.success)
		.catch(function(err) {
			options.error(derr(err));
		});
};

