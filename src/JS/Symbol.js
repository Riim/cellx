import nextUID from '../Utils/nextUID';

var Symbol = Function('return this;')().Symbol;

if (!Symbol) {
	Symbol = function Symbol(key) {
		return '__' + key + '_' + Math.floor(Math.random() * 1e9) + '_' + nextUID() + '__';
	};

	Symbol.iterator = Symbol('Symbol.iterator');
}

export default Symbol;
