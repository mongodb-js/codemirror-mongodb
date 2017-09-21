/* eslint complexity: 0 */
const _ = require('lodash');
const fuzzaldrin = require('fuzzaldrin-plus');

const debug = require('debug')('codemirror-mongodb');

const FIELDS = 'fields';
const OPERATOR = 'operators';
const VARIABLE = 'variable';
const SPACES = /\s+/;
const START = /(\s+|\{|,|:|\[)/;
const MATCH = /\w/;
const START_CURLY = '{';
const END_CURLY = '}';
const COMMA = ',';
const COLON = ':';
const OPEN_BRACKET = '[';
const CLOSE_BRACKET = ']';
const DOT = '.';
const VALUES = 'values';

const OPERATORS = [
  '$gte',
  '$gt',
  '$lte',
  '$lt',
  '$eq',
  '$ne',
  '$not',
  '$type',
  '$size',
  '$exists',
  '$in',
  '$nin',
  '$all'
];

const TYPES = [
  'ISODate',
  'Binary',
  'MaxKey',
  'MinKey',
  'NumberDecimal',
  'NumberLong',
  'ObjectId',
  'RegExp',
  'Timestamp'
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
  constructor(options = { fields: { _id: 'ObjectId' }, fuzzy: false, input: 'filter' }) {
    this.fuzzy = options.fuzzy || false;
    this.isFilter = options.input === 'filter';

    this.fields = {};

    Object.keys(options.fields).map(k => {
      if (_.isObject(options.fields[k])) {
        this.fields[k] = _.pick(options.fields[k], ['name', 'path', 'type']);
        return;
      }
      this.fields[k] = {
        name: k,
        path: k,
        type: options.fields[k]
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

  normalizeSuggestion(text, token, type) {
    return {
      text: this.escapeSuggestedFieldName(text),
      displayText: fuzzaldrin.wrap(text, token.string),
      type: type
    };
  }

  suggest(token = { string: '' }, kind) {
    const symbols = [];

    if (kind === FIELDS) {
      symbols.push.apply(symbols, this.getAllFieldNames());
    }

    if (kind === OPERATOR) {
      symbols.push.apply(symbols, OPERATORS);
    }

    if (kind === VALUES) {
      symbols.push.apply(symbols, TYPES);
    }

    let result = symbols;
    const trimmed = token.string.trim();

    if (trimmed.length > 1 || MATCH.test(trimmed)) {
      if (this.fuzzy) {
        result = fuzzaldrin.filter(symbols, trimmed, {});
      } else {
        const PREFIX_RE = new RegExp('^' + _.escapeRegExp(trimmed));
        debug('Filtering symbols that do not match', PREFIX_RE);
        result = symbols.filter(s => PREFIX_RE.test(s));
      }
    }
    result = result.map(symbol => this.normalizeSuggestion(symbol, token, kind));

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
      return t.start >= cursor.ch;
    };

    const allTokens = cm.getLineTokens(cursor.line);

    const heads = allTokens.filter(isHead);
    const prevToken = _.last(heads);
    const skipPrevToken = heads[heads.length - 2];
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

    const isTokenMatching = (matches) => {
      return token && matches.includes(token.string);
    };

    const isPrevTokenMatching = (matches) => {
      return prevToken && matches.includes(prevToken.string);
    };

    const isPrevTokenSpace = () => {
      return prevToken && SPACES.test(prevToken.string);
    };

    const isSkipPrevTokenMatching = (matches) => {
      return isPrevTokenSpace() && (skipPrevToken && matches.includes(skipPrevToken.string));
    };

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
      const matches = [ START_CURLY, COMMA ];
      return token && token.string !== DOT &&
        (isTokenMatching(matches) || isPrevTokenMatching(matches) || isSkipPrevTokenMatching(matches));
    };

    /**
     * We can suggest a field if the cursor is at a position in front of a .
     */
    const isSubFieldSuggestable = () => {
      return (token && token.string === DOT) || (prevToken && prevToken.string === DOT);
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
      if (!this.isFilter) {
        return false;
      }
      let braceMatch = false;
      for (let i = reverseSearch.length - 1; i >= 0; i--) {
        const prev = reverseSearch[i];
        if (!braceMatch) {
          if (!SPACES.test(prev.string)) {
            if (prev.string === START_CURLY) {
              braceMatch = true;
            } else if ([ END_CURLY, COMMA, COLON ].includes(prev.string)) {
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
     * We can suggest an operator if the cursor is at a position in front of a :
     * with more than one space.
     *
     * Examples:
     *   { name: █}
     *   { name:      █}
     */
    const isValueSuggestable = () => {
      if (!this.isFilter) {
        return false;
      }
      const matches = [ COLON, OPEN_BRACKET ];
      return (!nextToken || nextToken.string !== OPEN_BRACKET) &&
          token.string !== CLOSE_BRACKET &&
          (isPrevTokenMatching(matches) || isSkipPrevTokenMatching(matches));
    };

    /**
     * If the user has autocompleted from the previous character and not started
     * typing yet, we need to shift the cursor forward 1 character to account for
     * the selection of the hint.
     */
    const maybeMoveFromPosition = () => {
      if (token && START.test(token.string)) {
        res.from = new Pos(cursor.line, token.start + 1);
      }
    };

    /**
     * This will add operator suggestions.
     */
    if (isOperatorSuggestable()) {
      if (!this.isFilter) {
        return false;
      }
      res.list = this.suggest(token, OPERATOR);
      maybeMoveFromPosition();
      res._case = 'list operators';
      return res;
    }

    /**
     * This will add field suggestions.
     */
    if (isFieldSuggestable()) {
      res.list = this.suggest(token, FIELDS);
      if (prevToken && prevToken.string === COMMA && token.string === ' ') {
        res.list = res.list.filter((t) => {
          return headFieldNames.indexOf(t.text) === -1 && tailFieldNames.indexOf(t.text) === -1;
        });
      }
      maybeMoveFromPosition();
      res._case = 'list field names';
      return res;
    }

    /**
     * This will add subfield suggestions.
     */
    if (isSubFieldSuggestable()) {
      token.string =
        headFieldNames[0] +
        (token.type === 'property' ? '.' : '') +
        token.string;
      res.list = this.suggest(token, FIELDS);
      res._case = 'field property';
      return res;
    }

    /**
     * This will add value type suggestions.
     */
    if (isValueSuggestable()) {
      res.list = this.suggest(token, VALUES);
      maybeMoveFromPosition();
      res._case = 'list value types';
      return res;
    }

    debug('Unhandled suggestion case. See debugging info above.');

    return res;
  }
}
module.exports = MongoDBHintProvider;
