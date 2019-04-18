# [<img title="skipper-minio - Minio storage adapter for Skipper" src="http://i.imgur.com/P6gptnI.png" width="200px" alt="skipper emblem - face of a ship's captain"/>](https://github.com/texh/skipper-minio)
# Minio Storage Adapter

[![NPM version](https://badge.fury.io/js/skipper-minio.png)](http://badge.fury.io/js/skipper-minio) &nbsp; &nbsp;
[![Build Status](https://travis-ci.org/texh/skipper-minio.svg?branch=master)](https://travis-ci.org/texh/skipper-minio)

Minio adapter for receiving [upstreams](https://github.com/balderdashy/skipper#what-are-upstreams). Particularly useful for streaming multipart file uploads from the [Skipper](github.com/balderdashy/skipper) body parser.


## Installation

```
$ npm install skipper-minio --save
```

> If you're using this module outside of Sails (e.g. Express or a vanilla Node.js server), make sure you have skipper itself [installed as your body parser](https://sailsjs.com/documentation/concepts/middleware?q=adding-or-overriding-http-middleware).



## Usage

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

