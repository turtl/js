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
	echo "${BUILD}/css/vnd/reset.css"
	find ${BUILD}/css/vnd -name '*.css' \
		| grep -v 'reset.css'
	echo "${BUILD}/css/fonts.css"
	echo "${BUILD}/css/template.css"
	echo "${BUILD}/css/general.css"
	find ${BUILD}/css -name '*.css' \
		| LC_ALL=C sort \
		| grep -v 'font.css' \
		| grep -v 'template.css' \
		| grep -v 'general.css' \
		| grep -v 'variables.css' \
		| grep -v 'reset.css'
}

function vendor_js() {
	echo "${SEARCH_PATH}lib/vnd/mootools-core-1.5.2.js"
	echo "${SEARCH_PATH}lib/vnd/mootools-more-1.5.1.js"
	echo "${SEARCH_PATH}lib/vnd/composer.js"
	echo "${SEARCH_PATH}lib/vnd/bluebird.js"
	find ${SEARCH_PATH}lib/vnd -name "*.js" \
		| LC_ALL=C sort \
		| grep -v 'mootools-' \
		| grep -v 'composer\.js' \
		| grep -v 'bluebird\.js'
}

function all_js() {
	vendor_js
	
	path_to_js "${SEARCH_PATH}handlers"
	path_to_js "${SEARCH_PATH}config/config.js"
	find ${SEARCH_PATH}config -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'config\.js'
	find ${SEARCH_PATH}lib/app -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'ignore' \
		| grep -v 'templates\.js' \
		| grep -v '\.thread\.' \
		| sed 's| |___|g'
	for jsfile in $jsfiles; do print_js $jsfile; done

	find ${SEARCH_PATH}controllers/0modules -name '*.js' \
		| LC_ALL=C sort \
		| grep -v 'nav\.js'
	path_to_js "${SEARCH_PATH}controllers"
	path_to_js "${SEARCH_PATH}models"
	path_to_js "${BUILD}/"
	echo "${SEARCH_PATH}main.js"
}

function do_replace() {
	template=$1
	from=$2
	to=$(echo "$3" | sed 's|&|\\\\&|g')

	echo "$template" \
		| awk -v r="${to//$'\n'/\\n}" "{gsub(/${from}/,r)}1"
}


