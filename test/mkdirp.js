"use strict";

var os = require("node:os");
var path = require("node:path");
var assert = require("node:assert");
var {
  afterEach,
  before,
  beforeEach,
  describe,
  it,
  after,
} = require("node:test");

var fs = require("graceful-fs");
var rimraf = require("rimraf");

var mkdirp = require("../mkdirp");

var log = {
  expected: function (expected) {
    if (process.env.VERBOSE) {
      console.log("Expected mode:", expected.toString(8));
    }
  },
  found: function (found) {
    if (process.env.VERBOSE) {
      console.log("Found mode", found.toString(8));
    }
  },
};

function suite() {
  var MASK_MODE = parseInt("7777", 8);
  var DEFAULT_DIR_MODE = parseInt("0777", 8);
  var skipWin32 = { skip: os.platform() === "win32" };

  var outputBase = path.join(__dirname, "./mkdir-out-fixtures");
  var outputDirpath = path.join(outputBase, "./foo");
  var outputNestedPath = path.join(outputDirpath, "./test.txt");
  var outputNestedDirpath = path.join(outputDirpath, "./bar/baz/");
  var contents = "Hello World!\n";

  function cleanup(t, done) {
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
    if (typeof mode !== "number") {
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

  beforeEach(cleanup, { timeout: 10000 });
  afterEach(cleanup, { timeout: 10000 });

  beforeEach((t, done) => {
    fs.mkdir(outputBase, function (err) {
      if (err) {
        return done(err);
      }
      // Linux inherits the setgid of the directory and it messes up our assertions
      // So we explixitly set the mode to 777 before each test
      fs.chmod(outputBase, "777", done);
    });
  });

  it("makes a single directory", (t, done) => {
    mkdirp(outputDirpath, function (err) {
      assert.ifError(err);
      assert.ok(createdMode(outputDirpath));

      done();
    });
  });

  it("makes single directory w/ default mode", skipWin32, (t, done) => {
    mkdirp(outputDirpath, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedDefaultMode());

      done();
    });
  });

  it("makes multiple directories", (t, done) => {
    mkdirp(outputNestedDirpath, function (err) {
      assert.ifError(err);
      assert.ok(createdMode(outputNestedDirpath));

      done();
    });
  });

  it("makes multiple directories w/ default mode", skipWin32, (t, done) => {
    mkdirp(outputNestedDirpath, function (err) {
      assert.ifError(err);
      assert.strictEqual(
        createdMode(outputNestedDirpath),
        expectedDefaultMode(),
      );

      done();
    });
  });

  it("makes directory with custom mode as string", skipWin32, (t, done) => {
    var mode = "777";

    mkdirp(outputDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedMode(mode));

      done();
    });
  });

  it("makes directory with custom mode as octal", skipWin32, (t, done) => {
    var mode = parseInt("777", 8);

    mkdirp(outputDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedMode(mode));

      done();
    });
  });

  it("does not mask a custom mode", skipWin32, (t, done) => {
    var mode = parseInt("777", 8);

    mkdirp(outputDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), mode);

      done();
    });
  });

  it("can create a directory with setgid permission", skipWin32, (t, done) => {
    var mode = "2700";

    mkdirp(outputDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedMode(mode));

      done();
    });
  });

  it(
    "does not change directory mode if exists and no mode given",
    skipWin32,
    (t, done) => {
      var mode = "777";

      mkdirp(outputDirpath, mode, function (err) {
        assert.ifError(err);

        mkdirp(outputDirpath, function (err2) {
          assert.ifError(err2);
          assert.strictEqual(createdMode(outputDirpath), expectedMode(mode));

          done();
        });
      });
    },
  );

  it("makes multiple directories with custom mode", skipWin32, (t, done) => {
    var mode = "777";

    mkdirp(outputNestedDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputNestedDirpath), expectedMode(mode));

      done();
    });
  });

  it("uses default mode on intermediate directories", skipWin32, (t, done) => {
    var intermediateDirpath = path.dirname(outputNestedDirpath);
    var mode = "777";

    mkdirp(outputNestedDirpath, mode, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedDefaultMode());
      assert.strictEqual(
        createdMode(intermediateDirpath),
        expectedDefaultMode(),
      );
      assert.strictEqual(createdMode(outputNestedDirpath), expectedMode(mode));

      done();
    });
  });

  it("changes mode of existing directory", skipWin32, (t, done) => {
    var mode = "777";

    fs.mkdir(outputDirpath, function (err) {
      assert.ifError(err);
      assert.strictEqual(createdMode(outputDirpath), expectedDefaultMode());

      mkdirp(outputDirpath, mode, function (err2) {
        assert.ifError(err2);
        assert.strictEqual(createdMode(outputDirpath), expectedMode(mode));

        done();
      });
    });
  });

  it("surfaces chmod errors", (t, done) => {
    t.mock.method(fs, "chmod", (p, mode, cb) => {
      cb(new Error("boom"));
    });

    var mode = "777";

    mkdirp(outputDirpath, mode, function (err) {
      assert.ok(err);

      done();
    });
  });

  it("does not surface error ENOSUP if chmod is unsupported on the path", (t, done) => {
    t.mock.method(fs, "chmod", (p, mode, cb) => {
      var err = new Error("boom");
      err.code = "ENOSUP";
      cb(err);
    });

    var mode = "777";

    mkdirp(outputDirpath, mode, function (err) {
      assert.ifError(err);

      done();
    });
  });

  it("errors with ENOTDIR if file in path", (t, done) => {
    fs.mkdir(outputDirpath, function (err) {
      assert.ifError(err);

      fs.writeFile(outputNestedPath, contents, function (err2) {
        assert.ifError(err2);

        mkdirp(outputNestedPath, function (err3) {
          assert.ok(err3);
          assert.strictEqual(err3.code, "ENOTDIR");
          assert.strictEqual(err3.path, outputNestedPath);

          done();
        });
      });
    });
  });

  it("errors with ENOTDIR if file in path of nested mkdirp", (t, done) => {
    var nestedPastFile = path.join(outputNestedPath, "./bar/baz/");

    fs.mkdir(outputDirpath, function (err) {
      assert.ifError(err);

      fs.writeFile(outputNestedPath, contents, function (err2) {
        assert.ifError(err2);

        mkdirp(nestedPastFile, function (err3) {
          assert.ok(err3);
          assert.strictEqual(err3.code, "ENOTDIR");
          assert.strictEqual(err3.path, outputNestedPath);

          done();
        });
      });
    });
  });

  it("does not change mode of existing file", skipWin32, (t, done) => {
    var mode = "777";

    fs.mkdir(outputDirpath, function (err) {
      assert.ifError(err);

      fs.writeFile(outputNestedPath, contents, function (err2) {
        assert.ifError(err2);

        var existingMode = createdMode(outputNestedPath);
        assert.notStrictEqual(existingMode, mode);

        mkdirp(outputNestedPath, mode, function (err3) {
          assert.ok(err3);
          assert.strictEqual(createdMode(outputNestedPath), existingMode);

          done();
        });
      });
    });
  });

  it("surfaces mkdir errors that happening during recursion", (t, done) => {
    var stub = t.mock.method(fs, "mkdir");
    stub.mock.mockImplementationOnce((p, mode, cb) => {
      cb(new Error("boom"));
    }, 2);

    mkdirp(outputNestedDirpath, function (err) {
      assert.ok(err);
      assert.strictEqual(stub.mock.callCount(), 2);

      done();
    });
  });

  it("surfaces fs.stat errors", (t, done) => {
    t.mock.method(fs, "stat", (dirpath, cb) => {
      cb(new Error("boom"));
    });

    mkdirp(outputDirpath, function (err) {
      assert.ok(err);

      done();
    });
  });

  it(
    "does not attempt fs.chmod if custom mode matches mode on disk",
    skipWin32,
    (t, done) => {
      var mode = "777";

      mkdirp(outputDirpath, mode, function (err) {
        assert.ifError(err);

        var spy = t.mock.method(fs, "chmod");

        mkdirp(outputDirpath, mode, function (err2) {
          assert.ifError(err2);
          assert.strictEqual(spy.mock.callCount(), 0);

          done();
        });
      });
    },
  );

  describe("symlinks", skipWin32, () => {
    it("succeeds with a directory at the target of a symlink", (t, done) => {
      var target = path.join(outputBase, "target");

      fs.mkdir(target, function (err) {
        assert.ifError(err);

        fs.symlink(target, outputDirpath, function (err2) {
          assert.ifError(err2);

          mkdirp(outputDirpath, function (err3) {
            assert.ifError(err3);
            assert.ok(createdMode(target));

            done();
          });
        });
      });
    });

    it("changes mode of existing directory at the target of a symlink", (t, done) => {
      var target = path.join(outputBase, "target");

      var mode = "777";

      fs.mkdir(target, function (err) {
        assert.ifError(err);

        fs.symlink(target, outputDirpath, function (err2) {
          assert.ifError(err2);
          assert.strictEqual(createdMode(target), expectedDefaultMode());

          mkdirp(outputDirpath, mode, function (err3) {
            assert.strictEqual(err3, undefined);
            assert.strictEqual(createdMode(target), expectedMode(mode));
            done();
          });
        });
      });
    });

    it("creates nested directories at the target of a symlink", (t, done) => {
      var target = path.join(outputBase, "target");
      var expected = path.join(target, "./bar/baz/");

      fs.mkdir(target, function (err) {
        assert.ifError(err);

        fs.symlink(target, outputDirpath, function (err2) {
          assert.ifError(err2);

          mkdirp(outputNestedDirpath, function (err3) {
            assert.ifError(err3);
            assert.ok(createdMode(expected));
            done();
          });
        });
      });
    });

    it("errors with ENOTDIR if the target of a symlink is a file", (t, done) => {
      var target = path.join(outputBase, "test.txt");

      fs.mkdir(outputDirpath, function (err) {
        assert.ifError(err);

        fs.writeFile(target, contents, function (err2) {
          assert.ifError(err2);

          fs.symlink(target, outputNestedPath, function (err3) {
            assert.ifError(err3);

            mkdirp(outputNestedPath, function (err4) {
              assert.ok(err4);
              assert.strictEqual(err4.code, "ENOTDIR");
              assert.strictEqual(err4.path, target);
              done();
            });
          });
        });
      });
    });

    it("errors with ENOTDIR if the target of a symlink is a file in a nested mkdirp", (t, done) => {
      var target = path.join(outputBase, "test.txt");

      fs.writeFile(target, contents, function (err) {
        assert.ifError(err);

        fs.symlink(target, outputDirpath, function (err2) {
          assert.ifError(err2);

          mkdirp(outputNestedDirpath, function (err3) {
            assert.ok(err3);
            assert.strictEqual(err3.code, "ENOTDIR");
            assert.strictEqual(err3.path, target);
            done();
          });
        });
      });
    });

    it("errors with ENOENT if the target of a symlink is missing (a.k.a. dangling symlink)", (t, done) => {
      var target = path.join(outputBase, "dangling-link");

      fs.symlink(target, outputDirpath, function (err) {
        assert.ifError(err);

        mkdirp(outputDirpath, function (err2) {
          assert.ok(err2);
          assert.strictEqual(err2.code, "ENOENT");
          assert.strictEqual(err2.path, target);
          done();
        });
      });
    });

    it("properly surfaces top-level error if lstat fails", (t, done) => {
      var target = path.join(outputBase, "test.txt");

      t.mock.method(fs, "lstat", (dirpath, cb) => {
        cb(new Error("boom"));
      });

      fs.mkdir(outputDirpath, function (err) {
        assert.ifError(err);

        fs.writeFile(target, contents, function (err2) {
          assert.ifError(err2);

          fs.symlink(target, outputNestedPath, function (err3) {
            assert.ifError(err3);

            mkdirp(outputNestedPath, function (err4) {
              assert.ok(err4);
              assert.strictEqual(err4.code, "EEXIST");
              assert.strictEqual(err4.path, outputNestedPath);

              done();
            });
          });
        });
      });
    });

    it("properly surfaces top-level error if readlink fails", (t, done) => {
      var target = path.join(outputBase, "target");

      t.mock.method(fs, "readlink", (dirpath, cb) => {
        cb(new Error("boom"));
      });

      fs.symlink(target, outputDirpath, function (err) {
        assert.ifError(err);

        mkdirp(outputDirpath, function (err2) {
          assert.ok(err2);
          assert.strictEqual(err2.code, "EEXIST");
          assert.strictEqual(err2.path, outputDirpath);

          done();
        });
      });
    });
  });
}

describe("mkdirp", suite);

describe("mkdirp with umask", () => {
  var startingUmask;
  before((t, done) => {
    startingUmask = process.umask(parseInt("066", 8));

    done();
  });

  after((t, done) => {
    process.umask(startingUmask);

    done();
  });

  // Initialize the normal suite
  suite();
});
