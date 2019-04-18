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
    _getClient()
      .listObjectsV2({
        Bucket: options.bucket,
        // Delimiter: '/',  « doesn't seem to make any meaningful difference
        Prefix: (
          // Allow empty dirname (defaults to ''), & strip leading slashes
          // from dirname to form prefix
          (dirpath || '').replace(/^\/+/, '')
        )
        // FUTURE: maybe also check out "MaxKeys"..?
      }, function(err, result) {
        if (err){ return cb(err); }

        var formattedResults;
        try {
          formattedResults = _.pluck(result['Contents'], 'Key');
        } catch (err) { return cb(err); }

        return cb(undefined, formattedResults);
      });//_∏_
  };

  adapter.read = function(fd, cb) {
    if (!cb || !_.isFunction(cb)) {
      throw new Error(`skipper-minio.read expects a callback function as the second argument`);
    }

    _getClient()
      .getObject(options.bucket, fd.replace(/^\/+/), function(err, dataStream) {
        cb(err, dataStream);
      });
  };

  adapter.receive = function(opts) {
    return buildMinioReceiverStream(_getClient(), _.defaults(opts || {}, options), adapter);
  };

  return adapter;
};




