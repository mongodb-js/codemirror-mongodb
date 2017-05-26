const CodeMirror = require('codemirror');
const createPosition = CodeMirror.Pos;
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
    let token = cm.getTokenAt(cursor);

    if (!/^[\w$_]*$/.test(token.string)) {
      debug('not a word-style token, ignore the token.', token);
      token = {
        isWordStyle: false,
        start: cursor.ch,
        end: cursor.ch,
        string: '',
        state: token.state,
        type: token.string === '.' ? 'property' : null
      };
    } else if (token.end > cursor.ch) {
      token.end = cursor.ch;
      token.string = token.string.slice(0, cursor.ch - token.start);
    }

    const inputWhenTriggered = `${splice(cm.getValue(), cursor.ch, '|')}`;

    const completions = [];

    /**
     * Case: List Field Names or Operators With Prefix
     */
    if (token.type === 'variable') {
      debug(
        '%s -> show only field names starting with `%s`',
        inputWhenTriggered,
        token.string
      );

      if (token.string.charAt(0) === '$') {
        const PREFIX = new RegExp('^\\' + token.string);
        completions.push.apply(
          completions,
          OPERATORS.filter(function(o) {
            return PREFIX.test(o);
          })
        );
      } else {
        const PREFIX_RE = new RegExp('^' + token.string);
        completions.push.apply(
          completions,
          Object.keys(this.fields).filter(function(k) {
            return PREFIX_RE.test(k);
          })
        );
      }
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
       * TODO (imlucas)
       * if inputWhenTriggered = `{_id: |}` and
       * the schema type of _id is an ObjectId ->
       *  completions.push('ObjectId("|")')
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
  const opts = editor.options.hintOptions.mongodb;
  const hinter = new MongoDBHintProvider(opts.fields);
  return hinter.execute(editor);
}

CodeMirror.commands.autocomplete = function(cm) {
  CodeMirror.showHint(cm, showMongoDBHintsForEditor);
};

CodeMirror.commands.parse = function(cm) {};
