var assert = require('assert');
var codemirror = require('./cm');
var _ = require('lodash');
var HintProvider = require('../');

// var arlo = {
//   _id: 'ObjectId()',
//   name: 'Arlo',
//   overdue_vet_visits: 0,
//   toys: [{ _id: 'ball', sythetic: true, color: 'orange' }],
//   birthday: new Date('2015-09-20')
// };
//
// var basil = {
//   _id: 'ObjectId()',
//   name: 'Basil',
//   overdue_vet_visits: 1,
//   toys: [{ _id: 'lobsta', sythetic: true, material: 'fabric', color: 'red' }],
//   birthday: new Date('2012-07-05')
// };
var petFields = {
  _id: 'ObjectId',
  name: 'String',
  toys: 'Array',
  'toys._id': 'String',
  'toys.sythetic': 'Boolean',
  'toys.color': 'String',
  'toys.material': 'String',
  overdue_vet_visits: 'Number',
  birthday: 'Date'
};

var getHints = function(cm) {
  return new HintProvider(petFields).execute(cm);
};

describe('codemirror-mongodb', function() {
  describe('codemirror mocker self-test', function() {
    codemirror.describe('{█}', function() {
      var cm = this.ctx.cm;
      it('should deserialize the cursor', function() {
        assert.deepEqual(cm.getCursor(), {
          line: 0,
          ch: 1,
          sticky: 'after'
        });
      });
      it('should have the correct token under the cursor', function() {
        var cursor = cm.getCursor();
        var token = cm.getTokenAt(cursor);
        if (token.end > cursor.ch) {
          token.end = cursor.ch;
          token.string = token.string.slice(0, cursor.ch - token.start);
        }
        assert.deepEqual(_.omit(token, ['state', 'pretty']), {
          end: 1,
          line: 0,
          start: 0,
          string: '{',
          type: null
        });
      });
    });
    codemirror.describe('{_id:█}', function() {
      var cm = this.ctx.cm;
      function splice(base, index, s) {
        return (
          base.substring(0, index) + s + base.substring(index, base.length)
        );
      }

      var cursor = cm.getCursor();
      var token = cm.getTokenAt(cursor);
      if (token.end > cursor.ch) {
        token.end = cursor.ch;
        token.string = token.string.slice(0, cursor.ch - token.start);
      }
      token.pretty = `${splice(cm.getValue(), cursor.ch, '█')}`;

      var allTokens = cm.getLineTokens(cursor.line);
      it('should work', function() {
        assert.equal('{_id:█}', token.pretty);
      });

      it('should have all tokens for the current line', function() {
        assert.equal(allTokens[0].string, '{');
        assert.equal(allTokens[0].type, null);
        assert.equal(allTokens[0].line, 0);
        assert.equal(allTokens[0].start, 0);
        assert.equal(allTokens[0].end, 1);

        assert.equal(allTokens[1].string, '_id');
        assert.equal(allTokens[1].type, 'variable');
        assert.equal(allTokens[1].line, 0);
        assert.equal(allTokens[1].start, 1);
        assert.equal(allTokens[1].end, 4);

        assert.equal(allTokens[2].string, ':');
        assert.equal(allTokens[2].type, null);
        assert.equal(allTokens[2].line, 0);
        assert.equal(allTokens[2].start, 4);

        assert.equal(allTokens[3].string, '}');
        assert.equal(allTokens[3].type, null);
        assert.equal(allTokens[3].line, 0);
        assert.equal(allTokens[3].start, 5);
      });
    });
  });
  describe('mongodb hint', function() {
    codemirror.describe('{█}', function() {
      var hints = getHints(this.ctx.cm);
      it('should have hints', function() {
        assert(hints.list.length);
      });
      it('should recommend all fields', function() {
        assert.equal(hints.list.length, Object.keys(petFields).length);
      });
    });

    codemirror.describe('{_id█}', function() {
      var hints = getHints(this.ctx.cm);
      it('should recommend : for the _id field', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, ': ');
      });
    });

    codemirror.describe('{_id:█}', function() {
      var hints = getHints(this.ctx.cm);
      it('should recommend operators only', function() {
        var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');
        assert.equal(operatorHints.length, hints.list.length);
      });
    });

    // TODO (imlucas) Use type info to complete values.
    // codemirror.describe('{_id: █}', function() {
    //   var hints = getHints(this.ctx.cm);
    //   it('should template values based on type', function() {
    //     assert.equal(hints.list[0].text, "ObjectId('");
    //   });
    // });

    codemirror.describe('{na█}', function() {
      var hints = getHints(this.ctx.cm);
      it('should recommend the name field', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, 'name');
      });
    });

    codemirror.describe('{_id: {$exists: true}, █}', function() {
      var hints = getHints(this.ctx.cm);
      it('should recommend field names other than _id', function() {
        var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');
        assert.equal(operatorHints.length, 0, 'should not have operators');
        assert(hints.list.length, 'should have hints');
        assert.equal(hints.list[0].text, 'name');
      });
    });

    codemirror.describe('{name: {█}}', function() {
      var hints = getHints(this.ctx.cm);

      it('should only recommend operators', function() {
        var fieldNameHints = hints.list.filter(h => h.text.charAt(0) !== '$');
        assert.equal(fieldNameHints.length, 0, 'should not have fieldNames');
        assert(hints.list.length, 'should have hints');
        assert.equal(hints.list[0].text, '$gte');
      });
    });

    codemirror.describe('{toys._i█}', function() {
      var hints = getHints(this.ctx.cm);
      it('should escape subdocument property paths', function() {
        assert.equal(hints.list[0].text, "'toys._id'");
      });
    });
  });
});
