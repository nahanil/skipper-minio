# Testing

The tests are divided into two parts
- `acceptance` -> This basically just bootstraps and runs the upstream [skipper-adapter-tests](https://github.com/balderdashy/skipper-adapter-tests) suite
- `custom` -> This is for other tests related to .. other things

## Locally
If you have docker & `docker-compose` installed you can reuse the stuff Travis-CI does for testing locally.

```
docker create network dev
docker-compose -f .travis/docker-compose.yml up -d
npm test
```