var NoteFile = Protected.extend({
	base_url: '/files',

	defaults: {
		synced: 0
	},

	public_fields: [
		'id',
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

	has_data: function()
	{
		if(!this.id()) return Promise.reject('file: has_data: bad id');
		return turtl.db.files.get(this.id()).bind(this)
			.then(function(filedata) {
				if(!filedata) return false;
				return turtl.db.notes.get(filedata.note_id).bind(this)
					.then(function(notedata) {
						if(!notedata) return false;
						var size = ((notedata.file || {}).size || 0);
						if(size == 0) return false;
						return size <= (filedata.body || '').length;
					});
			});
	},

	to_array: function(options)
	{
		options || (options = {});

		var id = this.id()
		if(!id)
		{
			return Promise.reject(new Error('file: to_array: bad_id'));
		}

		return turtl.db.files.get(id).bind(this)
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

	// search in-mem notes for our key
	find_key: function()
	{
		var note_id = this.get('note_id');
		if(note_id) var note = turtl.profile.get('notes').get(note_id);
		if(note)
		{
			this.key = note.key;
			return this.key;
		}
		return this.parent.apply(this, arguments);
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

	upload: function(options)
	{
		options || (options = {});

		var url = null;
		var save_fn = function(options)
		{
			var data = options.data;
			delete options.data;
			if(!options.headers) options.headers = {};
			options.headers['Content-Type'] = 'application/octet-stream';
			return turtl.api.put(url, data, options);
		};
		return turtl.db.files.get(this.id()).bind(this)
			.then(function(filedata) {
				if(!filedata)
				{
					log.error('files: save: missing file: ', this.id());
					throw new Error('file: missing file locally');
				}
				var data = filedata;
				var note_id = data.note_id;
				// don't try to upload until we have a real note id
				if(!note_id) return false;

				url = '/notes/'+note_id+'/file';

				var body = data.body;
				var data = {
					id: this.id()
				};

				// convert body to Uint8Array
				var raw = new Uint8Array(body.length);
				for(var i = 0, n = body.length; i < n; i++)
				{
					raw[i] = body.charCodeAt(i);
				}

				// mark the save as raw and fire it off
				options.data = raw;
				options.querydata = data;
				var progressfn = options.uploadprogress;
				options.uploadprogress = function(ev) {
					progressfn.apply(this, arguments);
					log.info('progress: ', ev);
				};
				return turtl.db.notes.get(note_id)
					.then(function(note_data) {
						if(!note_data) return false;
						return save_fn(options);
					});
			});
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
	_do_download: function(note_id, options)
	{
		var args = {};
		if(window._in_desktop || window.firefox || window.chrome)
		{
			// we're in desktop/FF. 302 redirect won't work, so we do it by hand
			// by asking the api to just send the URL for the file back.
			var do_download = function(url)
			{
				var request = {
					url: url,
					method: 'get',
					timeout: 30000,
					response_type: 'arraybuffer',
					onprogress: function(event, xhr) {
						var progress = {total: event.total, loaded: event.loaded};
						if(options.progress) options.progress(progress, xhr);
					},
					onFailure: function(xhr) {
						var err = uint8array_to_string(xhr.response);
						reject({res: err, xhr: xhr});
					}
				};
				return Sexhr(request);
			}.bind(this);

			// chrome/firefox are both being really bitchy about a very simple 302
			// redirect, so we essentially just do it ourselves here.
			args.disable_redirect = 1;
			return turtl.api.get('/notes/'+note_id+'/file', args).bind(this)
				.then(do_download);
		}
		else
		{
			return turtl.api.get('/notes/'+note_id+'/file', args, {
				response_type: 'arraybuffer',
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

		var note_id = null;
		return turtl.db.files.get(this.id()).bind(this)
			.then(function(filedata) {
				if(!filedata) throw new Error('file: download: missing file data: '+ this.id());
				note_id = filedata.note_id;
				if(!note_id) throw new Error('file: download: bad note id: '+this.id());
				return turtl.db.notes.get(note_id)
			})
			.then(function(note_data) {
				if(!note_data) throw new Error('file: download: missing note in local db');
				return this._do_download(note_id, {progress: options.progress});
			})
			.spread(function(res, xhr) {
				var body = uint8array_to_string(res);

				//this.set({data: body});

				var id = this.id();
				var data = {
					id: id,
					note_id: note_id,
					body: body
				};

				// clear out extra files
				var note = new Note({id: note_id});
				return note.clear_files({ exclude: [id] }).bind(this)
					.then(function() {
						// save the file data into the db
						return turtl.db.files.update(data);
					});
			})
			.then(function(notedata) {
				var note = turtl.profile.get('notes').get(note_id);

				if(note && note.get('file'))
				{
					note.get('file').trigger('change');
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

	consumers: {},

	start_syncing: function()
	{
		this.setup_uploader();
		this.setup_downloader();
	},

	stop_syncing: function()
	{
		['upload', 'download'].forEach(function(key) {
			var consumer = this.consumers[key];
			if(!consumer) return;
			consumer.stop();
			delete this.consumers[key];
		}.bind(this));
	},

	setup_uploader: function()
	{
		if(this.consumers.upload) this.consumers.upload.stop();
		this.consumers.upload = new turtl.hustle.Queue.Consumer(function(job) {
			log.info('file: upload: ', job);
			var file = new FileData({id: job.data.id});
			var progress_counter = 0;
			var progressfn = function()
			{
				progress_counter = (progress_counter + 1) % 10;
				if(progress_counter == 0)
				{
					turtl.hustle.Queue.touch(job.id);
				}
			};
			turtl.files.upload(file, file.upload, {uploadprogress: progressfn}).bind(this)
				.then(function(sync) {
					(sync.sync_ids || []).map(turtl.sync.ignore_on_next_sync.bind(turtl.sync));
					return turtl.hustle.Queue.delete(job.id);
				})
				.catch(function(err) {
					log.error('file: upload: ', err);
					if(job.releases > 2)
					{
						turtl.events.trigger('ui-error', 'There was a problem uploading a file. View it in the "Sync" panel in the main menu.', err);
						log.error('file: upload: ', file.id(), derr(err));
						// bury the item (will be available for inspection in the
						// sync page)
						return turtl.hustle.Queue.bury(job.id);
					}
					else
					{
						// try again in 30s
						return turtl.hustle.Queue.release(job.id, {delay: 30});
					}
				});
		}.bind(this), {
			tube: 'files:upload',
			delay: turtl.sync.hustle_poll_delay,
			enable_fn: function() {
				return turtl.user.logged_in && turtl.sync_to_api && turtl.sync.connected
			}
		});
	},

	setup_downloader: function()
	{
		if(this.consumers.download) this.consumers.download.stop();
		this.consumers.download = new turtl.hustle.Queue.Consumer(function(job) {
			log.info('file: download: ', job);
			var file = new FileData({id: job.data.id});
			var progress_counter = 0;
			var progressfn = function()
			{
				progress_counter = (progress_counter + 1) % 10;
				if(progress_counter == 0)
				{
					turtl.hustle.Queue.touch(job.id);
				}
			};
			turtl.files.download(file, file.download, {progress: progressfn}).bind(this)
				.then(function() {
					return turtl.hustle.Queue.delete(job.id);
				})
				.catch(function(err) {
					log.error('file: download: ', err);
					if(job.releases > 2)
					{
						turtl.events.trigger('ui-error', 'There was a problem downloading a file. View it in the "Sync" panel in the main menu.', err);
						log.error('file: download: ', file.id(), derr(err));
						// bury the item (will be available for inspection in the
						// sync page)
						return turtl.hustle.Queue.bury(job.id);
					}
					else
					{
						// try again in 30s
						return turtl.hustle.Queue.release(job.id, {delay: 30});
					}
				});
		}.bind(this), {
			tube: 'files:download',
			delay: turtl.sync.hustle_poll_delay,
			enable_fn: function() {
				return turtl.user.logged_in && turtl.sync_to_api && turtl.sync.connected
			}
		});
	},

	track_file: function(type, track_id, trigger_fn, options)
	{
		options || (options = {});

		// download in progress? GTFO
		if(this[type][track_id])
		{
			log.warn('files: track: operation in progress: ', type, track_id);
			return Promise.resolve({});
		}

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
			.tap(function() {
				delete this[type][track_id];
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

