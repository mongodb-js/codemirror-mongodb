const CodeMirror = require('codemirror');
const createPosition = CodeMirror.Pos;

const fuzzaldrin = require('fuzzaldrin-plus');

require('./show-hint.js');

const debug = require('debug')('codemirror-mongodb:mongodb-hint');

const OPERATORS = [
  '$gte',
  '$gt',
  '$lte',
  '$lt',
  '$eq',
  '$ne',
  '$type',
  '$size',
  '$exists',
  '$in',
  '$nin',
  '$all'
];

function splice(base, index, s) {
  return base.substring(0, index) + s + base.substring(index, base.length);
}

class MongoDBHintProvider {
  constructor(fields = { _id: 'ObjectId' }) {
    this.fields = fields;

    Object.keys(this.fields).forEach(k => {
      if (typeof k === 'object') return;
      if (typeof k === 'string') {
        const fieldType = this.fields[k];

        this.fields[k] = {
          name: k,
          path: k,
          type: fieldType
        };
      }
    });
  }

  execute(cm) {
    const cursor = cm.getCursor();
    const tokens = cm.getLineTokens(cursor.line);
    const token = cm.getTokenAt(cursor);
    const currentTokenIndex = -1;
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].end === token.end && tokens[i].start === token.start) {
        currentTokenIndex = i;
      }
    }

    window.cm = cm;
    window.cursor = cursor;

    if (token.end > cursor.ch) {
      token.end = cursor.ch;
      token.string = token.string.slice(0, cursor.ch - token.start);
    }

    const inputWhenTriggered = `${splice(cm.getValue(), cursor.ch, '█')}`;

    let completions = [];
    window.token = token;

    /**
     * Case: List Field Names or Operators With Prefix
     */
    if (token.type === 'variable') {
      debug(
        '%s -> show only field names that fuzzy match `%s`',
        inputWhenTriggered,
        token.string
      );

      const allCompletions = [];

      allCompletions.push.apply(allCompletions, OPERATORS);
      allCompletions.push.apply(allCompletions, Object.keys(this.fields));

      completions = fuzzaldrin
        .filter(allCompletions, token.string, {})
        .map(function(k) {
          var text = k;
          if (text.indexOf('.') > -1) {
            text = `'${text}'`;
          }

          var suggestion = {
            text: text,
            displayText: fuzzaldrin.wrap(k, token.string)
          };
          debug('suggestion', suggestion);
          return suggestion;
        });

      /**
       * TODO (imlucas) Automatically start the next clause?
       * if (completions.length === 1) ->
       *  completions.push(completions[0] + ': ')
       */
    } else if (token.state.cc.length === 2) {
      /**
       * Case: Blank Slate
       */
      debug('%s -> show field names only', inputWhenTriggered);
      completions.push.apply(completions, Object.keys(this.fields));
    } else if (token.state.cc.length === 5) {
      debug('%s -> show field names only', inputWhenTriggered);
      completions.push.apply(completions, Object.keys(this.fields));
    } else if (token.state.cc.length === 4) {
      debug('%s -> show list of operators', inputWhenTriggered);
      completions.push.apply(completions, OPERATORS);
    } else {
      /**
       * TODO (imlucas) Scan left 1 token to get the current field name
       * which we can then use to look up the expected field type.
       */
      /**
       * TODO (imlucas)
       * if inputWhenTriggered = `{_id: █}` and
       * the schema type of _id is an ObjectId ->
       *  completions.push('ObjectId("█")')
       *
       * Or if a boolean, suggest - `false` - `true`
       */
      debug('%s -> expect user to input a value', inputWhenTriggered);
    }

    if (completions.length > 0) {
      debug('completions', completions);
    }

    /**
     * TODO (imlucas) For completions with `.`s, text replacement should be wrapped in single quotes.
     */
    return {
      list: completions,
      from: createPosition(cursor.line, token.start),
      to: createPosition(cursor.line, token.end)
    };
  }
}

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

module.exports = MongoDBHintProvider;

function showMongoDBHintsForEditor(editor) {
  const opts = editor.getOption('mongodb');
  const hinter = new MongoDBHintProvider(opts.fields);
  return hinter.execute(editor);
}

CodeMirror.commands.autocomplete = function(cm) {
  CodeMirror.showHint(cm, showMongoDBHintsForEditor);
};

CodeMirror.defineOption('mongodb', { fields: { _id: 'ObjectId' } });
