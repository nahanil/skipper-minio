# [<img title="skipper-minio - Minio storage adapter for Skipper" src="http://i.imgur.com/P6gptnI.png" width="200px" alt="skipper emblem - face of a ship's captain"/>](https://github.com/texh/skipper-minio)
# Minio/Amazon S3 Storage Adapter

[![NPM version](https://badge.fury.io/js/skipper-minio.png)](http://badge.fury.io/js/skipper-minio) &nbsp; &nbsp;
[![Build Status](https://travis-ci.org/texh/skipper-minio.svg?branch=master)](https://travis-ci.org/texh/skipper-minio)

Minio adapter for receiving [upstreams](https://github.com/balderdashy/skipper#what-are-upstreams). Particularly useful for streaming multipart file uploads from the [Skipper](github.com/balderdashy/skipper) body parser.


## Installation

```
$ npm install skipper-minio --save
```

> If you're using this module outside of Sails (e.g. Express or a vanilla Node.js server), make sure you have skipper itself [installed as your body parser](https://sailsjs.com/documentation/concepts/middleware?q=adding-or-overriding-http-middleware).



## Usage

### Using Minio
In the route(s) / controller action(s) where you want to accept file uploads, do something like:

```javascript
req.file('avatar')
.upload({
  // ...options here...
  // These *could* be better off in `sails.config.uploads`
  adapter: require('skipper-minio'),
  bucket: 'avatars',
  endPoint: 'minio.mydomain.com',
  port: 9000,
  accessKey: 'ABCDEFGH123456789',
  secretKey: 'ABCDEFGH123456789ABCDEFGH123456789',
  useSSL: false,
  maxBytes: 1024 * 1024,

  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
  transformer: () => { return someDataModifyingPipeableToCropAvatars }
}, function whenDone(err, uploadedFiles) {
  if (err) return res.negotiate(err);
  else return res.ok({
    files: uploadedFiles,
    textParams: req.params.all()
  });
});
```
You can also use the nifty [sails-hook-uploads](https://github.com/sailshq/sails-hook-uploads) for async/await-able upload processing in Sails v1.

### Using Amazon S3
```javascript
req.file('avatar')
.upload({
  adapter: require('skipper-minio'),
  bucket: 'avatars',
  accessKey: 'ABCDEFGH123456789',
  secretKey: 'ABCDEFGH123456789ABCDEFGH123456789'
}, function whenDone(err, uploadedFiles) {
  if (err) return res.negotiate(err);
  else return res.ok({
    files: uploadedFiles,
    textParams: req.params.all()
  });
});
```

### Only allow files of type x
[mmmagic](https://www.npmjs.com/package/mmmagic) is used to detect the [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types) of incoming upload streams.

You're able to restrict the types of files that will be accepted by passing an array of MIME types to the `allowedFileTypes` setting.

### Transforming an incoming upload
You're able to specify a `transformer` method to modify the incoming upload.

The following example accepts jpeg/png/gif uploads which it crops & resizes and stores as a jpeg using [sharp](https://www.npmjs.com/package/sharp).
```js
const uuid = require('uuid/v4');
const sharp = require('sharp');

req.file('avatar')
.upload({
  // Ensure the resulting file always has a `.jpg` extension regardless of the filename of the original upload
  saveAs: (__incomingFileStream, cb) => { return cb(null, uuid() + '.jpg'); },

  // Specify allowed input file types
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],

  // Uploaded files will be piped through the `transformer`s returned value before being sent to minio
  // It will be passed a single argument - the detected MIME type of the incoming stream, or `null`
  transformer: (detectedMimeType) => {
    return sharp()
      .flatten({ background: {r: 255, g: 255, b: 255, alpha: 1} })
      .resize({
        height: 100,
        width: 100,
      })
      .jpeg({ progressive: true });
  }
}, function whenDone(err, uploadedFiles) {
  if (err) return res.negotiate(err);
  else return res.ok({
    files: uploadedFiles,
    textParams: req.params.all()
  });
});
```

### File extension normalisation
If you specify the `runSaveAsAfterMimeDetection` boolean option then the `saveAs` method will be called once again just before uploading the file to minio.
This _could_ allow you to normalise the final filename of an upload. The use case that prompted this was
- A user uploads a jpeg file with a `.png` extension
- A user uploads a jpeg file with a `.JPEG` extension, but other moving parts of the system are looking for and will only work on files with `.jpg` file extension
If this option is `true` then your `saveAs` method _will be run multiple times_.

You probably shouldn't use this (it's more for my own reference when I come back in 12 months and wonder wtf is going on) but hey, check out our `config/uploads.js`
```
module.exports.uploads = {
	// ...
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
  fileTypeMap: {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
  },

  runSaveAsAfterMimeDetection: true,
  saveAs: function saveUploadAs(__file, cb) {
    const uuid = require('uuid/v4')
    const extension = (sails.config.uploads.fileTypeMap[__file.mimeType] || __file.filename.split('.').pop() || '.upload').toLowerCase()

    // Because this saveAs method is gonna run probably twice, we attach  the generated uuid to __file to save CPU cycles the next time we run
    let filename
    if (__file.__userlandFileName) {
      filename = __file.__userlandFileName
    } else {
      filename = uuid()
      __file.__userlandFileName = filename
    }

    return cb(null, filename + extension)
  }
}
```

## TODO
- Run tests against ~[minio](https://hub.docker.com/r/minio/minio)~ &~ [s3mock](https://hub.docker.com/r/adobe/s3mock/)


## Contribute

Please! I have no idea what I'm doing here :wink:


To run the tests:

```shell
$ npm test
```


## License

**[MIT](./LICENSE)**

Based on work by [Jarrod Linahan](https://github.com/texh/skipper-minio/), [Mike McNeil](https://sailsjs.com/studio), [Balderdash Design Co.](http://balderdash.co), [Sails Co.](https://sailsjs.com/about)

See `LICENSE.md`.

This module is intended to be uesd with the [Sails framework](https://sailsjs.com), and is free and open-source under the [MIT License](./LICENSE).


![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

