var assert = require('assert');
var codemirror = require('./cm');
var _ = require('lodash');
var HintProvider = require('../');

// var arlo = {
//   _id: 'ObjectID()',
//   name: 'Arlo',
//   overdue_vet_visits: 0,
//   toys: [{ _id: 'ball', sythetic: true, color: 'orange' }],
//   birthday: new Date('2015-09-20')
// };
//
// var basil = {
//   _id: 'ObjectID()',
//   name: 'Basil',
//   overdue_vet_visits: 1,
//   toys: [{ _id: 'lobsta', sythetic: true, material: 'fabric', color: 'red' }],
//   birthday: new Date('2012-07-05')
// };
var petFields = {
  _id: 'ObjectID',
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

    codemirror.describe('{ █}', function() {
      var hints = getHints(this.ctx.cm);

      it('should have hints', function() {
        assert(hints.list.length);
      });

      it('should recommend all fields', function() {
        assert.equal(hints.list.length, Object.keys(petFields).length);
      });
    });

    codemirror.describe('{     █}', function() {
      var hints = getHints(this.ctx.cm);

      it('should have hints', function() {
        assert(hints.list.length);
      });

      it('should recommend all fields', function() {
        assert.equal(hints.list.length, Object.keys(petFields).length);
      });
    });

    codemirror.describe('{a    █}', function() {
      var hints = getHints(this.ctx.cm);

      it('should not have hints', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{na█}', function() {
      var hints = getHints(this.ctx.cm);

      it('recommends the matching field', function() {
        assert.equal(hints.list[0].text, 'name');
      });
    });

    codemirror.describe('{ na█}', function() {
      var hints = getHints(this.ctx.cm);

      it('recommends the matching field', function() {
        assert.equal(hints.list[0].text, 'name');
      });
    });

    codemirror.describe('{     na█}', function() {
      var hints = getHints(this.ctx.cm);

      it('recommends the matching field', function() {
        assert.equal(hints.list[0].text, 'name');
      });
    });

    codemirror.describe('{ n    na█}', function() {
      var hints = getHints(this.ctx.cm);

      it('has no recommendations', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{name: {█}}', function() {
      var hints = getHints(this.ctx.cm);
      var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');

      it('recommends all the operators', function() {
        assert.equal(operatorHints.length, 12);
      });

      it('only recommends operators', function() {
        assert.equal(hints.list.length, 12);
      });
    });

    codemirror.describe('{ name: { █}}', function() {
      var hints = getHints(this.ctx.cm);
      var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');

      it('recommends all the operators', function() {
        assert.equal(operatorHints.length, 12);
      });

      it('only recommends operators', function() {
        assert.equal(hints.list.length, 12);
      });
    });

    codemirror.describe('{     name: {     █}}', function() {
      var hints = getHints(this.ctx.cm);
      var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');

      it('recommends all the operators', function() {
        assert.equal(operatorHints.length, 12);
      });

      it('only recommends operators', function() {
        assert.equal(hints.list.length, 12);
      });
    });

    codemirror.describe('{name: { $g█}}', function() {
      var hints = getHints(this.ctx.cm);

      it('recommends matching operators', function() {
        assert.equal(hints.list[0].text, '$gte');
        assert.equal(hints.list[1].text, '$gt');
        assert.equal(hints.list.length, 2);
      });
    });

    codemirror.describe('{name: { $gte█}}', function() {
      var hints = getHints(this.ctx.cm);

      it('adds the : plus space for exact match with only 1 remaining result', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, '$gte: ');
      });
    });

    codemirror.describe('{name: {      $gte█}}', function() {
      var hints = getHints(this.ctx.cm);

      it('adds the : plus space for exact match with only 1 remaining result', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, '$gte: ');
      });
    });

    codemirror.describe('{$g█}', function() {
      var hints = getHints(this.ctx.cm);

      it('does not recommend operators', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{name:█}', function() {
      var hints = getHints(this.ctx.cm);

      it('should not recommend operators', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{name█}', function() {
      var hints = getHints(this.ctx.cm);

      it('adds the : plus space for exact match with only 1 remaining result', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, 'name: ');
      });
    });

    codemirror.describe('{     name█}', function() {
      var hints = getHints(this.ctx.cm);

      it('adds the : plus space for exact match with only 1 remaining result', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, 'name: ');
      });
    });

    codemirror.describe('{.█}', function() {
      var hints = getHints(this.ctx.cm);

      it('does not lists any suggestions', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{toys.█}', function() {
      var hints = getHints(this.ctx.cm);

      it('lists all subfield suggestions', function() {
        assert.equal(hints.list.length, 4);
      });
    });

    codemirror.describe('{toys._i█}', function() {
      var hints = getHints(this.ctx.cm);
      it('escapes subdocument property paths', function() {
        assert.equal(hints.list[0].text, "'toys._id'");
      });
    });

    codemirror.describe('{   toys._i█}', function() {
      var hints = getHints(this.ctx.cm);

      it('escapes subdocument property paths', function() {
        assert.equal(hints.list[0].text, "'toys._id'");
      });
    });

    codemirror.describe('{ toys.co█}', function() {
      var hints = getHints(this.ctx.cm);

      it('escapes subdocument property paths', function() {
        assert.equal(hints.list[0].text, "'toys.color'");
      });
    });

    codemirror.describe('{_id: {$exists: true}, █}', function() {
      var hints = getHints(this.ctx.cm);
      var operatorHints = hints.list.filter(h => h.text.charAt(0) === '$');

      it('recommends field names other than _id', function() {
        assert.equal(hints.list[0].text, 'name');
      });

      it('does not include operators', function() {
        assert.equal(operatorHints.length, 0, 'should not have operators');
      });
    });

    // // @todo: Durran: Not in current behaviour but would be consistent.
    // codemirror.describe('{ toys.color█}', function() {
      // var hints = getHints(this.ctx.cm);

      // it('escapes subdocument property paths and adds : for exact result', function() {
        // assert.equal(hints.list[0].text, "'toys.color': ");
      // });
    // });

    codemirror.describe('{_id: █}', function() {
      var hints = getHints(this.ctx.cm);

      it('returns a list of types', function() {
        assert.equal(hints.list.length, 10);
        assert.equal(hints.list[0].text, 'BSONDate');
      });
    });

    codemirror.describe('{_id:     █}', function() {
      var hints = getHints(this.ctx.cm);

      it('returns a list of types', function() {
        assert.equal(hints.list.length, 10);
        assert.equal(hints.list[0].text, 'BSONDate');
      });
    });

    codemirror.describe('{_id:█}', function() {
      var hints = getHints(this.ctx.cm);

      it('does not hint with invalid syntax', function() {
        assert.equal(hints.list.length, 0);
      });
    });

    codemirror.describe('{_id: Obje█}', function() {
      var hints = getHints(this.ctx.cm);

      it('returns a list of types', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, 'ObjectId');
      });
    });

    codemirror.describe('{_id:   Obje█}', function() {
      var hints = getHints(this.ctx.cm);

      it('returns a list of types', function() {
        assert.equal(hints.list.length, 1);
        assert.equal(hints.list[0].text, 'ObjectId');
      });
    });

    // codemirror.describe("{name: 'lucas█}", function() {
    //   var hints = getHints(this.ctx.cm);
    //   it('should recommend closing the quote', function() {
    //     assert.equal(hints.list[0].text, "'lucas'");
    //   });
    // });
  });

  describe('fields', function() {
    it('should default to a single _id field', function() {
      var hp = new HintProvider();
      assert.equal(Object.keys(hp.fields).length, 1);

      assert.equal(hp.fields._id.name, '_id');
      assert.equal(hp.fields._id.path, '_id');
      assert.equal(hp.fields._id.type, 'ObjectID');
    });

    it('should expand type strings into a field summary', function() {
      var hp = new HintProvider({ _id: 'ObjectID', name: 'String' });
      assert.equal(hp.fields._id.name, '_id');
      assert.equal(hp.fields._id.path, '_id');
      assert.equal(hp.fields._id.type, 'ObjectID');

      assert.equal(hp.fields.name.name, 'name');
      assert.equal(hp.fields.name.path, 'name');
      assert.equal(hp.fields.name.type, 'String');
    });

    it('should accept a field summary', function() {
      var hp = new HintProvider({
        _id: { name: '_id', path: '_id', type: 'ObjectID' },
        name: { name: 'name', path: 'name', type: 'String' }
      });
      assert.equal(hp.fields._id.name, '_id');
      assert.equal(hp.fields._id.path, '_id');
      assert.equal(hp.fields._id.type, 'ObjectID');

      assert.equal(hp.fields.name.name, 'name');
      assert.equal(hp.fields.name.path, 'name');
      assert.equal(hp.fields.name.type, 'String');
    });
  });
});
