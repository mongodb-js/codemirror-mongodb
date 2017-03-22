# codemirror-mongodb [![travis][travis_img]][travis_url] [![npm][npm_img]][npm_url]

> Use CodeMirror with MongoDB.

## Demo

https://mongodb-js.github.io/codemirror-mongodb

## TODO

### mongodb-hint is filtered by prefix


### mongodb-hint is schema aware

Using the schema, we can limit which query operator hints are shown based on the type(s) of the underlying field the expression is being added to.

### Encode JS code as extended json string

For passing to `mongodb-language-model`

### Update js code string

So schema UI can be used to update the query

### query bar plugin cleanup

Doesn't have any tests. Is some of our oldest React code.

### Integrate the query bar plugin with codemirror

There is already an existing React component for CodeMirror, [react-codemirror](https://github.com/JedWatson/react-codemirror), which was validated in COMPASS-913.

The query bar plugin doesn't currently have any direct unit/enzyme tests and is some of our oldest React code. When estimating the work for this task, there will likely need to be additional time included for refactoring and tech debt burn-down.

The [codemirror-mongodb](https://github.com/mongodb-js/codemirror-mongodb) README has (will have) details on how to integrate with react-codemirror for autocomplete, "single-line mode", and other mongodb specific features we want to leverage in Compass.

To make

```javascript
var options = {
  lineNumbers: false, // don't show line numbers in the gutter
  scrollbarStyle: 'null', // completely hide scollbars
};
```

### Syntax highlighting in the query bar matches existing look and feel

documentation for styling codemirror:
https://codemirror.net/doc/manual.html#styling

Codemirror supports themes so we can use [this online editor](http://tmtheme-editor.herokuapp.com/) exported via [this node.js cli](https://github.com/FarhadG/codeMirror-aceEditor-theme-generator) so codemirror in Compass matches the style of the document list view.

Alternatively, just update [`codemirror-mongodb/theme.css`](https://github.com/mongodb-js/codemirror-mongodb/blob/master/theme.css) to match the styles used already in the document list plugin. The [`codemirror-mongodb` demo](https://mongodb-js.github.io/codemirror-mongodb) is already configured to use the `mongodb` theme.

#### `mongodb` Mode

There is an existing [MongoDB grammar for Atom](https://atom.io/packages/language-mongodb) which can be converted into a mode for CodeMirror using [codemirror-atom-modes](https://www.npmjs.com/package/codemirror-atom-modes).

Long-term this might be good. Short-term, a lot of features we want are currently dependent on the `javascript` mode so we would need to rewire a few things.

## License

Apache 2.0

[travis_img]: https://img.shields.io/travis/mongodb-js/codemirror-mongodb.svg
[travis_url]: https://travis-ci.org/mongodb-js/codemirror-mongodb
[npm_img]: https://img.shields.io/npm/v/codemirror-mongodb.svg
[npm_url]: https://npmjs.org/package/codemirror-mongodb
