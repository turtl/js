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

	// TODO: empty state: files
	var empty =	false;
	switch(note.type)
	{
		case 'text':
			empty = !note.title && !note.text;
			break;
		case 'image':
		case 'link':
			empty = !note.title && !note.text && !note.url;
			break;
	}
	var colors = ['none','blue','red','green','purple','pink','brown','black'];

	if(note.type == 'link')
	{
		if(!note.title) note.title = note.url;
		note.title = '<a target="_blank" href="'+note.url+'">'+note.title+'</a>';
	}

	note.color_name = note.color > 0 ? colors[note.color] : '';
	var content = options.fn(note);
	var rendered = view.render('notes/types/common', {
		note: note,
		empty: empty,
		content: content
	});
	return new Handlebars.SafeString(rendered);
});

