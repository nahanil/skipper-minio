var minioOptions = {
  bucket: process.env.BUCKET || 'skipper-minio',
  endPoint: process.env.ENDPOINT || 'localhost',
  accessKey: process.env.KEY || 'ABC123',
  secretKey: process.env.SECRET || 'ABCDE12345',
  port: parseInt(process.env.PORT) || 9000,
  region: process.env.REGION || '',
  useSSL: 'USE_SSL' in process.env ? !!parseInt(process.env.USE_SSL) : false
};
var minio = require('minio').Client;
var client = new minio(minioOptions);


client.bucketExists(minioOptions.bucket, function(err, exists) {
  if (err) {
    throw new Error('Unable to check if bucket already exists...');
  }
  if (exists) {
    return startTests();
  }

  client.makeBucket(minioOptions.bucket, function(err) {
    if (err) {
      throw new Error('Error creating bucket.', err.stack);
    }
    startTests();
  });
});



function startTests () {
  // Actually run the acceptance tests
  minioOptions.module = require('../');
  require('skipper-adapter-tests')(minioOptions);
}
