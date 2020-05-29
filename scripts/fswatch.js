var exec = require('child_process').exec;
var chokidar = require('chokidar');

function grep(str) {
	return str.split(/[\r\n]/m)
		.filter(function(part) {
			var v = [
				/nothing to be done/i,
				/(entering|leaving) directory/i,
				/^[ \s]*$/,
			];
			for(var i = 0; i < v.length; i++) {
				if(part.match(v[i])) return false;
			}
			return true;
		})
		.join('\n');
}

var timeout = null;
var is_making = false;
var run_on_end = false;
function do_make() {
	if(timeout) clearTimeout(timeout);
	if(is_making) {
		run_on_end = true;
		return;
	}
	timeout = setTimeout(function() {
		timeout = null;
		is_making = true;
		exec('make', function(err, stdout, stderr) {
			if(err) console.error('error: ', err);
			if(stdout) {
				stdout = grep(stdout).trim();
				if(stdout) console.log(stdout);
			}
			if(stderr) console.error(stderr);

			// if changes happened while we were making, run make again
			is_making = false;
			if(run_on_end) do_make();
			run_on_end = false;
		});
	}, 100);
}

function main() {
	// start eh actual monitor
	var options = {
		ignored: [
			/(^|[\/\\])\../,
		],
		ignoreInitial: true,
	};
	console.log('Start fs monitor');
	do_make();
	chokidar.watch('.', options)
		.on('all', function(ev, path) {
			console.log('fs: ', ev, path);
			do_make();
		});
}

main();

