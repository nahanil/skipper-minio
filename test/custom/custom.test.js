/* global sails */
const expect = require('chai').expect;
const Path = require('path');
const fs = require('fs');

describe('Sanity check', () => {
  it('sails-hook-uploads should exist', () => {
    expect(sails.uploadOne).to.exist;
  });
});

describe('Readable Stream', () => {
  it('should upload a readable stream', async function () {
    this.timeout(30000);
    const photoStream = fs.createReadStream(Path.resolve(__dirname, '../fixtures/test.png'));
    const photoInfo = await sails.uploadOne(photoStream);

    expect(photoInfo.fd).to.not.be.empty;
    expect(photoInfo.name).to.not.be.empty;
  });
});
