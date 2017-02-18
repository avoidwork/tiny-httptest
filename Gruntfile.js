module.exports = function (grunt) {
	grunt.initConfig({
		pkg : grunt.file.readJSON("package.json"),
		eslint: {
			target: [
				"index.js",
				"lib/tinyhttptest.js",
				"test/*.js"
			]
		},
		nodeunit : {
			all : ["test/*.js"]
		},
		watch : {
			js : {
				files : ["index.js", "lib/tinyhttptest.js"],
				tasks : "default"
			},
			pkg: {
				files : "package.json",
				tasks : "default"
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-eslint");
	grunt.loadNpmTasks("grunt-contrib-nodeunit");
	grunt.loadNpmTasks('grunt-contrib-watch');

	// aliases
	grunt.registerTask("test", ["eslint"/*, "nodeunit"*/]);
	grunt.registerTask("default", ["test"]);
};
