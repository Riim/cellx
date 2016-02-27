var nextUID = require('../utils/nextUID');

var Symbol = global.Symbol;

if (!Symbol) {
	Symbol = function Symbol(key) {
		return '__' + key + '_' + Math.floor(Math.random() * 1e9) + '_' + nextUID() + '__';
	};

	Symbol.iterator = Symbol('iterator');
}

module.exports = Symbol;
