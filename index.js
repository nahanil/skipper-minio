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
  adapter.rm = function(fd, cb) {
    _getClient()
      .removeObject(options.bucket, fd.replace(/^\/+/, ''), function(err) {
        return cb(err);
      });//_∏_
  };

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




