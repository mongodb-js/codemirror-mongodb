var CodeMirror = require('codemirror');
var _ = require('lodash');
var debug = require('debug')('codemirror-mongodb:demo');

window.CodeMirror = CodeMirror;
require('./addon/hint/mongodb-hint');

function formatAsSingleLine(cm, change) {
  if (change.update) {
    var newtext = change.text.join('').replace(/\n/g, '');
    change.update(change.from, change.to, [newtext]);
  }
  return true;
}

function makeOneliner(cm) {
  cm.display.wrapper.classList.add('cm-s-oneliner');
  cm.on('beforeChange', formatAsSingleLine);
}

const prettier = require('prettier');

function formatJavascript(str) {
  var res = prettier.format(`var QUERY = ${str}`, {
    printWidth: 80,
    tabWidth: 2,
    singleQuote: true,
    trailingComma: 'none',
    bracketSpacing: false
  });
  res = res.replace('var QUERY = ', '');
  res = res.replace(/;$/m, '');
  return res;
}

const languageModel = require('mongodb-language-model');
const EJSON = require('mongodb-extended-json');
const parse = require('mongodb-query-parser');
const parseSchema = require('mongodb-schema');

var queryDisplay = CodeMirror.fromTextArea(document.getElementById('query'), {
  mode: 'javascript',
  autoCloseBrackets: true,
  matchBrackets: true,
  theme: 'mongodb'
});

var fieldsDisplay = CodeMirror.fromTextArea(document.getElementById('fields'), {
  mode: 'javascript',
  autoCloseBrackets: true,
  matchBrackets: true,
  theme: 'mongodb'
});

/**
 * TODO (imlucas) Move schema field list code into mongodb-schema and dedupe FiewldStore.js.
 */
function _mergeFields(existingField, newField) {
  return _.merge(existingField, newField, function(
    objectValue,
    sourceValue,
    key
  ) {
    if (key === 'count') {
      // counts add up
      return _.isNumber(objectValue) ? objectValue + sourceValue : sourceValue;
    }
    if (key === 'type') {
      // arrays concatenate and de-dupe
      if (_.isString(objectValue)) {
        return _.uniq([objectValue, sourceValue]);
      }
      return _.isArray(objectValue)
        ? _.uniq(objectValue.concat(sourceValue))
        : sourceValue;
    }
    // all other keys are handled as per default
    return undefined;
  });
}
const FIELDS = ['name', 'path', 'count', 'type'];
function _generateFields(fields, nestedFields, rootField) {
  if (!nestedFields) {
    return;
  }

  if (rootField) {
    if (!fields[rootField.path].hasOwnProperty('nestedFields')) {
      fields[rootField.path].nestedFields = [];
    }
    nestedFields.map(f => {
      fields[rootField.path].nestedFields.push(f.path);
    });
  }

  for (const field of nestedFields) {
    const existingField = _.get(fields, field.path, {});
    const newField = _.pick(field, FIELDS);
    fields[field.path] = _mergeFields(existingField, newField);

    // recursively search sub documents
    for (const type of field.types) {
      if (type.name === 'Document') {
        // add nested sub-fields
        _generateFields(fields, type.fields, field);
      }
      if (type.name === 'Array') {
        // add nested sub-fields of document type
        const docType = _.find(type.types, 'name', 'Document');
        if (docType) {
          _generateFields(fields, docType.fields, field);
        }
      }
    }
  }
}

CodeMirror.commands.parse = function(cm) {
  const input = cm.getValue();

  const query = parse(input);
  debug('parsed query is', query);

  const queryStr = EJSON.stringify(query);

  if (Array.isArray(query)) {
    debug('Looks like an array. parsing docs');
    parseSchema(query, { storeValues: false }, (err, schema) => {
      if (err) {
        return console.error('Schema parsing failed', err);
      }

      var fields = {};
      _generateFields(fields, schema.fields);
      cm.setOption('mongodb', { fields: fields });

      fieldsDisplay.setValue(formatJavascript(parse.stringify(fields)));
    });
    return;
  }

  queryDisplay.setValue(formatJavascript(parse.stringify(query)));

  debug('language model accepts?', languageModel.accepts(queryStr));
  debug('language model ast?', languageModel.parse(queryStr));
};

var queryInput = CodeMirror.fromTextArea(document.getElementById('oneliner'), {
  lineNumbers: false, // hide line numbers from gutter
  scrollbarStyle: 'null', // completely hide scollbars
  mode: 'javascript',
  autoCloseBrackets: true,
  matchBrackets: true,
  theme: 'mongodb',
  extraKeys: {
    'Ctrl-Space': 'autocomplete',
    'Shift-Enter': 'parse'
  },
  mongodb: {
    fields: {}
  }
});
makeOneliner(queryInput);
queryInput.execCommand('parse');

var docsInput = CodeMirror.fromTextArea(document.getElementById('documents'), {
  mode: 'javascript',
  autoCloseBrackets: true,
  matchBrackets: true,
  theme: 'mongodb',
  extraKeys: {
    'Ctrl-Space': 'autocomplete',
    'Shift-Enter': 'parse'
  },
  mongodb: {
    fields: {}
  }
});

docsInput.on('optionChange', function(cm, optionName) {
  if (optionName !== 'mongodb') return;
  debug(
    'copying mongodb fields from parsed `documents` editor to `query` editor.'
  );
  queryInput.setOption('mongodb', docsInput.getOption('mongodb'));
});

docsInput.execCommand('parse');
