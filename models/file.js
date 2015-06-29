var NoteFile = Protected.extend({
	base_url: '/files',

	defaults: {
		synced: 0
	},

	public_fields: [
		'hash',
		'size',
		'upload_id',
		'has_data'
	],

	private_fields: [
		'name',
		'type',
		'meta'
	],

	creating_blob: false,

	clear: function()
	{
		this.revoke();
		return this.parent.apply(this, arguments);
	},

	toJSON: function()
	{
		var data = this.parent.apply(this, arguments);
		delete data.blob_url;
		return data;
	},

	find_key: function()
	{
		var note = this && this.get_parent && this.get_parent();
		if(note)
		{
			this.key = note.key;
			return this.key;
		}
		return this.parent.apply(this, arguments);
	},

	to_array: function(options)
	{
		options || (options = {});

		var hash = this.get('hash');
		if(!hash)
		{
			return Promise.reject(new Error('file: to_array: bad_hash'));
		}

		return turtl.db.files.get(hash).bind(this)
			.then(function(filedata) {
				if(!filedata)
				{
					this.set({has_data: 0});
					throw new Error('file: to_array: file data not present');
				}
				var file = new FileData();
				file.key = this.key;
				file.set(filedata);
				return file.deserialize();
			})
			.then(function(res) {
				var data = res.data;
				var buffer = new ArrayBuffer(data.length);
				var array = new Uint8Array(buffer);
				for(var i = 0, n = data.length; i < n; i++)
				{
					array[i] = data.charCodeAt(i);
				}
				return array;
			});
	},

	to_blob: function(options)
	{
		options || (options = {});

		if(this.creating_blob && !options.force) return Promise.reject({in_progress: true});

		if(!options.force) this.creating_blob = true;
		return this.to_array().bind(this)
			.then(function(array) {
				var blob = new Blob([array.buffer], {type: this.get('type')});
				if(!options.force)
				{
					this.set({blob_url: URL.createObjectURL(blob)}, options);
				}
				return blob;
			})
			.finally(function() {
				if(!options.force) this.creating_blob = false;
			});
	},

	revoke: function()
	{
		var blob_url = this.get('blob_url');
		if(!blob_url) return this;
		URL.revokeObjectURL(blob_url);
		this.unset('blob_url');
		return this;
	}
});

