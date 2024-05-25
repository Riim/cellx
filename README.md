<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

Ultra-fast implementation of reactivity for javascript/typescript.

[![NPM version](https://badge.fury.io/js/cellx.svg)](https://www.npmjs.com/package/cellx)
[![Build Status](https://travis-ci.org/Riim/cellx.svg?branch=master)](https://travis-ci.org/Riim/cellx)
[![Coverage Status](https://coveralls.io/repos/github/Riim/cellx/badge.svg?branch=master)](https://coveralls.io/github/Riim/cellx?branch=master)

## Installation

The following command installs cellx as a npm package:
```
npm i -S cellx
```

## Usage example

```js
let firstName = cellx('Матроскин');
let lastName = cellx('Кот');

let fullName = cellx(() => firstName.value + ' ' + lastName.value)

fullName.subscribe(() => {
    console.log('fullName:', fullName.value);
});

console.log(fullName.value);
// => 'Матроскин Кот'

firstName.value = 'Шарик';
lastName.value = 'Пёс';
// => 'fullName: Шарик Пёс'
```

Despite the fact that the two dependencies of the cell `fullName` has been changed, change handler worked only once.
Important feature of cellx is that it tries to get rid of unnecessary calls of the event handlers as well as of
unnecessary calculations of the dependent cells.
In combination with some special optimizations, this leads to an ideal speed of calculation of the complex dependencies
networks.
You can find out more about this in the article [Big State Managers Benchmark](https://habr.com/ru/articles/707600/).
You may also be interested in the article
[Разбираемся в сортах реактивности](https://habr.com/ru/companies/timeweb/articles/586450/).

## Benchmark

One test, which is used for measuring the performance, generates grid with multiple "layers" each of which is composed
of 4 cells. Cells of each next layer are calculated from the previous layer cells (except the first layer, which
contains initial values) by the formula A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. After that start time is stored, values of all
first layer cells are changed and time needed to update all last layer cells is measured.
Test results (in milliseconds) for different number of layers:

| Library ↓ \ Number of computed layers →                 | 10      | 20                                | 30                                  | 50      | 100     | 1000    | 5000                                         |
|---------------------------------------------------------|---------|-----------------------------------|-------------------------------------|---------|---------|---------|----------------------------------------------|
| cellx                                                   |     <~1 |                               <~1 |                                 <~1 |     <~1 |     <~1 |       4 |                                           20 |
| VanillaJS (naive)                                       |     <~1 |                                15 |                                1750 | >300000 | >300000 | >300000 |                                      >300000 |
| [Knockout](http://knockoutjs.com/)                      |      10 | 750, increases in subsequent runs | 67250, increases in subsequent runs | >300000 | >300000 | >300000 |                                      >300000 |
| [$jin.atom](https://github.com/nin-jin/pms-jin/)        |       2 |                                 3 |                                   3 |       4 |       6 |      40 |                                          230 |
| [$mol_atom](https://github.com/nin-jin/mol)             |     <~1 |                               <~1 |                                 <~1 |       1 |       2 |      20 | RangeError: Maximum call stack size exceeded |
| [Kefir.js](https://rpominov.github.io/kefir/)           |      25 |                              2500 |                             >300000 | >300000 | >300000 | >300000 |                                      >300000 |
| [MobX](https://mobxjs.github.io/mobx/)                  |     <~1 |                               <~1 |                                 <~1 |       2 |       3 |      40 | RangeError: Maximum call stack size exceeded |

Test sources can be found in the folder [perf](https://github.com/Riim/cellx/tree/master/perf).
Density of connections in real applications is usually lower than in the present test, that is, if a certain delay in
the test is visible in 100 calculated cells (25 layers), in a real application, this delay will either be visible in the greater number of cells, or cells formulas will include some complex calculations (e.g., computation of one array from
other).

## Usage

Functional style:

```js
let num = cellx(1);
let plusOne = cellx(() => num.value + 1);

console.log(plusOne.value);
// => 2
```

OOP style:

```js
import { cellx, define } from 'cellx';

class User {
	name: string;
	nameInitial: string;

	constructor(name: string) {
		define(this, {
			name,
			nameInitial: cellx(() => this.name.charAt(0).toUpperCase())
		});
	}
}

let user = new User('Матроскин');

console.log(user.nameInitial);
// => 'M'
```

OOP style with decorators:

```js
import { Computed, Observable } from 'cellx-decorators';

class User {
	@Observable name: string;

	@Computed get nameInitial() {
		return this.name.charAt(0).toUpperCase();
	}

	constructor(name: string) {
		this.name = name;
	}
}

let user = new User('Матроскин');

console.log(user.nameInitial);
// => 'M'
```

### Options

#### put

It can be used for value processing on write and write redirection:

```js
function User() {
    this.firstName = cellx('');
    this.lastName = cellx('');

    this.fullName = cellx(
		() => (this.firstName.value + ' ' + this.lastName.value).trim(),
		{
			put: (_cell, name) => {
				name = name.split(' ');

				this.firstName.value = name[0];
				this.lastName.value = name[1];
			}
		}
	);
}

let user = new User();

user.fullName.value = 'Матроскин Кот';

console.log(user.firstName.value);
// => 'Матроскин'
console.log(user.lastName.value);
// => 'Кот'
```

#### validate

Validates the value during recording and calculating.

Validation during recording into the cell:

```js
let num = cellx(5, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Must be a number');
        }
    }
});

try {
    num('I am string');
} catch (err) {
    console.log(err.message);
    // => 'Must be a number'
}

console.log(num.value);
// => 5
```

Validation during the calculation of the cell:

```js
let someValue = cellx(5);

let num = cellx(() => someValue.value, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Must be a number');
        }
    }
});

num.subscribe((err) => {
    console.log(err.message);
});

someValue.value = 'I am string';
// => 'Must be a number'

console.log(value.value);
// => 'I am string'
```

### Methods

#### onChange

Adds a change listener:

```js
let num = cellx(5);

num.onChange((evt) => {
    console.log(evt);
});

num.value = 10;
// => { prevValue: 5, value: 10 }
```

#### offChange

Removes previously added change listener.

#### onError

Adds a error listener:

```js
let someValue = cellx(1);

let num = cellx(() => someValue.value, {
    validate: (v) => {
        if (v > 1) {
            throw RangeError('Oops!');
        }
    }
});

num.onError((evt) => {
    console.log(evt.error.message);
});

someValue.value = 2;
// => 'Oops!'
```

#### offError

Removes previously added error listener.

#### subscribe

Subscribes to the events `change` and `error`. First argument comes into handler is an error object, second — an event.

```js
fullName.subscribe((err, evt) => {
    if (err) {
        // error handling
    } else {
        // other
    }
});
```

#### unsubscribe

Unsubscribes from events `change` and `error`.

## Dynamic actualisation of dependencies

Calculated cell formula can be written so that a set of dependencies may change over time. For example:

```js
let user = {
    firstName: cellx(''),
    lastName: cellx(''),

    name: cellx(() => user.firstName.value || user.lastName.value)
};
```

There, while `firstName` is empty string, cell `name` uses `firstName` and `lastName` for calculate self value
and change in any of them will lead to calculating `name`. If you assign to the `firstName` some not empty
string, then during recalculation value of cell `name` it will not come to reading `lastName` in the formula,
i.e. the value of the cell `name` from this moment will not depend on `lastName`.
In such cases, cells automatically unsubscribe from dependencies insignificant for them and are not recalculated
when they change. In the future, if the `firstName` again become an empty string, the cell `name` will re-subscribe
to the `lastName`.

## Synchronization of value with synchronous storage

```js
let foo = cellx(() => localStorage.foo || 'foo', {
	put: ({ push }, value) => {
		localStorage.foo = value;

		push(value);
	}
});

let foobar = cellx(() => foo.value + 'bar');

console.log(foobar.value); // => 'foobar'
console.log(localStorage.foo); // => undefined
foo.value = 'FOO';
console.log(foobar.value); // => 'FOObar'
console.log(localStorage.foo); // => 'FOO'
```

## Synchronization of value with asynchronous storage

```js
let request = (() => {
	let value = 1;

	return {
		get: (url) => new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    ok: true,
                    value
                });
            }, 1000);
        }),

		put: (url, params) => new Promise((resolve, reject) => {
            setTimeout(() => {
                value = params.value;

                resolve({ ok: true });
            }, 1000);
        })
	};
})();

let foo = cellx(({ push, fail }, next = 0) => {
	request.get('http://...').then((res) => {
		if (res.ok) {
			push(res.value);
		} else {
			fail(res.error);
		}
	});

	return next;
}, {
	put: ({ push, fail }, next) => {
		request.put('http://...', { value: next }).then((res) => {
			if (res.ok) {
				push(next);
			} else {
				fail(res.error);
			}
		});
	}
});

foo.subscribe(() => {
	console.log('New foo value: ' + foo.value);

	foo.value = 5;
});

console.log(foo.value);
// => 0

// => 'New foo value: 1'
// => 'New foo value: 5'
```
