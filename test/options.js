module.exports = {
  bucket: process.env.BUCKET || 'skipper-minio',
  endPoint: process.env.ENDPOINT || 'localhost',
  accessKey: process.env.KEY || 'ABC123',
  secretKey: process.env.SECRET || 'ABCDE12345',
  port: parseInt(process.env.PORT) || 9000,
  region: process.env.REGION || '',
  useSSL: 'USE_SSL' in process.env ? !!parseInt(process.env.USE_SSL) : false
};
