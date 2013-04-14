var config = {
	user_cookie: 'musio:user',

	profile: {
		// must be kept in sync with API
		featured: {
			num_audio: 5,
			num_photos: 10
		},

		media: {
			default_per_page: 24
		}
	},

	player: {
		/*
		 *	track_autolink_ogg
		 *
		 *	whether to automatically reference ogg files in the audio tag
		 * 	when the track href is an mp3 file
		 *
		 *	ex: if track.href = "song.mp3" and track_autolink_ogg = true,
		 *  	then we'll add "song.ogg" to our HTML5 audio tag as well.
		 */
		track_autolink_ogg: true,
		
		/*
		 *	track_autolink_mp3
		 *
		 *	whether to automatically reference mp3 files in the audio tag
		 * 	when the track href is an ogg file
		 *
		 *	ex: if track.href = "song.ogg" and track_autolink_mp3 = true,
		 *  	then we'll add "song.mp3" to our HTML5 audio tag as well.
		 */
		track_autolink_mp3: true,
		
		/*
		 *	If the .ogg files are in a different directory, use this to
		 *	specify a relative path
		 */
		track_ogg_storage_path: '',
		//track_ogg_storage_path: '../ogg',

		/*
		 *	If the .mp3 files are in a different directory, use this to
		 *	specify a relative path
		 */
		track_mp3_storage_path: '',
		//track_mp3_storage_path: '../mp3'

		default_album_cover: '/images/template/app_bar/default_album_cover.png'
	}
};
