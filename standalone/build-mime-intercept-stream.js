/* eslint-disable prefer-arrow-callback */
/**
 * Module dependencies
 */

var TransformStream = require('stream').Transform;
var gc = require('./gc');
var fileType = require('file-type');

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

    // try to detect
    const detection = fileType.fromBuffer(Buffer.concat(_detectBuffer.chunks)) // (Buffer.concat(_detectBuffer.chunks));
    // if type known or limit exceeded, emit
    // (file-type (no longer) guarantees that it needs at most 'minimumBytes' bytes)
    const MIN_BYTES = 4100
    if (detection || _detectBuffer.length >= MIN_BYTES) {
      // this._type = detection;
      this.emit("type", this.type);
      // this._typeEmitted = true;
      onMimeDetected(detection);
      proceed();
    } else {
      _this.push(chunk);
      return proceed();
    }

    /*
    magic.detect(Buffer.concat(_detectBuffer.chunks), (merr, detection) => {
      detectionInProgress--;
      if (merr) { /* return cb(err); * /}
      if (detectedMimeType !== undefined) {
        _this.push(chunk);
        return proceed();
      }

      onMimeDetected(detection);
      proceed();
    });
    */
  };

  function onMimeDetected (detection) {
    if (wasProbablyGivenAnEmptyFile || detection || _detectBuffer.length >= 16384) {
      detectedMimeType = detection ? detection : null;
      __detect__.emit('type', detectedMimeType);
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
          // __progress__.unpipe();
          __detect__.unpipe();
        });

        // Clean up any files we've already written
        gc(options, adapter, err, __newFile, outs__);
        // TODO: Should we be bailing here without `proceed`ing??
      }
    }
  }

  return __detect__;
};
