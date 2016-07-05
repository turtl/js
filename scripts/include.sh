#!/bin/bash

function print_css() {
	cssfile=$1
	echo -ne "\n<link rel=\"stylesheet\" href=\"${ASSET_ROOT}${cssfile}\">"
}

function print_js() {
	jsfile=$1
	jsfile="`echo $jsfile | sed 's|___| |g'`"
	echo -ne "\n<script src=\"${ASSET_ROOT}${jsfile}\"></script>"
}

function path_to_js() {
	path=$1
	find $path -name '*.js' | LC_ALL=C sort | sed 's| |___|g'
}

function all_css() {
	echo "${SEARCH_PATH}css/reset.css"
	echo "${SEARCH_PATH}css/template.css"
	echo "${SEARCH_PATH}css/general.css"
	cssfiles="`find ${SEARCH_PATH}css -name '*.css' \
		| LC_ALL=C sort \
		| grep -v 'template.css' \
		| grep -v 'general.css' \
		| grep -v 'variables.css' \
		| grep -v 'reset.css' `"
	for cssfile in $cssfiles; do
		echo $cssfile
	done
}

function vendor_js() {
	echo "${SEARCH_PATH}library/mootools-core-1.5.2.js"
	echo "${SEARCH_PATH}library/mootools-more-1.5.1.js"
	echo "${SEARCH_PATH}library/composer.js"
	echo "${SEARCH_PATH}library/bluebird.js"
	echo "${SEARCH_PATH}library/handlebars.runtime-v2.0.0.js"
	echo "${SEARCH_PATH}library/i18next.min.js"
	echo "${SEARCH_PATH}library/i18nextXHRBackend.min.js"
	echo "${SEARCH_PATH}library/i18next-init.js"
}

function all_js() {
	vendor_js
	
	path_to_js "${SEARCH_PATH}config/config.js"
	find ${SEARCH_PATH}config -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'config\.js'
	find ${SEARCH_PATH}library -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'ignore' \
		| grep -v 'mootools-' \
		| grep -v 'composer' \
		| grep -v 'cowcrypt' \
		| grep -v 'bluebird' \
		| grep -v 'handlebars\.runtime' \
		| grep -v 'templates\.js' \
		| grep -v '\.thread\.' \
		| grep -v 'openpgp\.worker' \
		| grep -v 'i18n.*\.js' \
		| sed 's| |___|g'
	for jsfile in $jsfiles; do print_js $jsfile; done

	find ${SEARCH_PATH}controllers/0modules -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'nav\.js'
	path_to_js "${SEARCH_PATH}controllers/boards"
	path_to_js "${SEARCH_PATH}controllers/feedback"
	path_to_js "${SEARCH_PATH}controllers/help"
	find ${SEARCH_PATH}controllers/notes -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'edit/index.js'
	path_to_js "${SEARCH_PATH}controllers/pages.js"
	path_to_js "${SEARCH_PATH}controllers/personas"
	path_to_js "${SEARCH_PATH}controllers/settings"
	path_to_js "${SEARCH_PATH}controllers/sharing"
	path_to_js "${SEARCH_PATH}controllers/sync"
	path_to_js "${SEARCH_PATH}controllers/users"
	path_to_js "${SEARCH_PATH}models"
	path_to_js "${SEARCH_PATH}handlers"
	path_to_js "${SEARCH_PATH}turtl"
}

function do_replace() {
	template=$1
	from=$2
	to=$(echo "$3" | sed 's|&|\\\\&|g')

	echo "$template" \
		| awk -v r="${to//$'\n'/\\n}" "{gsub(/${from}/,r)}1"
}


