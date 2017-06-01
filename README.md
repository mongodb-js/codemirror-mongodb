# :construction: codemirror-mongodb [![travis][travis_img]][travis_url] [![npm][npm_img]][npm_url]

> Use CodeMirror with MongoDB.

## Demo

https://mongodb-js.github.io/codemirror-mongodb

## Background

I recently took on the project of rewriting the query input for [MongoDB Compass][compass_url]. It’s a real pain when writing queries to have to keep the query language *and* the shape of the data you’re querying against in your working memory. MongoDB users have more important work to do.

Autocompletion for field names is a feature request we hear a lot at MongoDB. We have a sketch in Compass of what the schema probably looks like. Leveraging schema analysis to enable autocompletion is a feature we’ve been wanting to build for a long time.

After weighing my options and researching the existing libraries I could potentially use, I kept coming back to one, CodeMirror.

[CodeMirror][CodeMirror] is the defacto open-source code editor. CodeMirror is used in the devtools for Firefox, Chrome, and Safari, in Light Table, Adobe Brackets, Bitbucket, and [over 100 other projects][CodeMirror realworld].

## Usage

```javascript
var CodeMirror = require('codemirror');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror-mongodb/addon/hint/mongodb-hint');

CodeMirror.fromTextArea(document.getElementById('oneliner'), {
  lineNumbers: false,
  scrollbarStyle: 'null',
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
}).on('beforeChange', function formatAsSingleLine(cm, change) {
  if (change.update) {
    var newtext = change.text.join('').replace(/\n/g, '');
    change.update(change.from, change.to, [newtext]);
  }
  return true;
});
```

### React

```javascript
var React = require('react');
var CodeMirror = require('react-codemirror');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror-mongodb/addon/hint/mongodb-hint');

var App = React.createClass({
  getInitialState: function() {
    return {
      code: "{}",
    };
  },
  updateCode: function(newCode) {
    this.setState({
      code: newCode.join('').replace(/\n/g, ''),
    });
  },
  render: function() {
    var options = {
      lineNumbers: false,
      scrollbarStyle: 'null',
      mode: 'javascript',
      autoCloseBrackets: true,
      matchBrackets: true,
      theme: 'mongodb',
      extraKeys: {
        'Ctrl-Space': 'autocomplete'
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
    };
    return <CodeMirror value={this.state.code} onChange={this.updateCode} options={options} />
  }
});

React.render(<App />, document.getElementById('app'));
```


## Autocompletion Behavior

`█` below is the user cursor position when autocomplete triggered
or the resulting cursor position when a completion is applied.

Current schema of the selected namespace is:

```javascript
var fields = {
  _id: 'ObjectId',
  name: 'String',
  age: 'Number',
  number_of_pets: 'Number'
};
```

- **`${fieldPath}`** A completion for v1
- *`${fieldPath}: █`* Maybe nice to add in the future

### Blank Slate

*Input* `{█}`

*Completions*

- **`_id`**
- **`name`**
- **`age`**
- **`number_of_pets`**

#### Extended field based on field type

*Input* `{_id█}`

*Completions*

- **`_id`**
- *`_id: ObjectId("█")`*

### List Field Names With Prefix

*Input* `{n█}`

2 matching fields

*Completions*

- **`name`**
- **`number_of_pets`**


#### Single Field Matched By Name Prefix

*Input* `{na█}`

1 matching field so show extended

*Completions*

- **`name`**
- *`name: █`* with starter
- *`name: "█"`* open exact match
- *`name: /^█/`* open prefix regex

#### Single Field Exact Match By Name

*Input* `{name█}`

Still 1 matching field so show extended

*Completions*

- **`name`**
- *`name: █`* with starter
- *`name: "█"`* open exact match
- *`name: /^█/`* open prefix regex

### Specify Expression for Field

*Input* `{name: █}`

*Completions*

- *`█`* with starter
- *`"█"`* open exact match
- *`/^█/`* open prefix regex

### List Expression Operators for Field

*Input* `{name: {█}}`

*Completions*

- **`$gte`**
- **`$gt`**
- **`$lte`**
- **`$lt`**
- **`$eq`**
- **`$ne`**
- **`$type`**
- **`$size`**
- **`$exists`**
- *`$exists: false`* field not set
- *`$exists: true`* field is set
- **`$in`**
- *`$in: ["█"]`* for strings, *`$in: [█]`* for numbers
- **`$nin`**
- *`$nin: ["█"]`* for strings, *`n$in: [█]`* for numbers
- **`$all`**

## Todo

- completions are `{text, displayText, and className}` instead of just strings
- completions are not just prefixes to current cursor when applied, e.g. `Object("█")`
- mode can accept shell js instead of just query
- Toggle into multi-line mode for really long queries
- Pretty formatting when in multi-line mode https://codemirror.net/2/demo/formatting.html
- Extend js linting (see http://codemirror.net/demo/lint.html) to show warning if
  - current query not accepted by mongodb-language-model
  - may miss indexes/have poor performance
  - misspelled field names
  - type mismatch between expression and field type
- Repl mode
    - https://github.com/sdllc/cmjs-shell
    - https://github.com/azu/codemirror-console-ui
    - https://github.com/PETComputacaoUFPR/skulpt-console

## License

Apache 2.0

[travis_img]: https://img.shields.io/travis/mongodb-js/codemirror-mongodb.svg
[travis_url]: https://travis-ci.org/mongodb-js/codemirror-mongodb
[npm_img]: https://img.shields.io/npm/v/codemirror-mongodb.svg
[npm_url]: https://npmjs.org/package/codemirror-mongodb
[compass_url]: https://mongodb.com/compass
[CodeMirror]: http://codemirror.net/
[CodeMirror realworld]: http://codemirror.net/doc/realworld.html
[mongodb-schema]: https://github.com/mongodb-js/mongodb-schema
