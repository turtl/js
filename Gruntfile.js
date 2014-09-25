module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		handlebars: {
			options: {
				namespace: 'Templates',
				processName: function(path) {
					return path.replace(/^views\//, '').replace(/\.hbs$/, '');
				}
			},
			all: {
				files: {
					'library/templates.js': ['views/**/*.hbs']
				}
			}
		},
		exec: {
			index: {
				command: 'bash ./scripts/gen-index'
			}
		},
		watch: {
			options: {
				cwd: './'
			},
			index: {
				files: [
					'scripts/gen-index',
					'views/layouts/default.html',
					'handlers/**/*.js',
					'controllers/**/*.js',
					'models/**/*.js',
					'library/**/*.js',
					'config/**/*.js',
					'turtl/**/*.js',
					'css/**/*.less'
				],
				tasks: ['exec:index'],
				options: {
					nospawn: true
				}
			},
			templates: {
				files: [
					'views/**/*.hbs'
				],
				tasks: ['handlebars'],
				options: {
					nospawn: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-handlebars');
	grunt.loadNpmTasks('grunt-exec');

	grunt.registerTask('generate', ['less', 'handlebars', 'exec:index']);
	grunt.registerTask('default', ['watch']);
};
