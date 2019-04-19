var _ = require('@sailshq/lodash');

module.exports = function gc(options, adapter, err, __newFile, outs__) {
  var log = options.log || function noOpLog() {};
  // Garbage-collects the bytes that were already written for this file.
  // (called when a read or write error occurs)
  log('************** Garbage collecting file `' + __newFile.filename + '` located @ ' + (__newFile.skipperFd || (_.isString(__newFile.fd) ? __newFile.fd : undefined)) + '...');
  adapter.rm((__newFile.skipperFd || (_.isString(__newFile.fd) ? __newFile.fd : undefined)), function(gcErr) {
    if (gcErr) { return outs__.emit('E_EXCEEDS_UPLOAD_LIMIT',[err].concat([gcErr])); }
    return outs__.emit('E_EXCEEDS_UPLOAD_LIMIT',err);
  });
};
