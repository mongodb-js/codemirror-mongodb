var CodeMirror = require('codemirror');
var createPosition = CodeMirror.Pos;

var debug = require('debug')('codemirror-mongodb:mongodb-hint');

var OPERATORS = [
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

function MongoDBHintProvider(opts) {
  this.dbs = opts.dbs || {};
  this.fields = opts.fields || { _id: 'ObjectId' };
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

function splice(base, index, s) {
  return base.substring(0, index) + s + base.substring(index, base.length);
}

MongoDBHintProvider.prototype.execute = function(cm) {
  var cursor = cm.getCursor();
  var token = cm.getTokenAt(cursor);

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

  var inputWhenTriggered = `${splice(cm.getValue(), cursor.ch, '|')}`;
  var completions = [];
  /**
   * Case: List Field Names or Operators With Prefix
   */
  if (token.type === 'variable') {
    console.log(
      '%s -> show only field names starting with `%s`',
      inputWhenTriggered,
      token.string
    );

    if (token.string.charAt(0) === '$') {
      var PREFIX = new RegExp('^\\' + token.string);
      completions.push.apply(
        completions,
        OPERATORS.filter(function(o) {
          return PREFIX.test(o);
        })
      );
    } else {
      var PREFIX_RE = new RegExp('^' + token.string);
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
    console.log('%s -> show field names only', inputWhenTriggered);
    completions.push.apply(completions, Object.keys(this.fields));
  } else if (token.state.cc.length === 5) {
    console.log('%s -> show field names only', inputWhenTriggered);
    completions.push.apply(completions, Object.keys(this.fields));
  } else if (token.state.cc.length === 4) {
    console.log('%s -> show list of operators', inputWhenTriggered);
    completions.push.apply(completions, OPERATORS);
  } else {
    /**
     * TODO (imlucas)
     * if inputWhenTriggered = `{_id: |}` and
     * the schema type of _id is an ObjectId ->
     *  completions.push('ObjectId("|")')
     */
    console.log('%s -> expect user to input a value', inputWhenTriggered);
  }

  var data = {
    list: completions,
    from: createPosition(cursor.line, token.start),
    to: createPosition(cursor.line, token.end)
  };

  console.log('providing', data);
  return data;
};

module.exports = MongoDBHintProvider;

// Override autocomplete command to point at our provider.
CodeMirror.commands.autocomplete = function(cm) {
  CodeMirror.showHint(cm, function(editor) {
    var opts = editor.options.hintOptions.mongodb;
    var hinter = new MongoDBHintProvider(opts);
    return hinter.execute(editor);
  });
};

CodeMirror.commands.parse = function(cm) {
  debugger;
};
