var minio = require('minio').Client;
var minioOptions = require('../options');

module.exports = function (done) {
  var client = new minio(minioOptions);

  client.bucketExists(minioOptions.bucket, function(err, exists) {
    if (err) {
      throw new Error('Unable to check if bucket already exists...');
    }
    if (exists) {
      return done();
    }

    client.makeBucket(minioOptions.bucket, function(err) {
      if (err) {
        throw new Error('Error creating bucket.', err.stack);
      }
      done();
    });
  });
};
