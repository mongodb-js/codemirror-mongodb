const CodeMirror = require('codemirror');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/edit/matchbrackets.js');
require('./show-hint.js');

const MongoDBHintProvider = require('../../');
const debug = require('debug')('codemirror-mongodb:addon:hint:mongodb-hint');
const _ = require('lodash');

module.exports = function(editor) {
  const opts = editor.getOption('mongodb');
  const hinter = new MongoDBHintProvider(opts);
  const res = hinter.execute(editor);
  debug('Hint Provider Results (%d)', res.list.length);
  debug('  _case', res._case);
  debug('  from', res.from);
  debug('  to', res.to);
  debug('  list');
  res.list.map((h, i) => debug('    %d. %s', i + 1, h.text));
  return res;
};

CodeMirror.commands.autocomplete = function(cm) {
  let code = cm.getValue();
  const cursor = cm.getCursor();
  const hasOpenBracket = _.startsWith(code, '{');
  const hasCloseBracket = _.endsWith(code, '}');

  if (!hasOpenBracket) {
    code = '{' + code;
  }
  if (!hasCloseBracket) {
    code += '}';
  }

  if (!hasOpenBracket || !hasCloseBracket) {
    cm.setValue(code);
    /**
     * So you end up with `{█}` instead of `█{}`
     */
    if (!hasOpenBracket && cursor.ch === 0) {
      cursor.ch = 1;
      cm.setCursor(cursor);
    }
  } else if (code === '{}' && cursor.ch === 2) {
    /**
     * So you end up with `{█}` instead of `{}█`
     */
    cursor.ch = 1;
    cm.setCursor(cursor);
  }

  process.nextTick(function() {
    CodeMirror.showHint(cm, module.exports);
  });
};

CodeMirror.defineOption('mongodb', { fields: { _id: 'ObjectId' }});

function formatAsSingleLine(cm, change) {
  if (change.update) {
    var newtext = change.text.join('').replace(/\n/g, '');
    change.update(change.from, change.to, [newtext]);
  }
  return true;
}

CodeMirror.defineOption('oneliner', true, function(cm, val) {
  if (val === true) {
    cm.display.wrapper.classList.add('cm-s-oneliner');
    cm.on('beforeChange', formatAsSingleLine);
  } else {
    cm.display.wrapper.classList.remove('cm-s-oneliner');
    cm.off('beforeChange', formatAsSingleLine);
  }
});
