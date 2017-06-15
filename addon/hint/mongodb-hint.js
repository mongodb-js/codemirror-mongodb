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
  const hinter = new MongoDBHintProvider(opts.fields);
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
  }
  process.nextTick(function() {
    CodeMirror.showHint(cm, module.exports);
  });
};

CodeMirror.defineOption('mongodb', { fields: { _id: 'ObjectId' } });

// MongoDBHintProvider.prototype.gatherFields = function(prefix) {
//   var keys = Object.keys(this.fields);
//   var PREFIX_REGEX;
//   if (prefix) {
//     PREFIX_REGEX = new RegExp('^' + prefix);
//     keys = keys.filter(function(k) {
//       return PREFIX_REGEX.test(k);
//     });
//   }
//
//   keys.map(k => {
//     // Use the type of field to provide a 1 click gesture that enters
//     // 1. the field name
//     // 2. opens a new predicate
//     // 3. the surround predicate value based on the field type
//     var text;
//     var t = this.fields[k];
//
//     if (prefix) {
//       text = k.replace(PREFIX_REGEX, '');
//     } else {
//       text = k + ': ';
//     }
//
//     if (t === 'ObjectId') {
//       text += 'ObjectId("'; // ")
//     } else if (t === 'string') {
//       text += '"'; // "
//     } // etc etc
//
//     return {
//       text: text,
//       displayText: k + '(' + t + ')',
//       className: 'CodeMirror-hint-mongodb--field'
//     };
//   });
// };
