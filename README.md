# :construction: codemirror-mongodb [![travis][travis_img]][travis_url] [![npm][npm_img]][npm_url]

> Use CodeMirror with MongoDB.

## Demo

https://mongodb-js.github.io/codemirror-mongodb


## Autocompletion Behavior

`|` below is the user cursor position when autocomplete triggered
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
- *`${fieldPath}: |`* Maybe nice to add in the future

### Blank Slate

*Input* `{|}`

*Completions*

- **`_id`**
- **`name`**
- **`age`**
- **`number_of_pets`**

#### Extended field based on field type

*Input* `{_id|}`

*Completions*

- **`_id`**
- *`_id: ObjectId("|")`*

### List Field Names With Prefix

*Input* `{n|}`

2 matching fields

*Completions*

- **`name`**
- **`number_of_pets`**


#### Single Field Matched By Name Prefix

*Input* `{na|}`

1 matching field so show extended

*Completions*

- **`name`**
- *`name: |`* with starter
- *`name: "|"`* open exact match
- *`name: /^|/`* open prefix regex

#### Single Field Exact Match By Name

*Input* `{name|}`

Still 1 matching field so show extended

*Completions*

- **`name`**
- *`name: |`* with starter
- *`name: "|"`* open exact match
- *`name: /^|/`* open prefix regex

### Specify Expression for Field

*Input* `{name: |}`

*Completions*

- *`|`* with starter
- *`"|"`* open exact match
- *`/^|/`* open prefix regex

### List Expression Operators for Field

*Input* `{name: {|}}`

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
- *`$in: ["|"]`* for strings, *`$in: [|]`* for numbers
- **`$nin`**
- *`$nin: ["|"]`* for strings, *`n$in: [|]`* for numbers
- **`$all`**

## Todo

- completions are `{text, displayText, and className}` instead of just strings
- completions are not just prefixes to current cursor when applied, e.g. `Object("|")`
- mode can accept shell js instead of just query
- Toggle into multi-line mode for really long queries
- Pretty formatting when in multi-line mode https://codemirror.net/2/demo/formatting.html
- Extend js linting to show warning if
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
