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

    fs.mkdir(outputDirpath, function (err) {
      expect(err).toBeFalsy();
      expect(createdMode(outputDirpath)).toEqual(expectedDefaultMode());

      mkdirp(outputDirpath, mode, function (err2) {
        expect(err2).toBeFalsy();
        expect(createdMode(outputDirpath)).toEqual(expectedMode(mode));

        done();
      });
    });
  });

  it('errors with ENOTDIR if file in path', function (done) {
    fs.mkdir(outputDirpath, function (err) {
      expect(err).toBeFalsy();

      fs.writeFile(outputNestedPath, contents, function (err2) {
        expect(err2).toBeFalsy();

        mkdirp(outputNestedPath, function (err3) {
          expect(err3).toBeDefined();
          expect(err3.code).toEqual('ENOTDIR');
          expect(err3.path).toEqual(outputNestedPath);

          done();
        });
      });
    });
  });

  it('errors with ENOTDIR if file in path of nested mkdirp', function (done) {
    var nestedPastFile = path.join(outputNestedPath, './bar/baz/');

    fs.mkdir(outputDirpath, function (err) {
      expect(err).toBeFalsy();

      fs.writeFile(outputNestedPath, contents, function (err2) {
        expect(err2).toBeFalsy();

        mkdirp(nestedPastFile, function (err3) {
          expect(err3).toBeDefined();
          expect(err3.code).toEqual('ENOTDIR');
          expect(err3.path).toEqual(outputNestedPath);

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

    fs.mkdir(outputDirpath, function (err) {
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

    var stub = sinon.stub(fs, 'mkdir').callsFake(function (dirpath, mode, cb) {
      if (stub.callCount === 1) {
        return ogMkdir(dirpath, mode, cb);
      }
      cb(new Error('boom'));
    });

    mkdirp(outputNestedDirpath, function (err) {
      fs.mkdir.restore();

      expect(err).toBeDefined();

      done();
    });
  });

  it('surfaces fs.stat errors', function (done) {
    sinon.stub(fs, 'stat').callsFake(function (dirpath, cb) {
      cb(new Error('boom'));
    });

    mkdirp(outputDirpath, function (err) {
      fs.stat.restore();

      expect(err).toBeDefined();

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
        fs.chmod.restore();

        expect(err).toBeFalsy();
        expect(spy.callCount).toEqual(0);

        done();
      });
    });
  });

  describe('symlinks', function () {
    before(function () {
      if (isWindows) {
        this.skip();
        return;
      }
    });

    it('succeeds with a directory at the target of a symlink', function (done) {
      var target = path.join(outputBase, 'target');

      fs.mkdir(target, function (err) {
        expect(err).toBeFalsy();

        fs.symlink(target, outputDirpath, function (err) {
          expect(err).toBeFalsy();

          mkdirp(outputDirpath, function (err) {
            expect(err).toBeFalsy();
            expect(createdMode(target)).toBeDefined();

            done();
          });
        });
      });
    });

    it('changes mode of existing directory at the target of a symlink', function (done) {
      var target = path.join(outputBase, 'target');

      var mode = '777';

      fs.mkdir(target, function (err) {
        expect(err).toBeFalsy();

        fs.symlink(target, outputDirpath, function (err2) {
          expect(err2).toBeFalsy();
          expect(createdMode(target)).toEqual(expectedDefaultMode());

          mkdirp(outputDirpath, mode, function (err3) {
            expect(err3).toBeFalsy();
            expect(createdMode(target)).toEqual(expectedMode(mode));
            done();
          });
        });
      });
    });

    it('creates nested directories at the target of a symlink', function (done) {
      var target = path.join(outputBase, 'target');
      var expected = path.join(target, './bar/baz/');

      fs.mkdir(target, function (err) {
        expect(err).toBeFalsy();

        fs.symlink(target, outputDirpath, function (err2) {
          expect(err2).toBeFalsy();

          mkdirp(outputNestedDirpath, function (err3) {
            expect(err3).toBeFalsy();
            expect(createdMode(expected)).toBeDefined();
            done();
          });
        });
      });
    });

    it('errors with ENOTDIR if the target of a symlink is a file', function (done) {
      var target = path.join(outputBase, 'test.txt');

      fs.mkdir(outputDirpath, function (err) {
        expect(err).toBeFalsy();

        fs.writeFile(target, contents, function (err2) {
          expect(err2).toBeFalsy();

          fs.symlink(target, outputNestedPath, function (err3) {
            expect(err3).toBeFalsy();

            mkdirp(outputNestedPath, function (err4) {
              expect(err4).toBeDefined();
              expect(err4.code).toEqual('ENOTDIR');
              expect(err4.path).toEqual(target);
              done();
            });
          });
        });
      });
    });

    it('errors with ENOTDIR if the target of a symlink is a file in a nested mkdirp', function (done) {
      var target = path.join(outputBase, 'test.txt');

      fs.writeFile(target, contents, function (err) {
        expect(err).toBeFalsy();

        fs.symlink(target, outputDirpath, function (err2) {
          expect(err2).toBeFalsy();

          mkdirp(outputNestedDirpath, function (err3) {
            expect(err3).toBeDefined();
            expect(err3.code).toEqual('ENOTDIR');
            expect(err3.path).toEqual(target);
            done();
          });
        });
      });
    });

    it('errors with ENOENT if the target of a symlink is missing (a.k.a. dangling symlink)', function (done) {
      var target = path.join(outputBase, 'dangling-link');

      fs.symlink(target, outputDirpath, function (err) {
        expect(err).toBeFalsy();

        mkdirp(outputDirpath, function (err2) {
          expect(err2).toBeDefined();
          expect(err2.code).toEqual('ENOENT');
          expect(err2.path).toEqual(target);
          done();
        });
      });
    });

    it('properly surfaces top-level error if lstat fails', function (done) {
      var target = path.join(outputBase, 'test.txt');

      sinon.stub(fs, 'lstat').callsFake(function (dirpath, cb) {
        cb(new Error('boom'));
      });

      fs.mkdir(outputDirpath, function (err) {
        expect(err).toBeFalsy();

        fs.writeFile(target, contents, function (err2) {
          expect(err2).toBeFalsy();

          fs.symlink(target, outputNestedPath, function (err3) {
            expect(err3).toBeFalsy();

            mkdirp(outputNestedPath, function (err4) {
              fs.lstat.restore();

              expect(err4).toBeDefined();
              expect(err4.code).toEqual('EEXIST');
              expect(err4.path).toEqual(outputNestedPath);

              done();
            });
          });
        });
      });
    });

    it('properly surfaces top-level error if readlink fails', function (done) {
      var target = path.join(outputBase, 'target');

      sinon.stub(fs, 'readlink').callsFake(function (dirpath, cb) {
        cb(new Error('boom'));
      });

      fs.symlink(target, outputDirpath, function (err) {
        expect(err).toBeFalsy();

        mkdirp(outputDirpath, function (err2) {
          fs.readlink.restore();

          expect(err2).toBeDefined();
          expect(err2.code).toEqual('EEXIST');
          expect(err2.path).toEqual(outputDirpath);

          done();
        });
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