var FileData = Protected.extend({
	base_url: '/files',

	public_fields: [
		'id',
		'note_id',

		'synced',		// needed?
		'has_data'		// needed?
	],

	private_fields: [
		'data'
	],

	// -------------------------------------------------------------------------
	// hook into some of the Protected model's crypto functions.
	// -------------------------------------------------------------------------
	// we never HAD files when the old format existed, so we can just assume we
	// don't need this
	detect_old_format: function(data)
	{
		return data;
	},

	// set some binary-friendly options
	serialize: function(options)
	{
		options || (options = {});
		options.rawdata = true;
		options.skip_base64 = true;
		return this.parent.call(this, options);
	},

	// set some binary-friendly options
	deserialize: function(options)
	{
		options || (options = {});
		options.rawdata = true;
		return this.parent.call(this, options);
	},
	// -------------------------------------------------------------------------

	save: function(options)
	{
		options || (options = {});

		if(options.api_save)
		{
			var save_fn = get_parent(this);
			return turtl.db.files.get(this.id())
				.then(function(filedata) {
					if(!filedata)
					{
						log.error('files: save: missing file: ', this.id());
						throw new Error('file: missing file locally');
					}
					var data = filedata;
					// don't try to upload until we have a real note id
					if(!data.note_id || !data.note_id.match(/[0-9a-f]+/)) return false;
					var body = data.body;
					var data = {
						hash: data.id,
						cid: this.cid()
					};

					// convert body to Uint8Array
					var raw = new Uint8Array(body.length);
					for(var i = 0, n = body.length; i < n; i++)
					{
						raw[i] = body.charCodeAt(i);
					}

					// mark the save as raw and fire it off
					options.rawUpload = true;
					options.data = raw;
					options.args = data;
					this.url = '/notes/'+this.get('note_id')+'/file';
					options.uploadprogress = function(ev) {
						console.log('progress: ', ev);
					};
					return turtl.db.notes.get(this.get('note_id'));
				})
				.then(function(note_data) {
					if(!note_data) return false;
					var persona_id = false;
					if(note_data.meta && note_data.meta.persona)
					{
						options.args.persona = note_data.meta.persona;
					}
					return turtl.files.upload(this, save_fn, options);
				});
		}
		else
		{
			return this.parent.apply(this, arguments);
		}
	},

	destroy: function(options)
	{
		options || (options = {});

		if(options.api_save)
		{
			var parent_fn = get_parent(this);
			return turtl.db.notes.get(this.get('note_id')).bind(this)
				.then(function(note_data) {
					if(!note_data) note_data = {};
					var persona_id = false;
					if(!options.args) options.args = {};
					if(note_data.meta && note_data.meta.persona)
					{
						options.args.persona = note_data.meta.persona;
					}

					var _url = this.url;
					this.url = '/notes/'+this.get('note_id')+'/file';
					parent_fn.call(this, options);
					this.url = _url;
				});
		}
		else
		{
			return this.parent.call(this, options);
		}
	},

	/**
	 * wrapper around calling of download API to make some tricky things easier
	 * (properly handling redirects in various buggy browsers, mainly).
	 */
	_do_download: function(options)
	{
		var args = {hash: this.get('id')};
		if(options.persona) args.persona = options.persona;

		if(window._in_desktop || window.firefox || window.chrome)
		{
			// we're in desktop/FF. 302 redirect won't work, so we do it by hand
			// by asking the api to just send the URL for the file back.
			var do_download = function(url)
			{
				return new Promise(function(resolve, reject) {
					new Request({
						url: url,
						method: 'GET',
						responseType: 'arraybuffer',
						onSuccess: resolve,
						onProgress: function(event, xhr) {
							var progress = {total: event.total, loaded: event.loaded};
							if(options.progress) options.progress(progress, xhr);
						},
						onFailure: function(xhr) {
							var err = uint8array_to_string(xhr.response);
							reject({res: err, xhr: xhr});
						}
					}).send();
				});
			}.bind(this);

			// chrome/firefox are both being really bitchy about a very simple 302
			// redirect, so we essentially just do it ourselves here.
			args.disable_redirect = 1;
			return turtl.api.get('/notes/'+this.get('note_id')+'/file', args).bind(this)
				.then(do_download);
		}
		else
		{
			return turtl.api.get('/notes/'+this.get('note_id')+'/file', args, {
				responseType: 'arraybuffer',
				progress: options.progress
			});
		}
	},

	/**
	 * download a file's contents from the API and also notify the owning note
	 * that the file contents are ready to go.
	 */
	download: function(options)
	{
		options || (options = {});

		if(!this.get('note_id') || !this.get('id')) return Promise.reject(new Error('file: download: bad note id'));
		return turtl.db.notes.get(this.get('note_id')).bind(this)
			.then(function(note_data) {
				if(!note_data) throw new Error('file: download: missing note in local db');
				var persona_id = false;
				if(note_data.meta && note_data.meta.persona)
				{
					persona_id = note_data.meta.persona;
				}

				return this._do_download({ persona: persona_id, progress: options.progress });
			})
			.then(function(res) {
				var body = uint8array_to_string(res);

				this.set({data: body});

				var hash = this.id();
				var data = {
					id: hash,
					note_id: this.get('note_id'),
					body: body,
					synced: 1,
					has_data: 1
				};

				// clear out extra files
				var note = new Note({id: this.get('note_id')});
				note.clear_files({ exclude: [hash] });

				// save the file data into the db
				return turtl.db.files.update(data);
			})
			.then(function() {
				// now update the note so it knows it has file contents
				return turtl.db.notes
					.query()
					.only(this.get('note_id'))
					.modify({
						file: function(n) {
							n.file.hash = hash;
							// increment has_file. this notifies the in-mem
							// model to reload.
							var has_data = (n.file.has_data && n.file.has_data > 0 && n.file.has_data) || 0;
							console.log('file: download: has_data: ', has_data);
							n.file.has_data = has_data < 1 ? 1 : has_data + 1;
							return n.file;
						},
						has_file: 2
					})
					.execute();
			})
			.then(function(notedata) {
				if(notedata && notedata[0])
				{
					// TODO: wut?
					//turtl.sync.notify_local_change('notes', 'update', notedata[0]);
				}
				return this;
			})
			.catch(function(err) {
				log.error('file: download: save error: ', derr(err));
				throw err;
			});
	}
});

