function getLang() {
	return (navigator.language || navigator.languages[0]);
}

i18next.use(window.i18nextXHRBackend).init({
	"debug": false,
	"lng": getLang(),
	"fallbackLng": false,
	"backend": {
		"loadPath": "/locales/{{lng}}.json"
	},
	"nsSeparator": false,
	"keySeparator": false
});

function loadjs(filename) {
	var fileref = document.createElement('script');
	fileref.setAttribute("type","text/javascript");
	fileref.setAttribute("src", filename);
	document.getElementsByTagName("head")[0].appendChild(fileref);
}

i18next.on("initialized", function(options) {
	loadjs("/controllers/0modules/nav.js");
	loadjs("/controllers/notes/edit/index.js");
	loadjs("/library/templates.js");
	loadjs("/main.js");
});
