<p align="right">
    <a href="https://github.com/Riim/cellx/blob/master/README.ru.md">Этот документ на русском</a>
</p>

<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

Ultra-fast implementation of reactivity for javascript.

[![NPM version](https://badge.fury.io/js/cellx.svg)](https://www.npmjs.com/package/cellx)
[![Build Status](https://travis-ci.org/Riim/cellx.svg?branch=master)](https://travis-ci.org/Riim/cellx)
[![Coverage Status](https://coveralls.io/repos/github/Riim/cellx/badge.svg?branch=master)](https://coveralls.io/github/Riim/cellx?branch=master)
[![Dependency Status](https://david-dm.org/Riim/cellx/status.svg)](https://david-dm.org/Riim/cellx#info=dependencies)
[![Dev Dependency Status](https://david-dm.org/Riim/cellx/dev-status.svg)](https://david-dm.org/Riim/cellx#info=devDependencies)

## Installation

The following command installs cellx as a npm package:
```
npm install cellx --save
```

## Example

```js
let user = {
    firstName: cellx('Matroskin'),
    lastName: cellx('Cat'),

    fullName: cellx(function() {
        return (user.firstName() + ' ' + user.lastName()).trim();
    })
};

user.fullName.subscribe(function() {
    console.log('fullName: ' + user.fullName());
});

console.log(user.fullName());
// => 'Matroskin Cat'

user.firstName('Sharik');
user.lastName('Dog');
// => 'fullName: Sharik Dog'
```

Despite the fact that the two dependencies of the cell `fullName` has been changed, event handler worked only once.
Important feature of cellx is that it tries to get rid of unnecessary calls
of the event handlers as well as of unnecessary calls of the dependent cells calculation formulas.
In combination with some special optimizations, this leads to an ideal speed of calculation of
the complex dependencies networks.

## Benchmark

One test, which is used for measuring the performance, generates grid with multiply "layers"
each of which is composed of 4 cells. Cells are calculated from the previous layer of cells (except the first one,
which contains initial values) by the formula A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. After that start time is stored,
values of all first layer cells are changed and time needed to update all last layer cells is measured.
Test results (in milliseconds) for different number of layers (for Google Chrome 53.0.2785.116 (64-bit)):

| Library ↓ \ Number of computed layers →                 | 10      | 20                                | 30                                  | 50      | 100     | 1000    | 5000                                         |
|---------------------------------------------------------|---------|-----------------------------------|-------------------------------------|---------|---------|---------|----------------------------------------------|
| cellx                                                   |     <~1 |                               <~1 |                                 <~1 |     <~1 |     <~1 |       4 |                                           20 |
| VanillaJS (naive)                                       |     <~1 |                                15 |                                1750 | >300000 | >300000 | >300000 |                                      >300000 |
| [Knockout](http://knockoutjs.com/)                      |      10 | 750, increases in subsequent runs | 67250, increases in subsequent runs | >300000 | >300000 | >300000 |                                      >300000 |
| [$jin.atom](https://github.com/nin-jin/pms-jin/)        |       2 |                                 3 |                                   3 |       4 |       6 |      40 |                                          230 |
| [$mol_atom](https://github.com/nin-jin/mol)             |     <~1 |                               <~1 |                                 <~1 |       1 |       2 |      20 | RangeError: Maximum call stack size exceeded |
| [Reactor.js](https://github.com/fynyky/reactor.js)      |     <~1 |                               <~1 |                                   2 |       3 |       5 |      50 |                                          230 |
| [Reactive.js](https://github.com/mattbaker/Reactive.js) |     <~1 |                               <~1 |                                   2 |       3 |       5 |     140 | RangeError: Maximum call stack size exceeded |
| [Kefir.js](https://rpominov.github.io/kefir/)           |      25 |                              2500 |                             >300000 | >300000 | >300000 | >300000 |                                      >300000 |
| [MobX](https://mobxjs.github.io/mobx/)                  |     <~1 |                               <~1 |                                 <~1 |       2 |       3 |      40 | RangeError: Maximum call stack size exceeded |

Test sources can be found in the folder [perf](https://github.com/Riim/cellx/tree/master/perf).
Density of connections in real applications is usually lower than in the present test, that is,
if a certain delay in the test is visible in 100 calculated cells (25 layers), in a real application,
this delay will either be visible in the greater number of cells, or cells formulas will include
some complex calculations (e.g., computation of one array from other).

## Usage

Cells can be stored in the variables:

```js
let num = cellx(1);
let plusOne = cellx(() => num() + 1);

console.log(plusOne());
// => 2
```

or in the callable properties:

```js
function User(name) {
    this.name = cellx(name);
    this.nameInitial = cellx(() => this.name().charAt(0).toUpperCase());
}

let user = new User('Matroskin');

console.log(user.nameInitial());
// => 'M'
```

or in simple properties:

```js
function User(name) {
    cellx.define(this, {
        name: name,
        nameInitial: function() { return this.name.charAt(0).toUpperCase(); }
    });
}

let user = new User('Matroskin');

console.log(user.nameInitial);
// => 'M'
```

### Usage with ES.Next

Use npm module [cellx-decorators](https://www.npmjs.com/package/cellx-decorators).

### Usage with React

Use npm module [cellx-react](https://www.npmjs.com/package/cellx-react).

### More modules for cellx

* [cellx-indexed-collections](https://www.npmjs.com/package/cellx-indexed-collections)
* [Rionite](https://www.npmjs.com/package/rionite)

### Options

When you create a cell, you can pass some options:

#### get

Additional processing of value during reading:

```js
// array that you can't mess up accidentally, the messed up thing will be a copy
let arr = cellx([1, 2, 3], {
    get: arr => arr.slice()
});

console.log(arr()[0]);
// => 1

arr()[0] = 5;

console.log(arr()[0]);
// => 1
```

#### put

Used to create recordable calculated cells:

```js
function User() {
    this.firstName = cellx('');
    this.lastName = cellx('');

    this.fullName = cellx(
		() => (this.firstName() + ' ' + this.lastName()).trim(),
		{
			put: name => {
				name = name.split(' ');

				this.firstName(name[0]);
				this.lastName(name[1]);
			}
		}
	);
}

let user = new User();

user.fullName('Matroskin Cat');

console.log(user.firstName());
// => 'Matroskin'
console.log(user.lastName());
// => 'Cat'
```

#### validate

Validates the value during recording and calculating.

Validation during recording into the cell:

```js
let num = cellx(5, {
    validate: value => {
        if (typeof value != 'number') {
            throw new TypeError('Oops!');
        }
    }
});

try {
    num('I string');
} catch (err) {
    console.log(err.message);
    // => 'Oops!'
}

console.log(num());
// => 5
```

Validation during the calculation of the cell:

```js
let value = cellx(5);

let num = cellx(() => value(), {
    validate: value => {
        if (typeof value != 'number') {
            throw new TypeError('Oops!');
        }
    }
});

num.subscribe(err => {
    console.log(err.message);
});

value('I string');
// => 'Oops!'

console.log(value());
// => 'I string'

console.log(num());
// => 5
```

### Methods

#### onChange

Adds a change listener:

```js
let num = cellx(5);

num.onChange(evt => {
    console.log(evt);
});

num(10);
// => { prevValue: 5, value: 10 }
```

#### offChange

Removes previously added change listener.

#### onError

Adds a error listener:

```js
let value = cellx(1);

let num = cellx(() => value(), {
    validate: v => {
        if (v > 1) {
            throw new RangeError('Oops!');
        }
    }
});

num.onError(evt => {
    console.log(evt.error.message);
});

value(2);
// => 'Oops!'
```

#### offError

Removes previously added error listener.

#### subscribe

Subscribes to the events `change` and `error`. First argument comes into handler is an error object, second — an event.

```js
user.fullName.subscribe((err, evt) => {
    if (err) {
        //
    } else {
        //
    }
});
```

#### unsubscribe

Unsubscribes from events `change` and `error`.

#### Subscription to the properties created with help `cellx.define`

Subscribe to changes in the properties created with help of `cellx.define` possible through `EventEmitter`:

```js
class User extends cellx.EventEmitter {
    constructor(name) {
        cellx.define(this, {
            name,
            nameInitial: function() { return this.name.charAt(0).toUpperCase(); }
        });
    }
}

let user = new User('Matroskin');

user.on('change:nameInitial', evt => {
    console.log('nameInitial: ' + evt.value);
});

console.log(user.nameInitial);
// => 'M'

user.name = 'Sharik';
// => 'nameInitial: S'
```

#### dispose

In many reactivity engines calculated cell (atom, observable-property) should be seen
as a normal event handler for other cells, that is, for "killing" the cell it is not enough to simply remove
all handlers from it and lose the link to it, it is also necessary to decouple it from its dependencies.
Calculated cells in cellx constantly monitor the presence of handlers for themselves and all their descendants,
and in cases of their (handlers) absence went to the passive updates mode, i.e. unsubscribe themselves from their
dependencies and are evaluated immediately upon reading. Thus, to "kill" of the cell you just calculated
remove from it all handlers added before and forget the link to it; you do not need to think about the other cells,
from which it is calculated or which are calculated from it. After this, garbage collector will clean everything.

You can call the `dispose`, just in case:

```js
user.name.dispose();
```

This will remove all the handlers, not only from the cell itself, but also from all cells calculated from it,
and in the absence of links all branch of dependencies will "die".

## Dynamic actualisation of dependencies

Calculated cell formula can be written so that a set of dependencies may change over time. For example:

```js
let user = {
    firstName: cellx(''),
    lastName: cellx(''),

    name: cellx(() => {
        return this.firstName() || this.lastName();
    })
};
```

There, while `firstName` is still empty string, cell `name` is signed for `firstName` and `lastName`,
and change in any of them will lead to the change in its value. If you assign to the `firstName` some not empty
string, then during recalculation of value `name` it simply will not come to reading `lastName` in the formula,
i.e. the value of the cell `name` from this moment will not depend on `lastName`.
In such cases, cells automatically unsubscribe from dependencies insignificant for them and are not recalculated
when they change. In the future, if the `firstName` again become an empty string, the cell `name` will re-subscribe
to the `lastName`.

## Synchronization of value with synchronous storage

```js
let foo = cellx(() => localStorage.foo || 'foo', {
	put: function(cell, value) {
		localStorage.foo = value;
		cell.push(value);
	}
});

let foobar = cellx(() => foo() + 'bar');

console.log(foobar()); // => 'foobar'
console.log(localStorage.foo); // => undefined
foo('FOO');
console.log(foobar()); // => 'FOObar'
console.log(localStorage.foo); // => 'FOO'
```

## Synchronization of value with asynchronous storage

```js
let request = (() => {
	let value = 1;

	return {
		get: url => new Promise((resolve, reject) => {
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

                resolve({
                    ok: true
                });
            }, 1000);
        })
	};
})();

let foo = cellx(function(cell, next = 0) {
	request.get('http://...').then((res) => {
		if (res.ok) {
			cell.push(res.value);
		} else {
			cell.fail(res.error);
		}
	});

	return next;
}, {
	put: (value, cell, next) => {
		request.put('http://...', { value: value }).then(res => {
			if (res.ok) {
				cell.push(value);
			} else {
				cell.fail(res.error);
			}
		});
	}
});

foo.subscribe(() => {
	console.log('New foo value: ' + foo());
	foo(5);
});

console.log(foo());
// => 0

foo('then', () => {
    console.log(foo());
});
// => 'New foo value: 1'
// => 1
// => 'New foo value: 5'
```

## List of references

- [Building a Reactive App Using Cellx and React](https://60devs.com/building-a-reactive-todo-app-using-cellx-and-react.html)
- [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/)
- [Knockout — Simplify dynamic JavaScript UIs with the Model-View-View Model (MVVM) pattern](http://knockoutjs.com/)
