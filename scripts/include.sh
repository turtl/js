#!/bin/bash

function print_css() {
	cssfile=$1
	echo -ne "\n<link rel=\"stylesheet\" href=\"/$cssfile\">"
}

function print_js() {
	jsfile=$1
	jsfile="`echo $jsfile | sed 's|___| |g'`"
	echo -ne "\n<script src=\"/$jsfile\"></script>"
}

function path_to_js() {
	path=$1
	find $path -name '*.js' | sort | sed 's| |___|g'
}

function all_css() {
	echo 'css/reset.css'
	echo 'css/template.css'
	echo 'css/general.css'
	cssfiles="`find css -name '*.css' \
		| sort \
		| grep -v 'template.css' \
		| grep -v 'general.css' \
		| grep -v 'variables.css' \
		| grep -v 'reset.css' `"
	for cssfile in $cssfiles; do
		echo $cssfile
	done
}

function all_js() {
	echo 'library/mootools-core-1.5.1.js'
	echo 'library/mootools-more-1.5.1.js'
	echo 'library/composer.js'
	echo 'library/bluebird.js'
	echo 'library/handlebars.runtime-v2.0.0.js'
	
	path_to_js 'config/config.js'
	find config -name '*.js' \
		| sort \
		| grep -v 'config\.js'
	find library -name '*.js' \
		| sort \
		| grep -v 'ignore' \
		| grep -v 'mootools-' \
		| grep -v 'composer' \
		| grep -v 'cowcrypt' \
		| grep -v 'bluebird' \
		| grep -v 'handlebars\.runtime' \
		| grep -v 'templates\.js' \
		| grep -v '\.thread\.' \
		| sed 's| |___|g'
	for jsfile in $jsfiles; do print_js $jsfile; done

	path_to_js 'controllers'
	path_to_js 'models'
	path_to_js 'handlers'
	path_to_js 'turtl'

	echo 'library/templates.js'
	echo 'main.js'
}

function do_replace() {
	template=$1
	from=$2
	to=$3

	echo "$template" | awk -v r="${to//$'\n'/\\n}" "{gsub(/${from}/,r)}1"
}


