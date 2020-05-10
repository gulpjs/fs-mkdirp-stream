'use strict';

var path = require('path');

var fs = require('graceful-fs');

var MASK_MODE = parseInt('7777', 8);

function mkdirp(dirpath, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = undefined;
  }

  if (typeof mode === 'string') {
    mode = parseInt(mode, 8);
  }

  dirpath = path.resolve(dirpath);

  fs.mkdir(dirpath, mode, onMkdir);

  function onMkdir(mkdirErr) {
    if (!mkdirErr) {
      return fs.stat(dirpath, onStat);
    }

    switch (mkdirErr.code) {
      case 'ENOENT': {
        return mkdirp(path.dirname(dirpath), onRecurse);
      }

      case 'EEXIST': {
        return fs.stat(dirpath, onStat);
      }

      default: {
        return callback(mkdirErr);
      }
    }

    function onStat(statErr, stats) {
      if (statErr) {
        return callback(statErr);
      }

      if (!stats.isDirectory()) {
        return callback(mkdirErr);
      }

      if (!mode) {
        return callback();
      }

      if ((stats.mode & MASK_MODE) === mode) {
        return callback();
      }

      fs.chmod(dirpath, mode, callback);
    }
  }

  function onRecurse(recurseErr) {
    if (recurseErr) {
      return callback(recurseErr);
    }

    mkdirp(dirpath, mode, callback);
  }
}

module.exports = mkdirp;
