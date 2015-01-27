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
					'library/templates/handlebars.js': ['views/**/*.hbs']
				}
			}
		},
		exec: {
			index: {
				command: 'bash ./scripts/gen-index'
			},
			html_templates: {
				command: 'bash ./scripts/gen-templates'
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
					'turtl/**/*.js'
				],
				tasks: ['exec:index'],
				options: {
					nospawn: true
				}
			},
			templates_html: {
				files: [
					'views/**/*.html'
				],
				tasks: ['exec:html_templates'],
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

	grunt.registerTask('generate', ['less', 'handlebars', 'exec:index', 'exec:html_templates']);
	grunt.registerTask('default', ['generate', 'watch']);
};