var Files = SyncCollection.extend({
	model: FileData,
	local_table: 'files',

	// used to track which files are currently downloading to this client.
	downloads: {},
	// used to track which files are currently uploading from this client.
	uploads: {},

	/**
	 * given notes that have files but don't have file data, create dummy file
	 * records for those files that will be filled in by the syncing system
	 *
	 * possible values for note.has_file:
	 *   0: has no file
	 *   1: has a file but doesn't have file data (or does but we aren't sure)
	 *   2: has a file and has data for that file
	 */
	create_dummy_file_records: function()
	{
		// this code creates empty file records in the files table from notes
		// that we know have file data
		//
		// what we do here is search for notes with has_file = 1 (0 is does not
		// have a file, 1 is has a file but not sure if the file record exists
		// in the files table, and 2 is note has a file and file record is 
		// definitely in the files table)
		return turtl.db.notes
			.query('has_file')
			.only(1)		// only query notes that we're uncertain if it has matching file record
			.execute()
			.then(function(res) {
				if(!res.length) return;
				log.info('sync: create dummy files: ', res.length);
				return Promise.all(res.map(function(notedata) {
					if(!notedata || !notedata.file || !notedata.file.hash) return false;

					var filedata = {
						id: notedata.file.hash,
						note_id: notedata.id,
						has_data: 0
					};
					return turtl.db.files.get(filedata.id).then(function(file) {
						// mark note as definitely having file record
						turtl.db.notes
							.query()
							.only(notedata.id)
							.modify({has_file: 2})
							.execute()
							.catch(function(err) {
								log.error('sync: notes: set has_file = 2', derr(err));
							});
						// no need to mess with the file record if we've got one already
						if(file) return false;
						// file record doesn't exist! add it.
						return turtl.db.files.update(filedata).catch(function(err) {
							log.error('sync: files: insert file record: ', derr(err));
						});
					});
				}));
			});
	},

	start_consumer: function()
	{
		// poll for blank file records and queue them for download
		turtl.sync.register_poller(this.queue_download_blank_files.bind(this))

		this.queue_consumer = new turtl.hustle.Queue.Consumer(function(job) {
			log.debug('files: job: ', job);
			switch(job.data.type)
			{
			case 'download':
				var model = this.create_remote_model(job.data.filedata);
				turtl.files.download(model, model.download).bind(this)
					.catch(function(err) {
						var xhr = err.xhr || {};
						if(job.releases > 3)
						{
							turtl.hustle.Queue.delete(job.id);
							log.error('files: download: giving up on '+ job.id +': too many releases', job.releases);
							return;
						}

						if(xhr.status == 404)
						{
							turtl.hustle.Queue.delete(job.id);
							log.error('files: download: giving up on '+ job.id +': got 404 while downloading');
							return;
						}

						turtl.hustle.Queue.release(job.id, {
							delay: 30,
							error: function(err) {
								log.error('files: download: release '+ job.id +': error releasing: ', err);
							}
						});
					});
				break;
			}
		}.bind(this), {
			tube: 'files',
			delay: turtl.sync.hustle_poll_delay,
			enable_fn: function() { return turtl.user.logged_in && turtl.poll_api_for_changes; }
		});
	},

	update_record_from_api_save: function(modeldata, record, options)
	{
		options || (options = {});

		log.info('save: '+ this.local_table +': mem -> db ', modeldata);

		// note that we don't need all the cid renaming heeby jeeby here since
		// we already have an id (the hash) AND the object we're attaching to
		// (teh note) must always have an id before uploading. so instead, we're
		// going to update the model data into the note's [file] object.
		var note_id = modeldata.note_id;
		var hash = modeldata.id;
		return turtl.db.files
			.query()
			.only(hash)
			.modify({synced: 1, has_data: 1})
			.execute()
			.catch(function(e) {
				console.error('file: error setting file.synced = true', e);
				throw e;
			})
			.then(function() {
				return turtl.db.notes
					.query()
					.only(note_id)
					.modify({
						file: function(note) {
							if(!note.file) note.file = {};
							note.file.hash = hash;
							note.file.has_data = (note.file.has_data || 0) + 1;
							return note.file;
						},
					})
					.execute();
			})
			.then(function(notedata) {
				if(notedata && notedata[0])
				{
					// TODO: wut?
					//turtl.sync.notify_local_change('notes', 'update', notedata[0]);
				}
			})
			.catch(function(err) {
				log.error('file: update from api save: update note: ', derr(err));
				throw err;
			});
	},

	queue_download_blank_files: function()
	{
		// grab the files collection, used to track downloads
		turtl.db.files
			.query('has_data')
			.only(0)
			.modify({has_data: -1})		// -1 means "in downloading limbo"
			.execute()
			.then(function(res) {
				return Promise.all(res.each(function(filedata) {
					if(!filedata.note_id) return false;
					var failues = 0;
					var do_add_queue_item = function()
					{
						log.debug('files: queue for download: ', filedata.id);
						turtl.hustle.Queue.put({type: 'download', filedata: filedata}, {
							tube: 'files',
							error: function(err) {
								log.error('files: queue download: ', derr(err));
								if(failures >= 2)
								{
									log.error('files: queue download: giving up ('+ failures +' fails)');
									return false;
								}
								failures++;
								do_add_queue_item.delay(1000);
							}
						});
					};
					do_add_queue_item();
				}));
			})
			.catch(function(e) {
				console.error('sync: files: download: ', e);
			});
	},

	sync_record_from_api: function(item)
	{
		if(!item.file || !item.file.hash) return false;

		var filedata = {
			_sync: item._sync,
			id: item.file.hash,
			note_id: item.id,
			has_data: 0
		};
		return this.parent.call(this, filedata);
	},

	track_file: function(type, track_id, trigger_fn, options)
	{
		options || (options = {});

		// download in progress? GTFO
		if(this[type][track_id]) return false;

		// track it
		this[type][track_id] = true;

		// hijack our completion functions so we can track the download
		var progress = options.progress;
		var uploadprogress = options.progress;

		this.trigger(type+'-start', track_id);

		options.progress = function(ev)
		{
			if(progress) progress.apply(this, arguments);
			this.trigger(type+'-progress', track_id, ev);
		}.bind(this);
		options.uploadprogress = function(ev)
		{
			if(uploadprogress) uploadprogress.apply(this, arguments);
			this.trigger(type+'-progress', track_id, ev);
		}.bind(this);

		// run the actual download
		log.debug('file: '+ type + ': ', track_id);
		return trigger_fn(options).bind(this)
			.then(function() {
				delete this[type][track_id];
				if(success) success.apply(this, arguments);
				this.trigger(type+'-success', track_id);
			})
			.catch(function(err) {
				var xhr = err.xhr || {};
				try
				{
					delete this[type][track_id];
					log.error('files: '+type+': error', xhr || e);
					this.trigger(type+'-error', track_id);
				}
				catch(e2)
				{
					log.error('files: '+type+': caught error while catching error: ', derr(e2));
				}
				throw err;
			});
	},

	download: function(model, save_fn, options)
	{
		options || (options = {});
		return this.track_file('downloads', model.id(), save_fn.bind(model), options);
	},

	upload: function(model, save_fn, options)
	{
		options || (options = {});
		return this.track_file('uploads', model.id(), save_fn.bind(model), options);
	}
});

