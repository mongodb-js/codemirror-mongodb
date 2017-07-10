/* eslint complexity: 0 */
const _ = require('lodash');
const fuzzaldrin = require('fuzzaldrin-plus');

const debug = require('debug')('codemirror-mongodb');

const FIELDS = 'fields';

const OPERATOR = 'operators';

const VARIABLE = 'variable';

const SPACES = /\s+/;

const START_CURLY = '{';

const END_CURLY = '}';

const COMMA = ',';

const COLON = ':';

const DOT = '.';

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

function isOperator(input) {
  return OPERATORS.indexOf(input) > -1;
}

function isNotOperator(input) {
  return !isOperator(input);
}

function isObjectIDType(input) {
  return input === 'ObjectID' || input === 'ObjectId';
}

function keysOnlyFromTokens(tokens) {
  return tokens.filter(function(t) {
    if (t.type === 'variable') {
      return true;
    }
    if (t.type === 'string') {
      return /^['"].*['"]$/.test(t.string);
    }
  })
  .map(function(t) {
    return t.string.replace(/['"]/g, '');
  });
}

class MongoDBHintProvider {
  /* eslint no-unused-vars: 0 */
  constructor(fields = { _id: 'ObjectID' }, fuzzy = false) {
    this.fuzzy = false;

    this.fields = {};

    Object.keys(fields).map(k => {
      if (_.isObject(fields[k])) {
        this.fields[k] = _.pick(fields[k], ['name', 'path', 'type']);
        return;
      }
      this.fields[k] = {
        name: k,
        path: k,
        type: fields[k]
      };
    });
  }

  getTokenAtCursor(cm, cursor) {
    const token = cm.getTokenAt(cursor);
    if (!token) return null;

    if (token.end > cursor.ch) {
      token.end = cursor.ch;
      token.string = token.string.slice(0, cursor.ch - token.start);
    }
    token.pretty = `${splice(cm.getValue(), cursor.ch, '█')}`;
    return token;
  }

  escapeSuggestedFieldName(name) {
    return name.indexOf(DOT) > -1 ? `'${name}'` : name;
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

  suggest(token = { string: '' }, kind = [FIELDS, OPERATOR, 'values']) {
    const symbols = [];

    if (_.includes(kind, FIELDS)) {
      symbols.push.apply(symbols, this.getAllFieldNames());
    }

    if (_.includes(kind, OPERATOR)) {
      symbols.push.apply(symbols, OPERATORS);
    }

    // if (_.includes(kind, 'values')) {
    //   symbols.push.apply(symbols, OPERATORS);
    // }

    // className: 'CodeMirror-hint-mongodb--field'

    let result = symbols;
    const trimmed = token.string.trim();
    if (trimmed.length > 1) {
      if (this.fuzzy) {
        result = fuzzaldrin.filter(symbols, trimmed, {});
      } else {
        const PREFIX_RE = new RegExp('^' + _.escapeRegExp(trimmed));
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
    if (!token) {
      return;
    }

    const res = {
      list: [],
      from: new Pos(cursor.line, token.start),
      to: new Pos(cursor.line, token.end)
    };

    const isHead = function(t) {
      return t.start < cursor.ch && t.start !== token.start;
    };

    const isTail = function(t) {
      return !isHead(t);
    };


    const allTokens = cm.getLineTokens(cursor.line);

    const heads = allTokens.filter(isHead);
    const prevToken = _.last(heads);
    const prevPrevToken = heads[heads.length - 2];
    const headKeys = keysOnlyFromTokens(heads);
    const headFieldNames = headKeys.filter(isNotOperator);
    const headOperators = headKeys.filter(isOperator);

    const tails = allTokens.filter(isTail);
    const nextToken = _.head(tails);
    const tailKeys = keysOnlyFromTokens(tails);
    const tailFieldNames = tailKeys.filter(isNotOperator);
    const tailOperators = tailKeys.filter(isOperator);
    const reverseSearch = heads.concat([ token ]);

    debug('Finding hints: %s', token.pretty);
    debug('  token', token);
    debug('  prev', prevToken);
    debug('  next', nextToken);
    debug('  headFieldNames', headFieldNames);
    debug('  headOperators', headOperators);
    debug('  tailFieldNames', tailFieldNames);
    debug('  tailOperators', tailOperators);

    const isTokenOpening = () => {
      return token.string === START_CURLY || token.string === COMMA;
    }

    const isPrevTokenOpening = () => {
      return prevToken && (prevToken.string === START_CURLY || prevToken.string === COMMA);
    }

    const isPrevTokenSpace = () => {
      return prevToken && SPACES.test(prevToken.string);
    }

    const isPrevTokenOpeningPlusSpace = () => {
      return isPrevTokenSpace() &&
        (prevPrevToken &&
         (prevPrevToken.string === START_CURLY || prevPrevToken.string === COMMA));
    }

    /**
     * We can suggest a field if the cursor is at a position in front of a {
     *
     * Examples:
     *   {█}
     *   { █}
     *   {       █}
     *   {na█}
     *   { na█}
     *   {     na█}
     */
    const isFieldSuggestable = () => {
      return token.string !== DOT &&
        (isTokenOpening() || isPrevTokenOpening() || isPrevTokenOpeningPlusSpace());
    };

    /**
     * We can suggest a field if the cursor is at a position in front of a .
     */
    const isSubFieldSuggestable = () => {
      return token.string === DOT || prevToken.string === DOT;
    };

    /**
     * We can suggest an operator if the cursor is at a position in front of a {
     * and is a value of another field.
     *
     * Examples:
     *   { name: {█}}
     *   { name: { █}}
     *   { name: {     █}}
     */
    const isOperatorSuggestable = () => {
      let braceMatch = false;
      for (let i = reverseSearch.length - 1; i >= 0; i--) {
        const prev = reverseSearch[i];
        if (!braceMatch) {
          if (!SPACES.test(prev.string)) {
            if (prev.string === START_CURLY) {
              braceMatch = true;
            } else if (prev.string === END_CURLY || prev.string === COMMA) {
              return false;
            }
          }
        } else {
          if (!SPACES.test(prev.string)) {
            return prev.string === COLON;
          }
        }
      }
    };

    /**
     * If there is only 1 match left in the list and it matches the
     * text exactly, then add a ': ' to it.
     *
     * @note: This will potentially mutate the result.
     */
    const enhanceResult = (res) => {
      if (res.list.length === 1 && res.list[0].text === token.string) {
        res.list = [ this.normalizeSuggestion(token.string + ': ', token) ];
        res._case = 'start the next clause';
      }
      return res;
    };

    /**
     * This will add operator suggestions.
     */
    if (isOperatorSuggestable()) {
      res.list = this.suggest(token, [ OPERATOR ]);
      res.from = new Pos(cursor.line, token.start + 1);
      res._case = 'list operators';
      return enhanceResult(res);
    }

    /**
     * This will add field suggestions.
     */
    if (isFieldSuggestable()) {
      res.list = this.suggest(token, [ FIELDS ]);
      res.from = new Pos(cursor.line, token.start + 1);
      res._case = 'list field names';
      return enhanceResult(res);
    }

    /**
     * This will add subfield suggestions.
     */
    if (isSubFieldSuggestable()) {
      token.string =
        headFieldNames[0] +
        (token.type === 'property' ? '.' : '') +
        token.string;
      res.list = this.suggest(token, ['fields']);
      res._case = 'field property';
      return res;
    }

    // if (prevToken) {
      // if (prevToken.string === ',' && token.string === ' ') {
        // res.list = this.suggest(token, ['fields']).filter(function(t) {
          // return headFieldNames.indexOf(t.text) === -1 && tailFieldNames.indexOf(t.text) === -1;
        // });
        // res._case = 'next field';
        // return res;
      // }

      // if (prevToken.string === '.' || token.string === '.') {
        // token.string =
          // headFieldNames[0] +
          // (token.type === 'property' ? '.' : '') +
          // token.string;
        // res.list = this.suggest(token, ['fields']);
        // res._case = 'field property';
        // return res;
      // }

      // {name: 'lucas█}
      // if (
        // prevToken.string === ' ' &&
        // token.type === 'string' &&
        // _.startsWith(token.string, "'") &&
        // !_.endsWith(token.string, "'")
      // ) {
        // res.list = [this.normalizeSuggestion(token.string + "'", token)];
        // res.from = new Pos(cursor.line, token.start + 1);
        // res._case = 'close string value';
        // return res;
      // }

      // if (prevToken.string === ':' || token.string === '.') {
        // const prevFieldName = _.last(headFieldNames);
        // const prevField = this.fields[prevFieldName];

        // if (!prevField) {
          // debug('Nothing to reccomend bc of no type for field `%s`', prevFieldName);
          // return res;
        // }

        // let prevFieldType = prevField.type;
        // if (Array.isArray(prevFieldType)) {
          // prevFieldType = _.first(prevFieldType);
        // }

        // if (isObjectIDType(prevFieldType)) {
          // res.list = [this.normalizeSuggestion("ObjectID('", token)];
          // res.from = new Pos(cursor.line, token.start + 1);
          // res._case = 'ObjectID value';
          // return res;
        // }
        // if (prevFieldType === 'String') {
          // res.list = [this.normalizeSuggestion("'", token)];
          // res.from = new Pos(cursor.line, token.start + 1);
          // res._case = 'string value';
          // return res;
        // }

        // debug('Could suggest a value here in the future: ', {
          // prevFieldType: prevFieldType,
          // prevFieldName: prevFieldName
        // });
        // return res;
      // }
    // }
    // debug('Unhandled suggestion case.  See debugging info above.');
    /**
       * TODO (imlucas)
       * if inputWhenTriggered = `{_id: █}` and
       * the schema type of _id is an ObjectID ->
       *  completions.push('ObjectID("█")')
       *
       * Or if a boolean, suggest - `false` - `true`
       */

    return res;
  }
}
module.exports = MongoDBHintProvider;
