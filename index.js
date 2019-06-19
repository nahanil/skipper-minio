/* eslint-disable prefer-arrow-callback */
/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var Minio = require('minio');
var buildMinioReceiverStream = require('./standalone/build-minio-receiver-stream');



/**
 * skipper-minio
 *
 * @type {Function}
 * @param  {Object} options
 * @return {Object}
 */

module.exports = function SkipperMinio(options) {
  options = options || {};

  function _getClient() {
    return new Minio.Client(options);
  }

  var adapter = {};
  adapter.ls = function(dirpath, cb) {
    var results = [];
    var stream = _getClient()
      .listObjectsV2(options.bucket,
        (
          // Allow empty dirname (defaults to ''), & strip leading slashes
          // from dirname to form prefix
          (dirpath || '').replace(/^\/+/, '')
        ),
        true
      );

    stream.on('data', function(obj) {
      if (obj && obj.name) {
        results.push(obj.name);
      }
    });
    stream.on('error', function(err) { cb(err); } );
    stream.on('end', function() { cb(undefined, results); });
  };

  adapter.rm = function(fd, cb) {
    var workingFd = fd.replace(/^\/+/, '');
    var client = _getClient();
    cb = cb || function noop() {};

    // Allow recursively deleting a 'folder' with a wildcard (fd = 'something/*')
    if (workingFd.substr(-2) === '/*') {
      adapter.ls(workingFd.substr(0, workingFd.length - 2), (err, files) => {
        if (err) { return cb(err); };
        if (!files.length) { return cb(); }

        var complete = 0;
        for (var i = 0; i < files.length; i++) {
          arguments.callee(files[i], () => {
            complete++;
            if (complete === files.length) {
              return cb();
            }
          });
        }
      });
    } else {
      client.removeObject(options.bucket, workingFd, function(err) {
        return cb(err);
      });//_∏_
    }
  };

  adapter.read = function(fd, cb) {
    if (!cb || !_.isFunction(cb)) {
      throw new Error(`skipper-minio.read expects a callback function as the second argument`);
    }

    _getClient()
      .getObject(options.bucket, fd.replace(/^\/+/), function(err, dataStream) {
        if (err) {
          return cb(err);
        }
        var bufs = [];
        dataStream.on('data', function(d){ bufs.push(d); });
        dataStream.on('end', function() {
          cb(null, Buffer.concat(bufs));
        });
      });
  };

  adapter.receive = function(opts) {
    return buildMinioReceiverStream(_getClient(), _.defaults(opts || {}, options), adapter);
  };

  return adapter;
};




