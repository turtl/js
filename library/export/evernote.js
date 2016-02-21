var EvernoteExport = {
	profile_to_evernote: function(profile)
	{
		var pad = function(str, num) { return ('000000'+str).slice(-num); };
		var datestr = function(date)
		{
			return [
				date.getUTCFullYear(), 
				pad((date.getUTCMonth() + 1)+'', 2),
				pad(date.getUTCDate(), 2),
				'T',
				pad(date.getUTCHours(), 2),
				pad(date.getUTCMinutes(), 2),
				pad(date.getUTCSeconds(), 2),
				'Z'
			].join('');
		};
		return view.render('modules/evernote-export', {
			export_date: datestr(new Date()),
			notes: profile.notes.map(function(note) {
				note._created = datestr(new Date(id_timestamp(note.id)));
				note._updated = datestr(new Date(note.mod * 1000));
				note._has_file = note.file && note.file._base64 && true;
				return note;
			})
		});
	},

	evernote_to_profile: function(str)
	{
	}
};
