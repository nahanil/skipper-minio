/* eslint-disable prefer-arrow-callback */
/**
 * Module dependencies
 */

var WritableStream = require('stream').Writable;
var Transform = require('stream').Transform;
var _ = require('@sailshq/lodash');
var buildProgressStream = require('./build-progress-stream');
var debug = require('debug')('skipper-minio');
var util = require('util');


/**
 * A simple receiver for Skipper that writes Upstreams to
 * the configured minio instance.
 *
 * (TODO: CURRENTLY DOESN'T) Includes a garbage-collection mechanism for failed
 * uploads.
 *
 * @param  {Object} options
 * @return {Stream.Writable}
 */
module.exports = function buildDiskReceiverStream(minioClient, options, adapter) {
  options = options || {};
  options.meta = options.meta || {};
  var log = options.log || function noOpLog(){};

  // if maxBytes is configed in "MB" ended string
  // convert it into bytes
  if (options.maxBytes) {
    var _maxBytesRegResult = (options.maxBytes + '').match(/(\d+)m/i);
    if (!_.isNull(_maxBytesRegResult)){
      options.maxBytes = _maxBytesRegResult[1] * 1024 * 1024;
    }
  }

  _.defaults(options, {

    // // The default `saveAs` implements a unique filename by combining:
    // //  • a generated UUID  (like "4d5f444-38b4-4dc3-b9c3-74cb7fbbc932")
    // //  • the uploaded file's original extension (like ".jpg")
    // saveAs: function(__newFile, cb) {
    //   return cb(null, UUIDGenerator.v4() + path.extname(__newFile.filename));
    // },

    // Bind a progress event handler, e.g.:
    // function (milestone) {
    //   milestone.id;
    //   milestone.name;
    //   milestone.written;
    //   milestone.total;
    //   milestone.percent;
    // },
    onProgress: undefined,

    // Upload limit (in bytes)
    // defaults to ~15MB
    maxBytes: 15000000,

    // By default, upload files to `uploads` bucket
    bucket: 'uploads',

    // Specify whitelist of allowed mime types for uploads (checks actual upload stream contents, not file extension)
    // allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],

    // Specify a transformer function which returns some kind of pipeable stream to
    // modify the upload on it's way to it's final destination
    transformer: undefined,
  });


  var receiver__ = WritableStream({ objectMode: true });

  // if onProgress handler was provided, bind an event automatically:
  if (_.isFunction(options.onProgress)) {
    receiver__.on('progress', options.onProgress);
  }

  // Track the progress of all file uploads that pass through this receiver
  // through one or more attached Upstream(s).
  receiver__._files = [];


  // This `_write` method is invoked each time a new file is received
  // from the Readable stream (Upstream) which is pumping filestreams
  // into this receiver.  (filename === `__newFile.filename`).
  receiver__._write = function onFile(__newFile, encoding, done) {
    // `skipperFd` is the file descriptor-- the unique identifier.
    // Often represents the location where file should be written.
    var skipperFd = __newFile.skipperFd || (_.isString(__newFile.fd)? __newFile.fd : undefined);
    if (!_.isString(skipperFd)) {
      return done(new Error('In skipper-minio adapter, write() method called with a stream that has an invalid `skipperFd`: '+skipperFd));
    }

    // Error reading from the file stream
    debug('binding error handler for incoming file in skipper-minio');
    __newFile.on('error', function(err) {
      debug('Read error on file '+__newFile.filename+ '::'+ util.inspect(err&&err.stack));
      log('***** READ error on file ' + __newFile.filename, '::', err);
    });

    // Create a new write stream to write to minio
    var outs__ = new Transform();
    outs__._write = function (chunk, encoding, proceed) {
      this.push(chunk);
      proceed();
    };

    // When the file is done writing, call the callback
    outs__.on('finish', function successfullyWroteFile() {
      log('finished file: ' + __newFile.filename);
      // File the file entry in the receiver with the same fd as the finished stream.
      var file = _.find(receiver__._files, {fd: skipperFd});
      if (file) {
        // Set the byteCount of the stream to the "total" value of the file, which has
        // been updated as the file was written.
        __newFile.byteCount = file.total;
      }
      // If we couldn't find the file in the receiver, that's super weird, but output
      // a notice and try to continue anyway.
      else {
        debug('Warning: received `finish` event for file `' + __newFile.filename + '` uploaded via field `' + __newFile.field + '`, but could not find a record of that file in the receiver.');
        debug('Was this a zero-byte file?');
        debug('Attempting to return the file anyway...');
      }
      // Indicate that a file was persisted.
      receiver__.emit('writefile', __newFile);
      // done();
    });
    outs__.on('E_EXCEEDS_UPLOAD_LIMIT', function (err) {
      done(err);
    });

    // Create another stream that simply keeps track of the progress of the file stream and emits `progress` events
    // on the receiver.
    var __progress__ = buildProgressStream(options, __newFile, receiver__, outs__, adapter);

    // Forward any uncaught errors to the receiver.
    //
    // Note -- it's important to forward using `.emit` rather than calling `done()`, because if for some reason an error occurs
    // _after_ the receiver stream closes, calling the `done()` method will throw another error.
    // Skipper core handles errors on the receiver and can deal with those errors even after the receiver stream has closed.
    outs__.on('error', function(err) {
      var newError = new Error('Error writing file `' + skipperFd + '` to minio (for field `'+__newFile.field+'`): ' + util.inspect(err, {depth: 5}));
      receiver__.emit('error', newError);
    });
    __progress__.on('error', function(err) {
      var newError = new Error('Error reported from the progress stream while uploading file `' + skipperFd + '` (for field `'+__newFile.field+'`): ' + util.inspect(err, {depth: 5}));
      receiver__.emit('error', newError);
    });

    // Finally pipe the progress THROUGH the progress stream and optional 'transformer'
    // and out to disk.
    if (options.transformer && _.isFunction(options.transformer)) {
      let transformer = options.transformer();

      // options.transformer should be a function that returns some kinda stream
      if (!(transformer instanceof require('stream').Stream)) {
        var newError = new Error('Invalid custom "transformer" stream passed to adapter while uploading file `' + skipperFd);
        receiver__.emit('error', newError);
        return;
      }

      transformer.on('error', function(err) {
        var newError = new Error('Error reported from the custom "transformer" stream while uploading file `' + skipperFd +': ' + util.inspect(err, {depth: 5}));
        receiver__.emit('error', newError);
      });

      __newFile
        .pipe(__progress__)
        .pipe(transformer)
        .pipe(outs__);
    } else {
      __newFile
        .pipe(__progress__)
        .pipe(outs__);
    }

    minioClient.putObject(options.bucket, skipperFd, outs__, options.meta, function(err) {
      done(err);
    });
    // });

  };

  return receiver__;
}; // </MinioReceiver>
