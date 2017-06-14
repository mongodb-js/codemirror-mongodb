var debug = require('debug')('codemirror-mongodb:test:cm');
var runMode = require('codemirror/addon/runmode/runmode.node.js');
require('codemirror/mode/javascript/javascript.js');

function Pos(line, ch, sticky = null) {
  if (!(this instanceof Pos)) return new Pos(line, ch, sticky);
  this.line = line;
  this.ch = ch;
  this.sticky = sticky;
}

function parse(input) {
  var tokens = [];
  function callback(string, type, line, start, state) {
    tokens.push({
      string: string,
      end: start + string.length,
      type: type || null,
      line: line,
      start: start,
      state: state
    });
  }
  runMode.runMode(input, 'javascript', callback, {});
  return tokens;
}
var _ = require('lodash');

module.exports = function(input) {
  var cursor = new Pos(0, input.indexOf('█'), 'after');

  function MockCodeMirror() {
    this._cursor = cursor;
    this._value = '';
    this._options = {};
  }
  MockCodeMirror.prototype.getCursor = function() {
    return cursor;
  };
  MockCodeMirror.prototype.getTokenAt = function(pos) {
    debug('_tokens:');
    this._tokens.forEach(function(t, i) {
      debug('  %d', i, _.omit(t, 'state'));
    });

    var token;

    for (var i = 0; i < this._tokens.length; i++) {
      if (this._tokens[i].end === pos.ch) {
        token = this._tokens[i];
      }
    }
    debug('getTokenAt', pos, token);
    return token;
  };
  MockCodeMirror.prototype.getValue = function() {
    return this._value;
  };
  MockCodeMirror.prototype.setValue = function(_val) {
    this._value = _val;
    this._tokens = parse(_val);
    return _val;
  };
  MockCodeMirror.prototype.getLineTokens = function(lineNumber) {
    return this._tokens.filter(t => t.line === lineNumber);
  };
  MockCodeMirror.prototype.defineOption = function(name, defaultVal) {
    this._options[name] = defaultVal;
  };
  MockCodeMirror.prototype.getOption = function(name) {
    return this._options[name];
  };
  MockCodeMirror.prototype.setOption = function(name, val) {
    return (this._options[name] = val);
  };
  var cm = new MockCodeMirror();
  cm.setValue(input.replace('█', ''));
  return cm;
};

module.exports.describe = function(input, fn) {
  return describe(input, function() {
    debug('describe `%s`', input);
    this.ctx.cm = module.exports(input);
    fn.apply(this);
  });
};
