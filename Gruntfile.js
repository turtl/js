module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		less: {
			development: {
				options: {
					paths: ['css']
				},
				files: [{
					expand: true,
					cwd: 'css/',
					src: ['**/*.less'],
					dest: 'css/',
					ext: '.css'
				}]
			}
		},
		handlebars: {
			options: {
				namespace: 'TurtlTemplates',
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
			css: {
				files: [
					'css/**/*.less'
				],
				tasks: ['less'],
				options: {
					nospawn: true
				}
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
	grunt.registerTask('default', ['generate', 'watch']);
};
