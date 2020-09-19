const minioOptions = require('../options');
const ensureBuckets = require('../common/ensure-buckets');

ensureBuckets(() => {
  minioOptions.module = require('../../');
  require('skipper-adapter-tests')(minioOptions);
});
