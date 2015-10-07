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

Handlebars.registerHelper('asset', function(url) {
	return asset(url);
});

Handlebars.registerHelper('sluggify', function(url) {
	return sluggify(url);
});

Handlebars.registerHelper('markdown', function(body) {
	return view.markdown(body);
});

Handlebars.registerHelper('note', function(note, options) {
	options || (options = {});
	var data = options.hash;
	var show_info = !!data.info;

	// TODO: empty state: files
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
	}
	var colors = NOTE_COLORS;

	if(note.type == 'link')
	{
		if(!note.title) note.title = note.url;
		note.title = '<a target="_blank" href="'+note.url+'">'+note.title+'</a>';
	}

	var have_boards, boards;
	if(show_info)
	{
		var pboards = turtl.profile.get('boards');
		have_boards = pboards.size() > 0;
		have_boards = have_boards && note.boards.length > 0;
		boards = pboards.toJSON_named((have_boards && note.boards) || []);
	}

	note.color_name = note.color > 0 ? colors[note.color] : '';
	var content = options.fn(note);
	// NOTE: this will probably bite me sometime in the future
	if(empty) content = '';

	var rendered = view.render('notes/types/common', {
		note: note,
		show_info: show_info,
		have_boards: have_boards,
		boards: boards,
		empty: empty,
		content: content
	});
	return new Handlebars.SafeString(rendered);
});

Handlebars.registerHelper('icon', function(name, options) {
	options || (options = {});
	var data = options.hash || {};

	var hex = '';
	// see library/functions.js
	var hex = icon(name);
	if(!hex) return '(invalid icon '+name+')';
	var html = '<icon';
	if(data.class) html += ' class="'+ data.class +'"';
	html += '>'+ hex +'</icon>';
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
		[60, 'Just now'],
		[60, '{n} minutes ago'],
		[24, '{n} hours ago'],
		[Number.POSITIVE_INFINITY, '{n} days ago']
	];
	var str = '';
	for(var i = 0, next = diffsec; i < muls.length; i++)
	{
		var entry = muls[i];
		var mult = entry[0];
		var label = entry[1];
		if(next < mult)
		{
			str = label.replace(/\{n\}/, Math.round(next));
			break;
		}
		next /= mult;
	};
	return str;
});
