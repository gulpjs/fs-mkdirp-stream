# Changelog

## [2.0.0](https://www.github.com/gulpjs/fs-mkdirp-stream/compare/v1.0.0...v2.0.0) (2022-08-30)


### ⚠ BREAKING CHANGES

* Rework errors surfaced when encountering files or symlinks (#4)
* Ensure correct node version >=10.13.0 (fixes #10) (#12)
* Switch to streamx & remove `obj` API (closes #7) (#11)
* Stop using `process.umask()` & fallback to node default mode (#6)
* Upgrade scaffold, dropping node <10 support

### Features

* Ensure correct node version >=10.13.0 (fixes [#10](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/10)) ([#12](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/12)) ([e5690b4](https://www.github.com/gulpjs/fs-mkdirp-stream/commit/e5690b488bfd093f09a59889dbced36ff85c8878))
* Stop using `process.umask()` & fallback to node default mode ([#6](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/6)) ([f78d60b](https://www.github.com/gulpjs/fs-mkdirp-stream/commit/f78d60b12da14db2639d0964f81f254f16b20ba5))
* Switch to streamx & remove `obj` API (closes [#7](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/7)) ([#11](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/11)) ([072d026](https://www.github.com/gulpjs/fs-mkdirp-stream/commit/072d0262d167bd7bbacd875b032835c60661f6f8))


### Bug Fixes

* Rework errors surfaced when encountering files or symlinks ([#4](https://www.github.com/gulpjs/fs-mkdirp-stream/issues/4)) ([3fc3dee](https://www.github.com/gulpjs/fs-mkdirp-stream/commit/3fc3dee4ef6108271f8837e9616652e9e8c6274c))


### Miscellaneous Chores

* Upgrade scaffold, dropping node <10 support ([bda1dee](https://www.github.com/gulpjs/fs-mkdirp-stream/commit/bda1dee735c61617a5f51ac4e3871969a675d1f5))
