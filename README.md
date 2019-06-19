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
        return (this.firstName() + ' ' + this.lastName()).trim();
    })
};

user.fullName('subscribe', function() {
    console.log('fullName: ' + this.fullName());
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
    this.nameInitial = cellx(function() { return this.name().charAt(0).toUpperCase(); });
}

let user = new User('Matroskin');

console.log(user.nameInitial());
// => 'M'
```

including in the prototype:

```js
function User(name) {
    this.name(name);
}
User.prototype.name = cellx();
User.prototype.friends = cellx(() => []); // each instance of the user will get its own instance of the array

let user1 = new User('Matroskin');
let user2 = new User('Sharik');

console.log(user1.friends() == user2.friends());
// => false
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

    this.fullName = cellx(function() {
        return (this.firstName() + ' ' + this.lastName()).trim();
    }, {
        put: function(name) {
            name = name.split(' ');

            this.firstName(name[0]);
            this.lastName(name[1]);
        }
    });
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

num('subscribe', err => {
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

Calling the cell method is somewhat unusual — the cell itself is called, the first argument passes the method name,
rest ones — the arguments. In this case, there must be at least one argument, or call of the cell will be counted as its
recording. If the method has no arguments, you need to transfer an additional `undefined` with a call or to shorten it
just `0` (see `dispose`).

#### addChangeListener

Adds a change listener:

```js
let num = cellx(5);

num('addChangeListener', evt => {
    console.log(evt);
});

num(10);
// => { prevValue: 5, value: 10 }
```

#### removeChangeListener

Removes previously added change listener.

#### addErrorListener

Adds a error listener:

```js
let value = cellx(1);

let num = cellx(() => value(), {
    validate: v => {
        if (v > 1) {
            throw new TypeError('Oops!');
        }
    }
});

num('addErrorListener', evt => {
    console.log(evt.error.message);
});

value(2);
// => 'Oops!'
```

#### removeErrorListener

Removes previously added error listener.

#### subscribe

Subscribes to the events `change` and `error`. First argument comes into handler is an error object, second — an event.

```js
user.fullName('subscribe', (err, evt) => {
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

#### dispose or how to kill the cell

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
user.name('dispose', 0);
```

This will remove all the handlers, not only from the cell itself, but also from all cells calculated from it,
and in the absence of links all branch of dependencies will "die".

## Collapse and discarding of events

To minimize redraw of UI cellx may "collapse" several events into one. Link to the previous event is stored in
`evt.prevEvent`:

```js
let num = cellx(5);

num('addChangeListener', evt => {
    console.log(evt);
});

num(10);
num(15);
num(20);
// => {
//     prevEvent: {
//         prevEvent: {
//             prevEvent: null
//             prevValue: 5,
//             value: 10
//         }
//         prevValue: 10,
//         value: 15
//     }
//     prevValue: 15,
//     value: 20
// }
```

In cases when the cell comes to the initial value before generation of event, it does not generate it at all:

```js
let num = cellx(5);

num('addChangeListener', evt => {
    console.log(evt);
});

num(10);
num(15);
num(5); // return the original value
// but there's nothing here
```

Upon changing the number of the calculated cell dependencies, it is evaluated only once and creates only one event:

```js
let inited = false;
let num1 = cellx(5);
let num2 = cellx(10);
let sum = cellx(() => {
    if (inited) {
        console.log('sum.formula');
    }

    return num1() + num2();
});

sum('addChangeListener', evt => {
    console.log(evt);
});

inited = true;

num1(10);
num2(15);
// => 'sum.formula'
// => {
//     prevEvent: null
//     prevValue: 15,
//     value: 25
// }
```

## Dynamic actualisation of dependencies

Calculated cell formula can be written so that a set of dependencies may change over time. For example:

```js
let user = {
    firstName: cellx(''),
    lastName: cellx(''),

    name: cellx(function() {
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
	put: function(value) {
		localStorage.foo = value;
		this.push(value);
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

foo('subscribe', () => {
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

## Collections

If you record to the cell an instance of class which inherits of `cellx.EventEmitter`,
then the cell will subscribe to its `change` event and will claim it as own:

```js
let value = cellx(new cellx.EventEmitter());

value('subscribe', (err, evt) => {
    console.log(evt.target instanceof cellx.EventEmitter);
});

value().emit('change');
// => true
```

Due to this, you can create your collections, upon updating those collections you will update the cell containing them
and dependent cells will be recalculated. Two such collections already is added to the cellx:

### cellx.ObservableMap

The short syntax to create:

```js
let map = cellx.map({
    key1: 1,
    key2: 2,
    key3: 3
});
```

`cellx.ObservableMap` repeats
[Map](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map) from ECMAScript 2015,
except for the following differences:
- inherits of `cellx.EventEmitter` and generates an event `change` when changing their records;
- has a method `contains`, which let you know whether or not the value is contained in the map,
without going over all of its values;
- has a method `clone`, which creates a copy of map;
- data on initialization can be not only an array but also in the form of an object (in this case,
only strings will be counted as keys, and the key difference between object and Map is in
the fact that the keys in the Map can be of any type) or another map.

### cellx.ObservableList

Short creation syntax:

```js
let list = cellx.list([1, 2, 3]);
```

Like `cellx.ObservableMap`, list generates an event `change` upon any change of its records.

During initialization the list may take option `comparator`, which will implement the assortment of its values:

```js
let list = cellx.list([
    { x: 5 },
    { x: 1 },
    { x: 10 }
], {
    comparator: (a, b) => {
        if (a.x < b.x) { return -1; }
        if (a.x > b.x) { return 1; }
        return 0;
    }
});

console.log(list.toArray());
// => [{ x: 1 }, { x: 5 }, { x: 10 }]

list.addRange([{ x: 100 }, { x: -100 }, { x: 7 }]);

console.log(list.toArray());
// => [{ x: -100 }, { x: 1 }, { x: 5 }, { x: 7 }, { x: 10 }, { x: 100 }]
```

If instead of `comparator` you pass the option `sorted` with the value `true`, it will use the standard `comparator`:

```js
let list = cellx.list([5, 1, 10], { sorted: true });

console.log(list.toArray());
// => [1, 5, 10]

list.addRange([100, -100, 7]);

console.log(list.toArray());
// => [-100, 1, 5, 7, 10, 100]
```

#### Properties of cellx.ObservableList

##### length

Length of the list. Read-only.

##### comparator

Function for comparing values in the sorted list. Read-only.

##### sorted

Whether or not the list is sorted. Read-only.

#### Methods of cellx.ObservableList

Important difference between list and array is that the list can't contain so-called "holes"
that is, when it will try to read or set the value of the index beyond the existing range of elements,
an exception will be generated.
Range extension (adding of items) occurs through methods `add`, `addRange`, `insert` and `insertRange`.
In such case, in the last two methods passed `index` can not be longer than the length of the list.

Sorted list suggests that its values are always in sorted order. Methods
`set`, `setRange`, `insert` and `insertRange` are contrary to this statement, they either will break the correct order
of sorting or (for preservation of this order) will install/paste past the specified index, i.e.
will not work properly. Therefore, when you call the sorted list, they always generate an exception. It is possible to
add values to the sorted list through the methods `add` and `addRange`, or during initialization of the list.

##### contains

Type signature: `(value) -> boolean;`.

Checks if the value is in the list. In cases of a large amount of values in the list it may be significantly faster
than `list.indexOf(value) != -1`.

##### indexOf

Type signature: `(value, fromIndex?: int) -> int;`.

##### lastIndexOf

Type signature: `(value, fromIndex?: int) -> int;`.

##### get

Type signature: `(index: int) -> *;`.

##### getRange

Type signature: `(index: int, count?: uint) -> Array;`.

If `count` is unspecified it makes copies till the end of the list.

##### set

Type signature: `(index: int, value) -> cellx.ObservableList;`.

##### setRange

Type signature: `(index: int, values: Array) -> cellx.ObservableList;`.

##### add

Type signature: `(value, unique?: boolean) -> cellx.ObservableList;`.

##### addRange

Type signature: `(values: Array, unique?: boolean) -> cellx.ObservableList;`.

##### insert

Type signature: `(index: int, value) -> cellx.ObservableList;`.

##### insertRange

Type signature: `(index: int, values: Array) -> cellx.ObservableList;`.

##### remove

Type signature: `(value, fromIndex?: int) -> boolean;`.

Removes the first occurrence of `value` in the list.

##### removeAll

Type signature: `(value, fromIndex?: int) -> boolean;`.

It removes all occurrences of `value` list.

##### removeEach

Type signature: `(values: Array, fromIndex?: int) -> boolean;`.

##### removeAt

Type signature: `(index: int) -> *;`.

##### removeRange

Type signature: `(index: int, count?: uint) -> Array;`.

If `count` is unspecified it will remove everything till the end of the list.

##### clear

Type signature: `() -> cellx.ObservableList;`.

##### join

Type signature: `(separator?: string) -> string;`.

##### forEach

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList), context?);`.

##### map

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> *, context?) -> Array;`.

##### filter

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> Array;`.

##### find

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> *;`.

##### findIndex

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> int;`.

##### every

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> boolean;`.

##### some

Type signature: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> boolean;`.

##### reduce

Type signature: `(cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### reduceRight

Type signature: `(cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### clone

Type signature: `() -> cellx.ObservableList;`.

##### toArray

Type signature: `() -> Array;`.

##### toString

Type signature: `() -> string;`.

## List of references

- [Building a Reactive App Using Cellx and React](https://60devs.com/building-a-reactive-todo-app-using-cellx-and-react.html)
- [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/)
- [Knockout — Simplify dynamic JavaScript UIs with the Model-View-View Model (MVVM) pattern](http://knockoutjs.com/)
