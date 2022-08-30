'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var sinon = require('sinon');
var expect = require('expect');
var rimraf = require('rimraf');

var mkdirpStream = require('../');

function suite(moduleName) {
  var stream = require(moduleName);

  function sink() {
    return new stream.Writable({
      objectMode: true,
      write: function (chunk, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        cb();
      },
    });
  }

  describe('mkdirpStream (' + moduleName + ')', function () {
    var MASK_MODE = parseInt('7777', 8);
    var isWindows = os.platform() === 'win32';

    var outputBase = path.join(__dirname, './out-fixtures');
    var outputDirpath = path.join(outputBase, './foo');

    function cleanup(done) {
      this.timeout(20000);

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

      // Set to use to "get" it
      var current = process.umask(0);
      // Then set it back for the next test
      process.umask(current);

      return mode & ~current;
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

    it('exports a main function', function (done) {
      expect(typeof mkdirpStream).toEqual('function');
      done();
    });

    it('takes a string to create', function (done) {
      function assert(err) {
        expect(statMode(outputDirpath)).toBeDefined();
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(['test']), mkdirpStream(outputDirpath), sink()],
        assert
      );
    });

    it('takes a resolver function that receives chunk', function (done) {
      var expected = 'test';

      function resolver(chunk, cb) {
        expect(chunk).toEqual(expected);
        cb(null, outputDirpath);
      }

      function assert(err) {
        expect(statMode(outputDirpath)).toBeDefined();
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(['test']), mkdirpStream(resolver), sink()],
        assert
      );
    });

    it('can pass a mode as the 3rd argument to the resolver callback', function (done) {
      if (isWindows) {
        this.skip();
        return;
      }

      var mode = applyUmask('700');

      var expected = 'test';

      function resolver(chunk, cb) {
        expect(chunk).toEqual(expected);
        cb(null, outputDirpath, mode);
      }

      function assert(err) {
        expect(statMode(outputDirpath)).toEqual(mode);
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(['test']), mkdirpStream(resolver), sink()],
        assert
      );
    });

    it('can pass an error as the 1st argument to the resolver callback to error', function (done) {
      function resolver(chunk, cb) {
        cb(new Error('boom'));
      }

      function notExists() {
        statMode(outputDirpath);
      }

      function assert(err) {
        expect(err).toBeDefined();
        expect(notExists).toThrow();
        done();
      }

      stream.pipeline(
        [stream.Readable.from(['test']), mkdirpStream(resolver), sink()],
        assert
      );
    });

    it('works with objectMode', function (done) {
      function resolver(chunk, cb) {
        expect(typeof chunk).toEqual('object');
        expect(chunk.dirname).toBeDefined();
        cb(null, chunk.dirname);
      }

      function assert(err) {
        expect(statMode(outputDirpath)).toBeDefined();
        done(err);
      }

      stream.pipeline(
        [
          stream.Readable.from([{ dirname: outputDirpath }]),
          mkdirpStream(resolver),
          sink(),
        ],
        assert
      );
    });

    it('bubbles mkdir errors', function (done) {
      sinon.stub(fs, 'mkdir').callsFake(function (dirpath, mode, cb) {
        cb(new Error('boom'));
      });

      function notExists() {
        statMode(outputDirpath);
      }

      function assert(err) {
        expect(err).toBeDefined();
        expect(notExists).toThrow();
        fs.mkdir.restore();
        done();
      }

      stream.pipeline(
        [stream.Readable.from(['test']), mkdirpStream(outputDirpath), sink()],
        assert
      );
    });
  });
}

suite('stream');
suite('streamx');
suite('readable-stream');
