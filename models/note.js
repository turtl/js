var Note = SyncModel.extend({
	sync_type: 'note',

	relations: {
		tags: { collection: 'Tags' },
		file: { model: 'NoteFile' }
	},

	public_fields: [
		'id',
		'space_id',
		'board_id',
		'user_id',
		'file',
		'has_file',
		'keys',
		'mod'
	],

	private_fields: [
		'type',
		'title',
		'tags',
		'url',
		'username',
		'password',
		'text',
		'embed',
		'color',
	],

	initialize: function() {
		this.bind('file-id', function() {
			if(this.get('file').get('name')) {
				this.get('file').set({id: this.id()});
			}
		}.bind(this));
		this.bind('change', function() {
			this.trigger('file-id');
		}.bind(this));
		return this.parent.apply(this, arguments);
	},

	init: function(options)
	{
		options || (options = {});
		this.parent();

		var set_mod = function()
		{
			if(this.get('mod')) return;
			var mod = id_timestamp(this.id(), {unix: true});
			this.set({mod: mod}, {silent: true});
		}.bind(this);
		this.bind('change:id', set_mod);
		set_mod();

		this.bind('change:id', function() {
			var id = this.id();
			var ts = id_timestamp(id);
			this.set({created: ts});
		}.bind(this));
		this.trigger('change:id');

		this.trigger('file-id');
	},

	add_tag: function(tag)
	{
		var tags = this.get('tags');
		if(tags.find(function(t) { return t.get('name') == tag; })) return false;
		tags.add({name: tag});
		return true;
	},

	remove_tag: function(tag)
	{
		var tags = this.get('tags');
		var found = tags.select({name: tag});
		found.each(function(t) {
			tags.remove(t);
		});
	},

	has_tag: function(tagname)
	{
		return this.get('tags').find(function(t) {
			return t.get('name') == tagname;
		});
	},

	move_spaces: function(new_space_id) {
		this.set({space_id: new_space_id});
		return this.save({custom_method: 'move-space'});
	},

	incoming_sync: function(sync_item) {
		if(sync_item.type == 'note') {
			return this.parent(sync_item);
		}

		if(sync_item.type == 'file') {
			switch(sync_item.action) {
				case 'add':
				case 'edit':
					this.get('file').reset(sync_item.data);
					// TODO: load file for preview if image
					break;
				case 'delete':
					this.get('file').clear();
					break;
			}
		}
	},
});

var Notes = SyncCollection.extend({
	model: Note,
	sync_type: 'note',

	incoming_sync: function(sync_item) {
		// DO NOTHING IF ADDING
		//
		// we don't want notes being added to our collection from syncs, we only
		// want them added via searches (which will happen elsewhere).
		if(sync_item.action == 'add') return;

		// not an add, call the parent incoming_sync fn
		return this.parent.apply(this, arguments);
	}
});

