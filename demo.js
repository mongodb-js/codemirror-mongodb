var CodeMirror = require('codemirror');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/edit/matchbrackets.js');
require('./addon/hint/mongodb-hint');

function formatAsSingleLine(cm, change) {
  if (change.update) {
    var newtext = change.text.join('').replace(/\n/g, '');
    change.update(change.from, change.to, [newtext]);
  }
  return true;
}

CodeMirror.fromTextArea(document.getElementById('oneliner'), {
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
  hintOptions: {
    mongodb: {
      fields: {
        _id: 'ObjectId',
        name: 'String',
        age: 'Number',
        number_of_pets: 'Number',
        addresses: 'Array',
        'addresses.street': 'String'
      }
    }
  }
}).on('beforeChange', formatAsSingleLine);

CodeMirror.fromTextArea(document.getElementById('documents'), {
  mode: 'javascript',
  autoCloseBrackets: true,
  matchBrackets: true,
  theme: 'mongodb',
  extraKeys: {
    'Ctrl-Space': 'autocomplete'
  },
  hintOptions: {
    mongodb: {
      fields: {}
    }
  }
});
