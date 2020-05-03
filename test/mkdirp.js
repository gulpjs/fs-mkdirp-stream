'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var mock = require('jest-mock');
var expect = require('expect');
var rimraf = require('rimraf');

var mkdirp = require('../mkdirp');

describe('mkdirp', function () {
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

    mock.restoreAllMocks();

    // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
    rimraf(outputBase, done);
  }

  function masked(mode) {
    return mode & MASK_MODE;
  }

  function statMode(outputPath) {
    return masked(fs.lstatSync(outputPath).mode);
  }

  function applyUmask(mode) {
    if (typeof mode !== 'number') {
      mode = parseInt(mode, 8);
    }

    return mode & ~process.umask();
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
      expect(statMode(outputDirpath)).toBeDefined();

      done();
    });
  });

  it('makes single directory w/ default mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var defaultMode = applyUmask(DEFAULT_DIR_MODE);

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputDirpath)).toEqual(defaultMode);

      done();
    });
  });

  it('makes multiple directories', function (done) {
    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputNestedDirpath)).toBeDefined();

      done();
    });
  });

  it('makes multiple directories w/ default mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var defaultMode = applyUmask(DEFAULT_DIR_MODE);

    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputNestedDirpath)).toEqual(defaultMode);

      done();
    });
  });

  it('makes directory with custom mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('700');

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputDirpath)).toEqual(mode);

      done();
    });
  });

  it('can create a directory with setgid permission', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('2700');

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputDirpath)).toEqual(mode);

      done();
    });
  });

  it('does not change directory mode if exists and no mode given', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('700');

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();

      mkdirp(outputDirpath, function (err2) {
        expect(err2).toBeFalsy();
        expect(statMode(outputDirpath)).toEqual(mode);

        done();
      });
    });
  });

  it('makes multiple directories with custom mode', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('700');

    mkdirp(outputNestedDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputNestedDirpath)).toEqual(mode);

      done();
    });
  });

  it('uses default mode on intermediate directories', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var intermediateDirpath = path.dirname(outputNestedDirpath);
    var mode = applyUmask('700');
    var defaultMode = applyUmask(DEFAULT_DIR_MODE);

    mkdirp(outputNestedDirpath, mode, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputDirpath)).toEqual(defaultMode);
      expect(statMode(intermediateDirpath)).toEqual(defaultMode);

      done();
    });
  });

  it('changes mode of existing directory', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('700');
    var defaultMode = applyUmask(DEFAULT_DIR_MODE);

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(statMode(outputDirpath)).toEqual(defaultMode);

      mkdirp(outputDirpath, mode, function (err2) {
        expect(err2).toBeFalsy();
        expect(statMode(outputDirpath)).toEqual(mode);

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

    var mode = applyUmask('700');

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeFalsy();

      fs.writeFile(outputNestedPath, contents, function (err2) {
        expect(err2).toBeFalsy();

        var expectedMode = statMode(outputNestedPath);

        mkdirp(outputNestedPath, mode, function (err3) {
          expect(err3).toBeDefined();
          expect(statMode(outputNestedPath)).toEqual(expectedMode);

          done();
        });
      });
    });
  });

  it('surfaces mkdir errors that happening during recursion', function (done) {
    var ogMkdir = fs.mkdir;

    var spy = mock
      .spyOn(fs, 'mkdir')
      .mockImplementation(function (dirpath, mode, cb) {
        if (spy.mock.calls.length === 1) {
          return ogMkdir(dirpath, mode, cb);
        }
        cb(new Error('boom'));
      });

    mkdirp(outputNestedDirpath, function (err) {
      expect(err).toBeDefined();

      done();
    });
  });

  it('surfaces fs.stat errors', function (done) {
    mock.spyOn(fs, 'stat').mockImplementation(function (dirpath, cb) {
      cb(new Error('boom'));
    });

    mkdirp(outputDirpath, function (err) {
      expect(err).toBeDefined();

      done();
    });
  });

  it('does not attempt fs.chmod if custom mode matches mode on disk', function (done) {
    if (isWindows) {
      this.skip();
      return;
    }

    var mode = applyUmask('700');

    mkdirp(outputDirpath, mode, function (err) {
      expect(err).toBeFalsy();

      var spy = mock.spyOn(fs, 'chmod');

      mkdirp(outputDirpath, mode, function (err) {
        expect(err).toBeFalsy();
        expect(spy).toHaveBeenCalledTimes(0);

        done();
      });
    });
  });
});
