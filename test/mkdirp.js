'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var sinon = require('sinon');
var expect = require('expect');
var rimraf = require('rimraf');

var mkdirp = require('../mkdirp');

var log = {
  expected: function (expected) {
    if (process.env.VERBOSE) {
      console.log('Expected mode:', expected.toString(8));
    }
  },
  found: function (found) {
    if (process.env.VERBOSE) {
      console.log('Found mode', found.toString(8));
    }
  },
};

function suite() {
  var MASK_MODE = parseInt('7777', 8);
  var DEFAULT_DIR_MODE = parseInt('0777', 8);
  var isWindows = os.platform() === 'win32';

  var outputBase = path.join(__dirname, './out-fixtures');
  var outputDirpath = path.join(outputBase, './foo');
  var outputNestedPath = path.join(outputDirpath, './test.txt');
  var outputNestedDirpath = path.join(outputDirpath, './bar/baz/');
  var contents = 'Hello World!\n';

  function cleanup(done) {
    this.timeout(20000);

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(outputBase, done);
  }

  function masked(mode) {
    return mode & MASK_MODE;
  }

  function createdMode(outputPath) {
    var mode = masked(fs.lstatSync(outputPath).mode);
    log.found(mode);
    return mode;
  }

  function expectedMode(mode) {
    if (typeof mode !== 'number') {
      mode = parseInt(mode, 8);
    }

    log.expected(mode);
    return mode;
  }

  function expectedDefaultMode() {
    // Set to use to "get" it
    var current = process.umask(0);
    // Then set it back for the next test
    process.umask(current);

    var mode = DEFAULT_DIR_MODE & ~current;
    log.expected(mode);
    return mode;
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  beforeEach(function (done) {
    fs.mkdir(outputBase, function (err) {
      if (err) {
        return done(err);
      }

      // Linux inherits the setgid of the directory and it messes up our assertions
      // So we explixitly set the mode to 777 before each test
      fs.chmod(outputBase, '777', done);
    });
  });

  it('makes a single directory', function (done) {
    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toBeDefined();

      done();
    });
  });

  it('makes single directory w/ default mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedDefaultMode());

      done();
    });
  });

  it('makes multiple directories', function (done) {
    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputNestedDirpath)).toBeDefined();

      done();
    });
  });

  it('makes multiple directories w/ default mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputNestedDirpath)).toEqual(expectedDefaultMode());

      done();
    });
  });

  it('makes directory with custom mode as string', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

      done();
    });
  });

  it('makes directory with custom mode as octal', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('777', 8);

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

      done();
    });
  });

  it('does not mask a custom mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = parseInt('777', 8);

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(mode);

      done();
    });
  });

  it('can create a directory with setgid permission', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '2700';

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

      done();
    });
  });

  it('does not change directory mode if exists and no mode given', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();

      mkdirp(outputDirpath, function (err2) {
        expect(err2).toBeFalsy();
        expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

        done();
      });
    });
  });

  it('makes multiple directories with custom mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputNestedDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputNestedDirpath)).toEqual(expectedMode(mode));

      done();
    });
  });

  it('uses default mode on intermediate directories', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var intermediateDirpath = path.dirname(outputNestedDirpath);
    var mode = '777';

    mkdirp(outputNestedDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedDefaultMode());
      expect(createdMode(intermediateDirpath)).toEqual(expectedDefaultMode());
      expect(createdMode(outputNestedDirpath)).toEqual(expectedMode(mode));

      done();
    });
  });

  it('changes mode of existing directory', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedDefaultMode());

      mkdirp(outputDirpath, mode, function (err2) {
        expect(err2).toBeFalsy();
        expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

        done();
      });
    });
  });

  it('errors with EEXIST if file in path', function (done) {
    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();

      fs.writeFile(outputNestedPath, contents, function (err2) {
        expect(err2).toBeFalsy();

        mkdirp(outputNestedPath, function (err3) {
          expect(err3).toBeDefined();
          expect(err3.code).toEqual('EEXIST');

          done();
        });
      });
    });
  });

  it('does not change mode of existing file', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();

      fs.writeFile(outputNestedPath, contents, function (err2) {
        expect(err2).toBeFalsy();

        var existingMode = createdMode(outputNestedPath);
        expect(existingMode).not.toEqual(mode);

        mkdirp(outputNestedPath, mode, function (err3) {
          expect(err3).toBeDefined();
          expect(createdMode(outputNestedPath)).toEqual(existingMode);

          done();
        });
      });
    });
  });

  it('surfaces mkdir errors that happening during recursion', function (done) {
    var ogMkdir = fs.mkdir;

    var stub = sinon
      .stub(fs, 'mkdir')
      .callsFake(function (dirpath, mode, cb) {
        if (stub.callCount === 1) {
          return ogMkdir(dirpath, mode, cb);
        }
        cb(new Error('boom'));
      });

    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeDefined();

      fs.mkdir.restore();
      done();
    });
  });

  it('surfaces fs.stat errors', function (done) {
    sinon.stub(fs, 'stat').callsFake(function (dirpath, cb) {
      cb(new Error('boom'));
    });

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeDefined();

      fs.stat.restore();
      done();
    });
  });

  it('does not attempt fs.chmod if custom mode matches mode on disk', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = '777';

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();

      var spy = sinon.spy(fs, 'chmod');

      mkdirp(outputDirpath, mode, function (err) {
        expect(err).toBeFalsy();
        expect(spy.callCount).toEqual(0);

        fs.chmod.restore();
        done();
      });
    });
  });
}

describe('mkdirp', suite);

describe('mkdirp with umask', function () {
  var startingUmask;
  before(function (done) {
    startingUmask = process.umask(parseInt('066', 8));

    done();
  });

  after(function (done) {
    process.umask(startingUmask);

    done();
  });

  // Initialize the normal suite
  suite();
});
