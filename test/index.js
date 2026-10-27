"use strict";

var os = require("node:os");
var path = require("node:path");

var fs = require("graceful-fs");
var assert = require("node:assert");
var { afterEach, beforeEach, describe, it } = require("node:test");
var rimraf = require("rimraf");

var mkdirpStream = require("../");

function suite(moduleName) {
  var stream = require(moduleName);

  function sink() {
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === "function") {
          cb = enc;
        }

        cb();
      },
    });
  }

  describe("mkdirpStream (" + moduleName + ")", function () {
    var MASK_MODE = parseInt("7777", 8);
    var isWindows = os.platform() === "win32";

    var outputBase = path.join(__dirname, "./out-fixtures");
    var outputDirpath = path.join(outputBase, "./foo");

    function cleanup(done) {
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
      if (typeof mode !== "number") {
        mode = parseInt(mode, 8);
      }

      // Set to use to "get" it
      var current = process.umask(0);
      // Then set it back for the next test
      process.umask(current);

      return mode & ~current;
    }

    beforeEach((t, done) => cleanup(done), { timeout: 10000 });

    beforeEach(function (t, done) {
      fs.mkdir(outputBase, function (err) {
        if (err) {
          return done(err);
        }
        // Linux inherits the setgid of the directory and it messes up our assertions
        // So we explixitly set the mode to 777 before each test
        fs.chmod(outputBase, "777", done);
      });
    });

    afterEach((t, done) => cleanup(done), { timeout: 10000 });

    it("exports a main function", function () {
      assert.strictEqual(typeof mkdirpStream, "function");
    });

    it("takes a string to create", function (t, done) {
      function assertion(err) {
        assert.ok(statMode(outputDirpath));
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(["test"]), mkdirpStream(outputDirpath), sink()],
        assertion,
      );
    });

    it("takes a resolver function that receives chunk", function (t, done) {
      var expected = "test";

      function resolver(chunk, cb) {
        assert.strictEqual(chunk, expected);
        cb(null, outputDirpath);
      }

      function assertion(err) {
        assert.ok(statMode(outputDirpath));
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(["test"]), mkdirpStream(resolver), sink()],
        assertion,
      );
    });

    it("can pass a mode as the 3rd argument to the resolver callback", function (t, done) {
      if (isWindows) {
        this.skip();
        return;
      }

      var mode = applyUmask("700");

      var expected = "test";

      function resolver(chunk, cb) {
        assert.strictEqual(chunk, expected);
        cb(null, outputDirpath, mode);
      }

      function assertion(err) {
        assert.strictEqual(statMode(outputDirpath), mode);
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(["test"]), mkdirpStream(resolver), sink()],
        assertion,
      );
    });

    it("can pass an error as the 1st argument to the resolver callback to error", function (t, done) {
      function resolver(chunk, cb) {
        cb(new Error("boom"));
      }

      function notExists() {
        statMode(outputDirpath);
      }

      function assertion(err) {
        assert.ok(err);
        assert.throws(notExists);
        done();
      }

      stream.pipeline(
        [stream.Readable.from(["test"]), mkdirpStream(resolver), sink()],
        assertion,
      );
    });

    it("works with objectMode", function (t, done) {
      function resolver(chunk, cb) {
        assert.strictEqual(typeof chunk, "object");
        assert.ok(chunk.dirname);
        cb(null, chunk.dirname);
      }

      function assertion(err) {
        assert.ok(statMode(outputDirpath));
        done(err);
      }

      stream.pipeline(
        [
          stream.Readable.from([{ dirname: outputDirpath }]),
          mkdirpStream(resolver),
          sink(),
        ],
        assertion,
      );
    });

    it("bubbles mkdir errors", function (t, done) {
      t.mock.method(fs, "mkdir", (dirpath, mode, cb) => cb(new Error("boom")));

      function notExists() {
        statMode(outputDirpath);
      }

      function assertion(err) {
        assert.ok(err);
        assert.throws(notExists);
        done();
      }

      stream.pipeline(
        [stream.Readable.from(["test"]), mkdirpStream(outputDirpath), sink()],
        assertion,
      );
    });
  });
}

suite("stream");
suite("streamx");
suite("readable-stream");
