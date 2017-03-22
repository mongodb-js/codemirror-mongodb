# codemirror-mongodb [![travis][travis_img]][travis_url] [![npm][npm_img]][npm_url]

[![Greenkeeper badge](https://badges.greenkeeper.io/mongodb-js/codemirror-mongodb.svg)](https://greenkeeper.io/)

> Use CodeMirror with MongoDB.

## Demo

https://mongodb-js.github.io/codemirror-mongodb

## TODO

### mongodb-hint is filtered


### mongodb-hint is schema aware

Using the schema, we can limit which query operator hints are shown based on the type(s) of the underlying field the expression is being added to.

### Encode JS code as extended json string

For passing to `mongodb-language-model`

### Update js code string

So schema UI can be used to update the query

### query bar plugin cleanup

Doesn't have any tests. Is some of our oldest React code.

### query bar plugin integrated with CodeMirror

There is already an existing React component for codemirror: [react-codemirror|https://github.com/JedWatson/react-codemirror].

### Make `oneline` simple

```javascript
var options = {
  lineNumbers: false, // don't show line numbers in the gutter
  scrollbarStyle: 'null', // completely hide scollbars
};
```

### Syntax highlighting in the query bar matches existing

https://codemirror.net/doc/manual.html#styling

#### `mongodb` Theme

Codemirror supports themes so we can use [this online editor](http://tmtheme-editor.herokuapp.com/) exported via [this node.js cli](https://github.com/FarhadG/codeMirror-aceEditor-theme-generator) so codemirror in Compass matches the style of the document list view.

#### `mongodb` Mode

There is an existing [MongoDB grammar for Atom|https://atom.io/packages/language-mongodb] which can be converted into a mode for CodeMirror using [codemirror-atom-modes](https://www.npmjs.com/package/codemirror-atom-modes).

Long-term this might be good. Short-term, a lot of features we want are currently dependent on the `javascript` mode so we would need to rewire a few things.



## License

Apache 2.0

[travis_img]: https://img.shields.io/travis/mongodb-js/codemirror-mongodb.svg
[travis_url]: https://travis-ci.org/mongodb-js/codemirror-mongodb
[npm_img]: https://img.shields.io/npm/v/codemirror-mongodb.svg
[npm_url]: https://npmjs.org/package/codemirror-mongodb
