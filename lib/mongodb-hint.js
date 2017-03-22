var CodeMirror = require('codemirror');
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
  // this.collectionNames = opts.collectionNamesProvider;
  // this.schema = opts.schema;
  // this.collectionNames = [
  //   'slack',
  //   'team'
  // ];

  this.fields = [
    '_id',
    'slack'
  ];
}

MongoDBHintProvider.prototype.execute = function(cm) {
  var cur = cm.getCursor();
  var from = {
    line: cur.line,
    ch: cur.ch
  };
  var to = {
    line: cur.line,
    ch: cur.ch
  };

  var keywords = [];

  keywords.push.apply(keywords, this.fields.map(function(field) {
    return {
      text: field,
      className: 'CodeMirror-hint-mongodb--field'
    };
  }));

  keywords.push.apply(keywords, OPERATORS.map(function(operator) {
    return {
      text: operator,
      displayText: operator,
      className: 'CodeMirror-hint-mongodb--operator'
    };
  }));

  var data = {
    list: keywords,
    from: from,
    to: to
  };

  debug('providing', data);

  if (CodeMirror.attachContextInfo) {
    CodeMirror.attachContextInfo(data);
  }
  return data;
};

// CodeMirror.registerHelper('hint', 'mongodb', function(editor, options) {
//
// });

var hinter = new MongoDBHintProvider({});

/**
 * Override autocomplete command to point at our provider.
 */
CodeMirror.commands.autocomplete = function(cm) {
  CodeMirror.showHint(cm, function(editor, options) {
    debug('autocomplete called', editor, options);
    return hinter.execute(editor);
  });
};
