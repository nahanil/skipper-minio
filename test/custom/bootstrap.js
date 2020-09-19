const sails = require('sails');
const ensureBuckets = require('../common/ensure-buckets');

// Before running any tests...
before(function(done) {
  ensureBuckets(() => {
    this.timeout(5000);

    sails.lift({
      port: 7654,
      hooks: { grunt: false },
      log: { level: 'warn' },
      uploads: Object.assign({}, require('../options'), {
        adapter: require('../../')
      })
    }, function(err) {
      if (err) { return done(err); }
      global.sails = global.sails || sails;
      return done();
    });
  });
});

// After all tests have finished...
after(function(done) {
  sails.lower(done);
  delete global.sails;
});
