Handlebars.registerHelper('equal', function(val1, val2, options) {
	if(val1 == val2)
	{
		return options.fn(this);
	}
	else
	{
		return options.inverse(this);
	}
});

Handlebars.registerHelper('contains', function(val1, val2, options) {
	if(Array.isArray(val1) && val1.contains(val2))
	{
		return options.fn(this);
	}
	else if(typeof(val1) == 'object' && val1[val2])
	{
		return options.fn(this);
	}
	else
	{
		return options.inverse(this);
	}
});

Handlebars.registerHelper('equal-or', function(_) {
	var vals = Array.prototype.slice.call(arguments, 0);
	var options = vals.pop();
	var val = vals.shift();
	if(vals.indexOf(val) >= 0)
	{
		return options.fn(this);
	}
	else
	{
		return options.inverse(this);
	}
});

Handlebars.registerHelper('gt', function(x, y, options) {
	if(x > y)
	{
		return options.fn(this);
	}
	else
	{
		return options.inverse(this);
	}
});

Handlebars.registerHelper('asset', function(url) {
	return asset(url);
});

Handlebars.registerHelper('sluggify', function(url) {
	return sluggify(url);
});

Handlebars.registerHelper('note-body', function(body) {
	return view.markdown(body);
});

Handlebars.registerHelper('note', function(note, options) {
	options || (options = {});
	var data = options.hash;
	var show_info = !!data.info;

	var empty =	true;
	if(note.title || note.text) empty = false;
	switch(note.type)
	{
		case 'image':
			empty = empty && !note.url && !(note.file && note.file.name);
			break;
		case 'file':
			empty = empty && !(note.file && note.file.name);
			break;
		case 'link':
			empty = empty && !note.url;
			break;
		case 'password':
			empty = empty && !note.username && !note.password;
			break;
	}
	var colors = NOTE_COLORS;

	if(note.type == 'link')
	{
		if(!note.title) note.title = note.url;
		var url = note.url;
		if(!url.match(/[a-z]+:\/\//)) url = 'http://'+url;
		note.title = '<a target="_blank" href="'+url+'">'+note.title+'</a>';
	}

	note.color_name = note.color > 0 ? colors[note.color] : '';
	var content = options.fn(note);
	// NOTE: this will probably bite me sometime in the future
	if(empty) content = '';

	var crypto_error = note.crypto_error;
	if(crypto_error)
	{
		var error_data = {
			boards: turtl.profile.get('boards')
				.filter(function(b) { return note.board_id == b.id; })
				.map(function(b) { return b.get('title'); }),
			key: null,
		}
	}

	var tags = null;
	if(note.tags && note.tags.length > 0) {
		tags = note.tags;
	}
	var board = null;
	if(note.board_id) {
		var board_model = turtl.profile.get('boards').get(note.board_id);
		board = board_model.get('title');
	}
	var has_body = note.text;
	var has_file = note.file && note.file.id;
	var rendered = view.render('notes/types/common', {
		note: note,
		crypto_error: crypto_error,
		error_data: error_data,
		has_file: has_file,
		has_body: has_body,
		show_info: show_info,
		empty: empty && !crypto_error,
		content: content,
		tags: tags,
		board: board,
	});
	return new Handlebars.SafeString(rendered);
});

Handlebars.registerHelper('icon', function(name, options) {
	options || (options = {});
	var data = options.hash || {};

	var hex = '';
	// see lib/app/functions.js
	var hex = icon(name);
	if(!hex) return '(invalid icon '+name+')';
	var classes = ['icon-'+name];
	if(data.class) classes.push(data.class);
	var html = '<icon class="'+classes.join(' ')+'">'+hex+'</icon>';
	return new Handlebars.SafeString(html);
});

Handlebars.registerHelper('svg', function(name) {
	var xml = svg(name);
	if(!xml) return '';
	return new Handlebars.SafeString(xml);
});

Handlebars.registerHelper('bytes', function(bytes, options) {
	if(bytes < 1024) return bytes + '';
	if(bytes < (1024 * 1024))
	{
		return (Math.round(10 * (bytes / 1024)) / 10) + 'kb';
	}
	if(bytes < (1024 * 1024 * 1024))
	{
		return (Math.round(10 * (bytes / (1024 * 1024))) / 10) + 'mb';
	}
	return (Math.round(10 * (bytes / (1024 * 1024 * 1024))) / 10) + 'gb';
});

Handlebars.registerHelper('json', function(obj, options) {
	return JSON.stringify(obj);
});

Handlebars.registerHelper('ago-time', function(timestamp) {
	var diff = new Date().getTime() - timestamp;
	var diffsec = Math.round(diff / 1000);
	var muls = [
		[60, function(n) { return i18next.t('{{n}} seconds ago', {n: n}); }],
		[60, function(n) { return i18next.t('{{n}} minutes ago', {n: n}); }],
		[24, function(n) { return i18next.t('{{n}} hours ago', {n: n}); }],
		[Number.POSITIVE_INFINITY, function(n) { return i18next.t('{{n}} days ago', {n: n}); }],
	];
	var str = '';
	for(var i = 0, next = diffsec; i < muls.length; i++) {
		var entry = muls[i];
		var mult = entry[0];
		var label_fn = entry[1];
		if(next < mult) {
			str = label_fn(Math.round(next));
			break;
		}
		next /= mult;
	};
	return str;
});

Handlebars.registerHelper('t', function(key, options) {
	// we do this song and dance to keep this function call out of the automated
	// "here's a list of active i18n strings" list
	var i18n_fn = i18next.t.bind(i18next);
	var result = i18n_fn(key, options.hash);
	return new Handlebars.SafeString(result);
});
