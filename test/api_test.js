'use strict';

var glob = require('../lib/api');

exports['api*'] = {
  setUp: function(done) {
    this.cwd = process.cwd();
    process.chdir('test/fixtures');
    done();
  },
  tearDown: function(done) {
    process.chdir(this.cwd);
    done();
  },
  'basic matching': function(test) {
    test.expect(8);
    test.deepEqual(glob('**/*.js'), ['js/bar.js', 'js/foo.js'], 'should match.');
    test.deepEqual(glob('**/*.js', '**/*.css'), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'should match.');
    test.deepEqual(glob(['**/*.js', '**/*.css']), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'should match.');
    test.deepEqual(glob('**d*/**'), [
      'deep',
      'deep/deep.txt',
      'deep/deeper',
      'deep/deeper/deeper.txt',
      'deep/deeper/deepest',
      'deep/deeper/deepest/deepest.txt'], 'should match files and directories.');
    test.deepEqual(glob({ mark: true }, '**d*/**'), [
      'deep/',
      'deep/deep.txt',
      'deep/deeper/',
      'deep/deeper/deeper.txt',
      'deep/deeper/deepest/',
      'deep/deeper/deepest/deepest.txt'], 'the minimatch "mark" option ensures directories end in /.');
    test.deepEqual(glob('**d*/**/'), [
      'deep/',
      'deep/deeper/',
      'deep/deeper/deepest/'], 'should match directories, arbitrary / at the end appears in matches.');
    test.deepEqual(glob({ mark: true }, '**d*/**/'), [
      'deep/',
      'deep/deeper/',
      'deep/deeper/deepest/'], 'should match directories, arbitrary / at the end appears in matches.');
    test.deepEqual(glob('*.xyz'), [], 'should fail to match.');
    test.done();
  },
  'filter': function(test) {
    test.expect(5);
    test.deepEqual(glob({ filter: 'isFile' }, '**d*/**'), [
      'deep/deep.txt',
      'deep/deeper/deeper.txt',
      'deep/deeper/deepest/deepest.txt'
    ], 'should match files only.');
    test.deepEqual(glob({ filter: 'isDirectory' }, '**d*/**'), [
      'deep',
      'deep/deeper',
      'deep/deeper/deepest'
    ], 'should match directories only.');
    test.deepEqual(glob({ filter: function(filepath) { return (/deepest/).test(filepath); } }, '**'), [
      'deep/deeper/deepest',
      'deep/deeper/deepest/deepest.txt',
    ], 'should filter arbitrarily.');
    test.deepEqual(glob({ filter: 'isFile' }, 'js', 'css'), [], 'should fail to match.');
    test.deepEqual(glob({ filter: 'isDirectory' }, '**/*.js'), [], 'should fail to match.');
    test.done();
  },
  'unique': function(test) {
    test.expect(4);
    test.deepEqual(glob('**/*.js', 'js/*.js'), ['js/bar.js', 'js/foo.js'], 'file list should be uniqed.');
    test.deepEqual(glob('**/*.js', '**/*.css', 'js/*.js'), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'file list should be uniqed.');
    test.deepEqual(glob('js', 'js/'), ['js', 'js/'], 'mixed non-ending-/ and ending-/ dirs will not be uniqed by default.');
    test.deepEqual(glob({ mark: true }, 'js', 'js/'), ['js/'], 'mixed non-ending-/ and ending-/ dirs will be uniqed when "mark" is specified.');
    test.done();
  },
  'file order': function(test) {
    test.expect(4);
    var actual = glob('**/*.{js,css}');
    var expected = ['css/baz.css', 'css/qux.css', 'js/bar.js', 'js/foo.js'];
    test.deepEqual(actual, expected, 'should select 4 files in this order, by default.');

    actual = glob('js/foo.js', 'js/bar.js', '**/*.{js,css}');
    expected = ['js/foo.js', 'js/bar.js', 'css/baz.css', 'css/qux.css'];
    test.deepEqual(actual, expected, 'specifically-specified-up-front file order should be maintained.');

    actual = glob('js/bar.js', 'js/foo.js', '**/*.{js,css}');
    expected = ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'];
    test.deepEqual(actual, expected, 'specifically-specified-up-front file order should be maintained.');

    actual = glob('js/foo.js', '**/*.{js,css}', '!js/bar.js', 'js/bar.js');
    expected = ['js/foo.js', 'css/baz.css', 'css/qux.css', 'js/bar.js'];
    test.deepEqual(actual, expected, 'if a file is excluded and then re-added, it should be added at the end.');
    test.done();
  },
  'flatten': function(test) {
    test.expect(1);
    test.deepEqual(glob([['**/*.js'], ['**/*.css', 'js/*.js']]), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'should match.');
    test.done();
  },
  'exclusion': function(test) {
    test.expect(8);
    test.deepEqual(glob(['!js/*.js']), [], 'solitary exclusion should match nothing');
    test.deepEqual(glob(['js/bar.js', '!js/bar.js']), [], 'exclusion should cancel match');
    test.deepEqual(glob(['**/*.js', '!js/foo.js']), ['js/bar.js'], 'should omit single file from matched set');
    test.deepEqual(glob(['!js/foo.js', '**/*.js']), ['js/bar.js', 'js/foo.js'], 'inclusion / exclusion order matters');
    test.deepEqual(glob(['**/*.js', '**/*.css', '!js/bar.js', '!css/baz.css']), ['js/foo.js', 'css/qux.css'], 'multiple exclusions should be removed from the set');
    test.deepEqual(glob(['**/*.js', '**/*.css', '!**/*.css']), ['js/bar.js', 'js/foo.js'], 'excluded wildcards should be removed from the matched set');
    test.deepEqual(glob(['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css', '!**/b*.*']), ['js/foo.js', 'css/qux.css'], 'different pattern for exclusion should still work');
    test.deepEqual(glob(['js/bar.js', '!**/b*.*', 'js/foo.js', 'css/baz.css', 'css/qux.css']), ['js/foo.js', 'css/baz.css', 'css/qux.css'], 'inclusion / exclusion order matters');
    test.done();
  },
  'options.matchBase': function(test) {
    test.expect(4);
    var opts = { matchBase: true };
    test.deepEqual(glob('*.js'), [], 'should not matchBase (minimatch) by default.');
    test.deepEqual(glob(opts, '*.js'), ['js/bar.js', 'js/foo.js'], 'options should be passed through to minimatch.');
    test.deepEqual(glob(opts, '*.js', '*.css'), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'should match.');
    test.deepEqual(glob(opts, ['*.js', '*.css']), ['js/bar.js', 'js/foo.js', 'css/baz.css', 'css/qux.css'], 'should match.');
    test.done();
  },
  'options.cwd': function(test) {
    test.expect(4);
    var cwd = process.cwd();
    test.deepEqual(glob({ cwd: cwd }, ['js', 'js/*']), ['js', 'js/bar.js', 'js/foo.js'], 'should match.');
    test.deepEqual(glob({ cwd: cwd, filter: 'isFile' }, ['js', 'js/*']), ['js/bar.js', 'js/foo.js'], 'should match.');
    test.deepEqual(glob({ cwd: cwd, filter: 'isDirectory' }, ['js', 'js/*']), ['js'], 'should match.');
    test.deepEqual(glob({ cwd: cwd, filter: 'isFile' }, ['js', 'js/*', '!**/b*.js']), ['js/foo.js'], 'should negate properly.');
    test.done();
  },
  'options.nonull': function(test) {
    test.expect(2);
    var opts = { nonull: true };
    test.deepEqual(glob(opts, ['js/a*', 'js/b*', 'js/c*']), ['js/a*', 'js/bar.js', 'js/c*'], 'non-matching patterns should be returned in result set.');
    test.deepEqual(glob(opts, ['js/foo.js', 'js/bar.js', 'js/baz.js']), ['js/foo.js', 'js/bar.js', 'js/baz.js'], 'non-matching filenames should be returned in result set.');
    test.done();
  },
};
