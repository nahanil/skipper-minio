/* eslint-disable prefer-arrow-callback */
/**
 * Module dependencies
 */

var TransformStream = require('stream').Transform;
var gc = require('./gc');
var FileType = require('file-type');

/**
 * [exports description]
 * @param  {[type]} options    [description]
 * @param  {[type]} __newFile  [description]
 * @param  {[type]} receiver__ [description]
 * @param  {[type]} outs__     [description]
 * @return {[type]}            [description]
 */
module.exports = function buildMimeInterceptStream (options, __newFile, outs__, adapter, actuallyRegisterUpstreamPipes) {
  options = options || {};
  // var log = options.log || function noOpLog(){};

  var wasProbablyGivenAnEmptyFile = false;
  var detectionInProgress = 0;
  var detectedMimeType = undefined;
  var emitted = false;
  var _detectBuffer = {
    chunks: [],
    length: 0,
  };

  // If teeny weeny empty file gets uploaded this would just hang until the request times out
  __newFile.on('end', function () {
    if (detectedMimeType === undefined) {
      wasProbablyGivenAnEmptyFile = true;
      if (!detectionInProgress) {
        onMimeDetected(null);
      }
    }
  });

  var __detect__ = new TransformStream();

  __detect__._write = function (chunk, encoding, proceed) {
    var _this = this;
    detectionInProgress++;
    if (detectedMimeType !== undefined) {
      _this.push(chunk);
      return proceed();
    }

    _detectBuffer.chunks.push(chunk);
    _detectBuffer.length += chunk.length;

    FileType.fromBuffer(Buffer.concat(_detectBuffer.chunks))
      .then(function (detection) {
        detectionInProgress--;

        if (detectedMimeType !== undefined) {
          _this.push(chunk);
          return proceed();
        }

        onMimeDetected(detection ? detection.mime : undefined);
        proceed();
      });
  };

  function onMimeDetected (detection) {
    if (emitted) { return; }
    if (wasProbablyGivenAnEmptyFile || detection || _detectBuffer.length >= 16384) {
      detectedMimeType = detection ? detection : null;
      __detect__.emit('type', detectedMimeType);
      emitted = true;
      __newFile.mimeType = detectedMimeType;

      // flush chunk buffer
      actuallyRegisterUpstreamPipes(null);
      for (var i = 0; i < _detectBuffer.chunks.length; i++) {
        __detect__.push(_detectBuffer.chunks[i]);
      }
      _detectBuffer.chunks.length = 0;

      // Make sure this file type is allowed (if a whitelist of accepted types was given)
      if(options.allowedFileTypes && options.allowedFileTypes.indexOf(detectedMimeType) === -1) {
        var err = new Error();
        err.code = 'E_INVALID_FILE_TYPE';
        err.name = 'Upload Error';
        err.message = 'Uploaded file ' + __newFile.filename + ' of type ' + (detectedMimeType || 'UNKNOWN') + ' is not allowed';
        err.detectedMimeType = detectedMimeType || 'UNKNOWN';

        //  Stop listening for progress events
        // __progress__.removeAllListeners('progress');
        // Unpipe the progress stream, which feeds the disk stream, so we don't keep dumping to disk
        process.nextTick(function() {
          __detect__.unpipe();
        });

        // Clean up any files we've already written
        gc(options, adapter, err, __newFile, outs__);
      }
    }
  }

  return __detect__;
};
