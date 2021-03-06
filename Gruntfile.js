/*
 * Copyright (c) 2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
module.exports = function (grunt) {
  var _ = require('lodash');
  var buildConfig = require('./tools/grunt-config-loader')('build.json');

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-dustjs');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadTasks('tools/grunt-tasks');

  // configure tasks
  var config = {
    packageInfo: grunt.file.readJSON('package.json'),

    clean: ['build'],

    jshint: {
      all: ['app/js/**/*.js'],

      // see http://jshint.com/docs/
      options: {
        camelcase: true,
        curly: true,
        eqeqeq: true,
        forin: true,
        immed: true,
        indent: 2,
        noempty: true,
        quotmark: 'single',

        undef: true,
        globals: {
          require: false,
          define: true, // can be redefined for node integration
          module: false,
          console: false // we allow some console logging in production
        },

        unused: true,
        browser: true,
        strict: true,
        trailing: true,
        maxdepth: 2,
        newcap: false // otherwise factory functions throw errors
      }
    },

    // this uglifies the main module (and its dependency graph)
    // and copies it to build/main.min.js
    requirejs: {
      all: {
        options: {
          baseUrl: null,

          // include the main requirejs configuration file;
          // see notes in that file on the allowed format
          mainConfigFile: null,

          // output
          out: 'build/main.min.js',

          // we don't need to wrap the js in an anonymous function
          wrap: false,

          // keep license comments in js files?
          preserveLicenseComments: false,

          uglify: {
            beautify: false,
            toplevel: true,
            ascii_only: true,
            no_mangle: false,
            max_line_length: 1000
          }
        }
      }
    },

    // minify and concat CSS
    cssmin: {
      all: {
        files: {
          'build/minified/css/all.css': buildConfig.cssFilesMinified
        }
      }
    },

    htmlmin: {
      all: {
        files: buildConfig.htmlFilesMinified,
        options: {
          removeComments: true,
          collapseWhitespace: true,
          removeCommentsFromCDATA: false,
          removeCDATASectionsFromCDATA: false,
          removeEmptyAttributes: true,
          removeEmptyElements: false
        }
      }
    },

    imagemin: {
      all: {
        options: {
          optimizationLevel: 3,
          progressive: true
        },
        files: buildConfig.imageFilesMinified
      }
    },

    dustjs: {
      all: {
        files: {
          'build/templates.js': ['app/templates/*.dust']
        }
      }
    },

    uglify: {
      perf: {
        files: {
          'build/save-perf-data.min.js': [
            'tools/save-perf-data.js'
          ]
        }
      },
      all: {
        files: {
          'build/minified/js/amd.min.js': [
            'app/lib/requirejs/require.js'
          ],
          'build/templates.min.js': [
            'build/templates.js'
          ]
        }
      }
    },

    // do this after htmlmin
    inline: {
      perf: {
        script: 'build/save-perf-data.min.js',
        htmlFile: 'build/dist/index.html'
      }
    },

    // remove all inline script elements (for Chrome)
    inlineStrip: {
      crx: {
        htmlFile: 'build/dist/index.html'
      }
    },

    wait: {
      perf: {
        seconds: 10
      }
    },

    // only used in minified builds; concatenate the minified
    // templates file onto main.min
    concat: {
      all: {
        files: {
          'build/minified/js/all.min.js': [
            'build/main.min.js',
            'build/templates.min.js'
          ]
        }
      }
    },

    // replace stylesheet and js elements; used for all builds except sdk
    condense: {
      all: {
        file: 'build/minified/index.html',
        script: {
          src: 'js/amd.min.js',
          attrs: {
            'data-main': 'js/all.min'
          }
        },
        stylesheet: 'css/all.css'
      }
    },

    // distributions supported: server, wgt, crx, sdk
    //
    // common: files required for all dists
    // minified: files required for wgt and crx
    // unminified: files required for sdk
    // server: copy files to build/server
    // wgtSpecific: files required for wgt build
    // crxSpecific: files required for crx build
    //
    // wgt: copy files to build/wgt; if the minified files are in build/dist,
    // this gives you an optimised build; if the unminified files are in build/dist,
    // this gives you an sdk build
    // crx: copy files to build/crx
    copy: {
      common: {
        files: buildConfig.commonFiles
      },
      minified: {
        files: [
          { expand: true, cwd: 'build/minified/', src: ['**'], dest: 'build/dist/' }
        ]
      },
      unminified: {
        // we get the unminified libs defined in build.json and concatenate
        // the other assets which are otherwise minified
        files: buildConfig.libFilesUnminified
               .concat(buildConfig.htmlFilesUnminified)
               .concat(buildConfig.templateFilesUnminified)
               .concat(buildConfig.cssFilesUnminified)
               .concat(buildConfig.jsFilesUnminified)
               .concat(buildConfig.imageFilesUnminified)
      },
      wgtSpecific: {
        files: [
          { expand: true, cwd: 'platforms/wgt', src: ['**'], dest: 'build/dist/' },
          { expand: true, cwd: 'platforms', src: ['icon.png'], dest: 'build/dist/' }
        ]
      },
      crxSpecific: {
        files: [
          { expand: true, cwd: 'platforms/crx', src: ['**'], dest: 'build/dist/' },
          { expand: true, cwd: 'platforms', src: ['icon.png'], dest: 'build/dist/' }
        ]
      },

      // these are conveniences to copy the build/dist directory to other
      // build-specific directories (makes testing of an unpacked build
      // more transparent, as you can see the type of build you're testing
      // from the directory name)
      server: {
        files: [
          { expand: true, cwd: 'build/dist', src: ['**'], dest: 'build/server/' }
        ]
      },
      wgt: {
        files: [
          { expand: true, cwd: 'build/dist', src: ['**'], dest: 'build/wgt/' }
        ]
      },
      crx: {
        files: [
          { expand: true, cwd: 'build/dist', src: ['**'], dest: 'build/crx/' }
        ]
      },
      sdk: {
        files: [
          { expand: true, cwd: 'build/dist', src: ['**'], dest: 'build/sdk/' }
        ]
      }
    },

    // make wgt package in build/ directory
    package: {
      wgt: {
        appName: '<%= packageInfo.name %>',
        version: '<%= packageInfo.version %>',
        files: 'build/wgt/**',
        stripPrefix: 'build/wgt/',
        outDir: 'build',
        suffix: 'wgt',
        addGitCommitId: false
      },
      sdk: {
        appName: '<%= packageInfo.name %>',
        version: '<%= packageInfo.version %>',
        files: 'build/sdk/**',
        stripPrefix: 'build/sdk/',
        outDir: 'build',
        suffix: 'sdk.wgt',
        addGitCommitId: false
      }
    },

    sdb: {
      prepare: {
        action: 'push',
        localFiles: './tools/tizen-app.sh',
        remoteDestDir: buildConfig.wgtRemoteDir + '/',
        chmod: '+x',
        overwrite: true
      },

      pushwgt: {
        action: 'push',
        localFiles: {
          pattern: 'build/*.wgt',
          filter: 'latest'
        },
        remoteDestDir: buildConfig.wgtRemoteDir + '/'
      },

      pushdumpscript: {
        action: 'push',
        localFiles: './tools/dump-localStorage.sh',
        remoteDestDir: buildConfig.wgtRemoteDir + '/',
        chmod: '+x',
        overwrite: true
      },

      dumplocalstorage: {
        action: 'script',
        asRoot: true,
        config: buildConfig.wgtConfig,
        remoteScript: buildConfig.wgtRemoteDir + '/dump-localStorage.sh'
      },

      stop: {
        action: 'stop',
        config: buildConfig.wgtConfig,
        remoteScript: buildConfig.wgtRemoteDir + '/tizen-app.sh'
      },

      uninstall: {
        action: 'uninstall',
        config: buildConfig.wgtConfig,
        remoteScript: buildConfig.wgtRemoteDir + '/tizen-app.sh'
      },

      install: {
        action: 'install',
        config: buildConfig.wgtConfig,
        remoteFiles: {
          pattern: buildConfig.wgtRemoteDir + '/*.wgt',
          filter: 'latest'
        },
        remoteScript: buildConfig.wgtRemoteDir + '/tizen-app.sh'
      },

      debug: {
        action: 'debug',
        config: buildConfig.wgtConfig,
        remoteScript: buildConfig.wgtRemoteDir + '/tizen-app.sh',
        localPort: '8888',
        openBrowser: 'google-chrome %URL%'
      },

      start: {
        action: 'start',
        config: buildConfig.wgtConfig,
        remoteScript: buildConfig.wgtRemoteDir + '/tizen-app.sh'
      }
    },

    simple_server: {
      port: buildConfig.serverPort,
      dir: 'build/server/'
    },

    mochaTest: {
      files: ['test/**/*.test.js']
    },

    mochaTestConfig: {
      options: {
        reporter: 'dot'
      }
    }
  };

  _.extend(config.requirejs.all.options, buildConfig.amd);

  grunt.initConfig(config);

  // do all minifications into build/minified
  grunt.registerTask('minify', [
    'dustjs:all',
    'requirejs:all',
    'cssmin:all',
    'htmlmin:all',
    'imagemin:all',
    'uglify:all',
    'concat:all',
    'condense'
  ]);

  // directory build tasks
  grunt.registerTask('server-build', [
    'clean',
    'jshint',
    'minify',
    'copy:minified',
    'copy:common',
    'copy:server'
  ]);

  grunt.registerTask('wgt-build', [
    'clean',
    'jshint',
    'minify',
    'copy:minified',
    'copy:common',
    'copy:wgtSpecific'
  ]);

  grunt.registerTask('crx-build', [
    'clean',
    'jshint',
    'minify',
    'copy:minified',
    'copy:common',
    'copy:crxSpecific',
    'inlineStrip:crx'
  ]);

  grunt.registerTask('sdk-build', [
    'clean',
    'jshint',
    'copy:unminified',
    'copy:common',
    'copy:wgtSpecific'
  ]);

  // server tasks
  grunt.registerTask('server', ['server-build', 'simple_server']);

  // packaging tasks
  grunt.registerTask('wgt', ['wgt-build', 'copy:wgt', 'package:wgt']);
  grunt.registerTask('crx', ['crx-build', 'copy:crx']);
  grunt.registerTask('sdk', ['sdk-build', 'copy:sdk', 'package:sdk']);

  // sdb tasks
  grunt.registerTask('install', [
    'sdb:prepare',
    'sdb:pushwgt',
    'sdb:stop',
    'sdb:uninstall',
    'sdb:install',
    'sdb:start'
  ]);

  // restart the currently-installed version
  grunt.registerTask('restart', ['sdb:stop', 'sdb:start']);

  grunt.registerTask('wgt-install', ['wgt', 'install']);
  grunt.registerTask('sdk-install', ['sdk', 'install']);

  // perf mega task
  //
  // pass the build type ('wgt' [default] or 'sdk') when calling this
  // task to set the type of package deployed for the test ('wgt' == minified,
  // 'sdk' == unminified); e.g.
  //
  //   grunt perf-test:wgt
  grunt.registerTask('perf-test', function (buildType) {
    buildType = buildType || 'wgt';

    var tasks = [
      'sdb:pushdumpscript',
      buildType + '-build',
      'uglify:perf',
      'inline:perf',
      'copy:' + buildType,
      'package:' + buildType,
      'install',
      'sdb:stop'
    ];

    for (var i = 0; i < 11; i++) {
      tasks.push('sdb:start', 'wait:perf', 'sdb:stop');
    }

    tasks.push('sdb:dumplocalstorage')

    grunt.task.run(tasks);
  });

  grunt.registerTask('test', ['mochaTest']);

  grunt.registerTask('default', 'wgt');
};
