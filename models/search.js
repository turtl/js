var Search = Composer.Collection.extend({
	total: 0,

	search: function(search, options) {
		search || (search = {});
		options || (options = {});

		// create a search object rust understands. it's only slightly different
		// from the js version, but there is some conversion and i don't want to
		// rewrite all the js queries, so here we are.
		var core_search = {
			text: search.text,
			space_id: search.space,
			boards: search.board ? [search.board] : null,
			tags: search.tags,
			exclude_tags: search.exclude_tags,
			url: search.url,
			type: search.type,
			has_file: search.has_file,
			color: search.color,
			sort: (search.sort || [])[0],
			sort_direction: (search.sort || [])[1],
			page: search.page,
			per_page: search.per_page,
		};
		Object.keys(core_search).forEach(function(k) {
			if(
				core_search[k] === null ||
				core_search[k] === undefined ||
				(Array.isArray(core_search[k]) && core_search[k].length == 0) ||
				(k == 'text' && core_search[k] == '')
			) {
				delete core_search[k];
			}
		});
		return turtl.core.send('profile:find-notes', core_search)
			.bind(this)
			.then(function(search_data) {
				var notes = search_data.notes.map(function(n) { return new Note(n); });
				var tags = search_data.tags.map(function(t) { return {name: t[0], count: t[1]}; });
				var total = search_data.total;
				this.total = total;
				this.trigger('search-done', notes, tags, total);
				this.trigger('search-tags', tags);
				return [notes, tags, total];
			});
	},

	find_tags: function(search, options) {
		search || (search = {});
		options || (options = {});

		// create a search object rust understands. it's only slightly different
		// from the js version, but there is some conversion and i don't want to
		// rewrite all the js queries, so here we are.
		var core_search = {
			text: search.text,
			space_id: search.space,
			boards: search.board ? [search.board] : null,
			tags: search.tags,
			exclude_tags: search.exclude_tags,
			type: search.type,
			has_file: search.has_file,
			color: search.color,
			sort: (search.sort || [])[0],
			sort_direction: (search.sort || [])[1],
			page: search.page,
			per_page: search.per_page,
		};
		Object.keys(core_search).forEach(function(k) {
			if(
				core_search[k] === null ||
				core_search[k] === undefined ||
				(Array.isArray(core_search[k]) && core_search[k].length == 0) ||
				(k == 'text' && core_search[k] == '')
			) {
				delete core_search[k];
			}
		});
		return turtl.core.send('profile:find-tags', core_search)
			.bind(this)
			.then(function(search_data) {
				var tags = search_data.tags.map(function(t) { return {name: t[0], count: t[1]}; });
				return tags;
			});
	},
});

