var Bookmark = Composer.Model.extend({
	parse: function(html) {
		var parsed = new DOMParser().parseFromString(html, 'text/html');

		var get_content = function(sel) {
			var tag = parsed.querySelector(sel);
			return tag && tag.getAttribute('content');
		};
		var get_html = function(sel) {
			var tag = parsed.querySelector(sel);
			return tag && tag.innerHTML;
		};
		var obj = {
			title: get_html('head title'),
			description: get_content('head meta[name="description"]'),
		};

		// if we have an og:image, use it, otherwise scrape the page for images
		var og_image = get_content('head meta[property="og:image"]');
		if(og_image) {
			obj.image = og_image;
		} else {
			var promises = [];
			var processed = [];
			var loader = function(selector, fn_url) {
				var images = parsed.querySelectorAll(selector);
				images.forEach(function(img) {
					var tag = new Image();
					var promise = new Promise(function(resolve, reject) {
						tag.onload = function() { resolve(tag); };
						tag.onerror = reject;
						var img_src = fn_url(img);
						if(!img_src) throw 'no url';	// if no url, skip this image
						tag.src = img_src;
					}).then(function(tag) {
						processed.push({url: img.src, width: tag.width, height: tag.height});
					}).catch(function(err) { /* gosh gee willickers... */ });
					promises.push(promise);
				});
			};
			// check img tags
			loader('body img', function(img) { return img.src; });
			// also check divs with background images looool
			loader('body div[style*="background-image"]', function(div) {
				return div.style.backgroundImage.replace(/.*?url\((.*?)\).*?/, '$1');
			});
			return Promise.all(promises)
				.then(function() {
					var sorted = processed
						.filter(function(img) { return img.width > 200 && img.height > 200; })
						.sort(function(a, b) {
							return (b.width * b.height) - (a.width * a.height);
						});
					if(sorted.length > 0) {
						obj.image = sorted[0].url;
					}
					return obj;
				});
		}
		return Promise.resolve(obj);
	},

	grab: function(url) {
		var headers = {};
		if(config.bookmarker_proxy) {
			var username = turtl.api.user.username;
			var auth_key = turtl.api.user.auth_key;
			headers['Authorization'] = 'Basic ' + btoa(username+':'+auth_key);
			url = config.api_url+config.bookmarker_proxy+'?url='+encodeURIComponent(url);
		}
		var promise = Sexhr({
			method: 'GET',
			headers: headers,
			url: url,
			timeout: 10000,
		});
		return promise
			.bind(this)
			.spread(function(html, _xhr) {
				return this.parse(html);
			})
			.then(function(obj) {
				obj.url = url;
				this.set(obj);
				return this;
			});
	},
});

