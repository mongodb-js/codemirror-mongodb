/* eslint complexity: 0 */
const _ = require('lodash');
const fuzzaldrin = require('fuzzaldrin-plus');

const debug = require('debug')('codemirror-mongodb');

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

function Pos(line, ch, sticky = null) {
  if (!(this instanceof Pos)) {
    return new Pos(line, ch, sticky);
  }
  this.line = line;
  this.ch = ch;
  this.sticky = sticky;
}

class MongoDBHintProvider {
  /* eslint no-unused-vars: 0 */
  constructor(fields = { _id: 'ObjectId' }, fuzzy = false) {
    this.fields = fields;
    this.fuzzy = false;

    Object.keys(this.fields).forEach(k => {
      if (typeof k === 'object') return;
      if (typeof k === 'string') {
        const fieldType = _.get(this.fields, k);

        this.fields[k] = {
          name: k,
          path: k,
          type: fieldType
        };
      }
    });
  }

  getCurrentDepth(cm, cursor) {
    return (
      cm.getLineTokens(cursor.line).filter(function(t) {
        return t.start < cursor.ch && t.string === '{';
      }).length - 1
    );
  }

  getTokenAtCursor(cm, cursor) {
    const token = cm.getTokenAt(cursor);

    if (token.end > cursor.ch) {
      token.end = cursor.ch;
      token.string = token.string.slice(0, cursor.ch - token.start);
    }
    token.pretty = `${splice(cm.getValue(), cursor.ch, '█')}`;
    return token;
  }

  escapeSuggestedFieldName(name) {
    return name.indexOf('.') > -1 ? `'${name}'` : name;
  }

  getAllFieldNames() {
    return Object.keys(this.fields);
  }

  /**
   * TODO (imlucas) Automatically start the next clause?
   * if (completions.length === 1) ->
   *  completions.push(completions[0] + ': ')
   */
  normalizeSuggestion(fieldNameOrOperator, token) {
    return {
      text: this.escapeSuggestedFieldName(fieldNameOrOperator),
      displayText: fuzzaldrin.wrap(fieldNameOrOperator, token.string)
    };
  }

  suggest(token = { string: '' }, kind = ['fields', 'operators', 'values']) {
    const symbols = [];

    if (_.includes(kind, 'fields')) {
      symbols.push.apply(symbols, this.getAllFieldNames());
    }

    if (_.includes(kind, 'operators')) {
      symbols.push.apply(symbols, OPERATORS);
    }

    // if (_.includes(kind, 'values')) {
    //   symbols.push.apply(symbols, OPERATORS);
    // }

    let result = symbols;
    if (token.string.length > 1) {
      if (this.fuzzy) {
        result = fuzzaldrin.filter(symbols, token.string, {});
      } else {
        const PREFIX_RE = new RegExp('^' + _.escapeRegExp(token.string));
        debug('Filtering symbols that do not match', PREFIX_RE);
        result = symbols.filter(s => PREFIX_RE.test(s));
      }
    }
    result = result.map(symbol => this.normalizeSuggestion(symbol, token));

    debug('%s -> suggest', token.pretty, { kind, symbols, result });
    return result;
  }

  execute(cm) {
    const cursor = cm.getCursor();
    const token = this.getTokenAtCursor(cm, cursor);

    const res = {
      list: [],
      from: new Pos(cursor.line, token.start),
      to: new Pos(cursor.line, token.end)
    };

    const allTokens = cm.getLineTokens(cursor.line);
    const heads = allTokens.filter(
      t => t.start < cursor.ch && t.start !== token.start
    );
    const prevToken = _.last(heads);

    const headKeys = heads
      .filter(t => t.type === 'variable')
      .map(t => t.string);

    const headFieldNames = headKeys.filter(k => k.charAt(0) !== '$');
    const headOperators = headKeys.filter(k => k.charAt(0) === '$');

    debug('head', {
      token: token,
      prevToken: prevToken,
      headFieldNames: headFieldNames,
      headOperators: headOperators
    });

    debug('Finding hints', token.pretty);
    if (token.start === 0 && token.string === '{') {
      debug('Case: Blank Slate');
      res.list = this.suggest(token, ['fields']);
      res._case = 'blank slate';
      return res;
    }

    if (token.type === 'variable' && prevToken.string === '{') {
      res.list = this.suggest(token, ['fields', 'operators']);
      res._case = 'list field names or operators with prefix';

      // {_id█} case
      // Automatically start the next clause
      if (res.list.length === 1 && res.list[0].text === token.string) {
        res.list = [this.normalizeSuggestion(': ', token)];
        res._case = 'start the next clause';
      }
      return res;
    }

    if (prevToken.string === ',' && token.string === ' ') {
      res.list = this.suggest(token, ['fields']).filter(
        h => headFieldNames.indexOf(h.text) === -1
      );
      res._case = 'next field';
      return res;
    }

    if (token.string === '{' && prevToken.string === ' ') {
      res.list = this.suggest(token, ['operators']);
      res._case = 'operators';
      return res;
    }

    if (prevToken.string === '.' || token.string === '.') {
      token.string =
        headFieldNames[0] +
        (token.type === 'property' ? '.' : '') +
        token.string;
      res.list = this.suggest(token, ['fields']);
      res._case = 'field property';
      return res;
    }

    if (token.string === ':' && prevToken.type === 'variable') {
      res.list = this.suggest(token, ['operators']);
      res._case = 'operators snug';
      return res;
    }

    // TODO (imlucas) Use type info to complete values.
    // if (prevToken.string === ':' || token.string === '.') {
    //   const prevFieldName = _.last(headFieldNames);
    //   const prevFieldType = this.fields[prevFieldName].type;
    //   if (prevFieldType === 'ObjectId') {
    //     res.list = [this.normalizeSuggestion("ObjectId('", token)];
    //     res._case = 'objectid value';
    //     return res;
    //   }
    //   if (prevFieldType === 'String') {
    //     res.list = [this.normalizeSuggestion("('", token)];
    //     res._case = 'string value';
    //     return res;
    //   }
    //
    //   if (prevFieldType === 'Number' || prevFieldType === 'Int32') {
    //     res.list = [this.normalizeSuggestion("('", token)];
    //     res._case = 'Int32 value';
    //     return res;
    //   }
    //
    //   console.warn('Thought it might be a value but dont know: ', {
    //     prevFieldType: prevFieldType,
    //     prevFieldName: prevFieldName
    //   });
    // }
    console.warn('Unhandled hint case! Please send @imlucas a ticket:', {
      token: token,
      prevToken: prevToken,
      headFieldNames: headFieldNames,
      headOperators: headOperators
    });

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

    if (res.list.length > 0) {
      debug('completions', res.list);
    }

    return res;
  }
}
module.exports = MongoDBHintProvider;
