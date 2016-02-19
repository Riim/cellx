<p align="right">
    <a href="https://github.com/Riim/cellx/blob/master/README.ru.md">Этот документ на русском</a>
</p>

<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

Ultra-fast implementation of reactivity for javascript.

[![NPM version](https://badge.fury.io/js/cellx.svg)](https://www.npmjs.com/package/cellx)
[![Dependency Status](https://david-dm.org/Riim/cellx/status.svg)](https://david-dm.org/Riim/cellx#info=dependencies)
[![Dev Dependency Status](https://david-dm.org/Riim/cellx/dev-status.svg)](https://david-dm.org/Riim/cellx#info=devDependencies)
[![License](https://img.shields.io/npm/l/cellx.svg)](https://www.npmjs.com/package/cellx)

## Installation

You can currently install the package as a npm package or bower component.

### NPM

The following command installs cellx as a npm package:
```
npm install cellx --save
```

### Bower

The following command installs cellx as a bower component that can be used in the browser:
```
bower install cellx --save
```

## Browser support

cellx supports IE9 and above and all modern browsers.

## Example

```js
var user = {
    firstName: cellx('Matroskin'),
    lastName: cellx('Cat'),

    fullName: cellx(function() {
        return this.firstName() + ' ' + this.lastName();
    })
};

user.fullName('subscribe', function() {
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
One test, which is used for measuring the performance, generates grid with multiply "layers"
each of which is composed of 4 cells. Cells are calculated from the previous layer of cells (except the first one,
which contains initial values) by the formula A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. After that start time is stored,
values of all first layer cells are changed and time needed to update all last layer cells is measured.
Test results (in milliseconds) for different number of layers (for Google Chrome 47.0.2526.73 (64-bit)):

| Number of computed layers ↓ \ Library → | cellx | VanillaJS (naive) | [Knockout](http://knockoutjs.com/) | [jin-atom](https://github.com/nin-jin/pms-jin/) | [Warp9](http://rystsov.info/warp9/)         | [Reactor.js](https://github.com/fynyky/reactor.js) | [Reactive.js](https://github.com/mattbaker/Reactive.js) | [Kefir.js](https://rpominov.github.io/kefir/) |
|-----------------------------------------|-------|-------------------|------------------------------------|-------------------------------------------------|---------------------------------------------|----------------------------------------------------|---------------------------------------------------------|-----------------------------------------------|
| 10                                      | 1     | 1                 | 5                                  | 1                                               | 2                                           | 1                                                  | 1                                                       | 15                                            |
| 20                                      | 1     | 15                | 350                                | 1                                               | 3                                           | 1                                                  | 1                                                       | 1360                                          |
| 30                                      | 1     | 1940              | 42500                              | 1                                               | 4                                           | 1                                                  | 1                                                       | 170000                                        |
| 50                                      | 1     | >300000           | >300000                            | 1                                               | 5                                           | 1                                                  | 1                                                       | >300000                                       |
| 100                                     | 1     | >300000           | >300000                            | 2                                               | 8                                           | 2                                                  | 3                                                       | >300000                                       |
| 1000                                    | 5     | >300000           | >300000                            | 20                                              | 90                                          | 15                                                 | 80                                                      | >300000                                       |
| 5000                                    | 25    | >300000           | >300000                            | 340                                             | first call — 460, subsequent calls — >460   | 120                                                | RangeError: Maximum call stack size exceeded            | >300000                                       |
| 25000                                   | 120   | >300000           | >300000                            | 7000                                            | first call — 3200, subsequent calls — >3200 | 700                                                | RangeError: Maximum call stack size exceeded            | >300000                                       |

Test sources can be found in the folder [perf](https://github.com/Riim/cellx/tree/master/perf).  
Density of connections in real applications is usually lower than in the present test, that is,
if a certain delay in the test is visible in 100 calculated cells (25 layers), in a real application,
this delay will either be visible in the greater number of cells, or cells formulas will include
some complex calculations (e.g., computation of one array from other).

## Usage

Cells can be stored in the variables:

```js
var num = cellx(1);
var plusOne = cellx(function() { return num() + 1; });

console.log(plusOne());
// => 2
```

or in the property:

```js
function User(name) {
    this.name = cellx(name);
    this.upperName = cellx(function() { return this.name().toUpperCase(); });
}

var user = new User('Matroskin');

console.log(user.upperName());
// => 'MATROSKIN'
```

### Options

When you create a cell, you can pass some options:

#### get

Additional processing of value during reading:

```js
// array that you can't mess up accidentally, the messed up thing will be a copy
var arr = cellx([1, 2, 3], {
    get: function(arr) { return arr.slice(); }
});

console.log(arr()[0]);
// => 1

arr()[0] = 5;

console.log(arr()[0]);
// => 1
```

#### set

Used to create recordable calculated cells:

```js
function User() {
    this.firstName = cellx('');
    this.lastName = cellx('');

    this.fullName = cellx(function() {
        return (this.firstName() + ' ' + this.lastName()).trim();
    }, {
        set: function(name) {
            name = name.split(' ');

            this.firstName(name[0]);
            this.lastName(name[1]);
        }
    });
}

var user = new User();

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
var num = cellx(5, {
    validate: function(value) {
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
var value = cellx(5);

var num = cellx(function() {
    return value();
}, {
    validate: function(value) {
        if (typeof value != 'number') {
            throw new TypeError('Oops!');
        }
    }
});

num('subscribe', function(err) {
    console.log(err.message);
});

value('I string');
// => 'Oops!'

console.log(value());
// => 'I string'

console.log(num());
// => 5
```

#### computed

By default, if the first argument of cell-a is a normal function, the cell is defined as a calculated and passed
function is used as a formula to calculate the value of the cell. But if you need to create cell with a function
as a value, you can either set a value after the initialization of the cell or pass the option `computed`
with the value `false`:

```js
var value = cellx(Number, { computed: false });
```

And vice versa, functions may be instances of some custom type and for their detection they usually get
the property `constructor` (ECMAScript 6 will allow to change the behavior of `instanceof` using `Symbol.hasInstance`).
Functions redefined as `constructor` are counted as usual values by default.
Cellx instances are like this:

```js
var num = cellx(5);

console.log(
    typeof num == 'function',
    num.constructor == cellx,
    num.constructor == Function
);
// => true true false
```

as a result, you can put one cell inside another:

```js
var num = cellx(5);
var container = cellx(num);

console.log(container()());
// => 5
```

If the custom function still has to be counted as a formula for the calculated cell, you need to pass
option `computed` with a value `true`:

```js
function FormulaSum(a, b) {
    var formula = function() {
        return a() + b();
    };

    formula.constructor = FormulaSum;

    return formula;
}

var a = cellx(5);
var b = cellx(10);
var sum = cellx(new FormulaSum(a, b), { computed: true });

console.log(sum());
// => 15
```

### Methods

Calling the cell method is somewhat unusual — the cell itself is called, the first argument passes the method name,
rest ones — the arguments. In this case, there must be at least one argument, or call of the cell will be counted as its
recording. If the method has no arguments, you need to transfer an additional `void 0` with a call or to shorten it
just `0` (see `dispose`).

#### addChangeListener

Adds a change listener:

```js
var num = cellx(5);

num('addChangeListener', function(evt) {
    console.log(evt);
});

num(10);
// => { oldValue: 5, value: 10 }
```

#### removeChangeListener

Removes previously added change listener.

#### addErrorListener

Adds a error listener:

```js
var value = cellx(1);

var num = cellx(function() { return value(); }, {
    validate: function(v) {
        if (v > 1) {
            throw new TypeError('Oops!');
        }
    }
});

num('addErrorListener', function(evt) {
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
user.fullName('subscribe', function(err, evt) {
    if (err) {
        //
    } else {
        //
    }
});
```

#### unsubscribe

Unsubscribes from events `change` and `error`.

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

### Use with ECMAScript 6

```js
import { cellx, d } from 'cellx';

class User extends cellx.EventEmitter {
	@d.observable firstName = '';
	@d.observable lastName = '';

	@d.computed fullName = function() {
		return (this.firstName + ' ' + this.lastName).trim();
	};

	constructor(data) {
        super();

        for (let name in data) {
            this[name] = data[name];
        }
	}
}

let user = new User({ firstName: 'Matroskin', lastName: 'Cat' });

// add listener
user.on('change:fullName', function() {
    console.log(`fullName: ${this.fullName}`);
});

console.log(user.firstName);
// => 'Matroskin'

user.firstName = 'Sharik';
user.lastName = 'Dog';
// => 'fullName: Sharik Dog'
```

### Use with React

Use npm module [react-bind-observables](https://github.com/Riim/react-bind-observables).

## Collapse and discarding of events

To minimize redraw of UI cellx may "collapse" several events into one. Link to the previous event is stored in
`evt.prev`:

```js
var num = cellx(5);

num('addChangeListener', function(evt) {
    console.log(evt);
});

num(10);
num(15);
num(20);
// => {
//     oldValue: 15,
//     value: 20,
//     prev: {
//         oldValue: 10,
//         value: 15,
//         prev: {
//             oldValue: 5,
//             value: 10,
//             prev: null
//         }
//     }
// }
```

In cases when the cell comes to the initial value before generation of event, it does not generate it at all:

```js
var num = cellx(5);

num('addChangeListener', function(evt) {
    console.log(evt);
});

num(10);
num(15);
num(5); // return the original value
// but there's nothing here
```

Upon changing the number of the calculated cell dependencies, it is evaluated only once and creates only one event:

```js
var inited = false;
var num1 = cellx(5);
var num2 = cellx(10);
var sum = cellx(function() {
    if (inited) {
        console.log('sum.formula');
    }
    return num1() + num2();
});

sum('addChangeListener', function(evt) {
    console.log(evt);
});

inited = true;

num1(10);
num2(15);
// => 'sum.formula'
// => {
//     oldValue: 15,
//     value: 25,
//     prev: null
// }
```

## Dynamic actualisation of dependencies

Calculated cell formula can be written so that a set of dependencies may change over time. For example:

```js
var user = {
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

## Collections

If you record to the cell an instance of class which inherits of `cellx.EventEmitter`,
then the cell will subscribe to its `change` event and will claim it as own:

```js
var value = cellx(new cellx.EventEmitter());

value('subscribe', function(err, evt) {
    console.log(evt.ok);
});

value().emit({ type: 'change', ok: true });
// => true
```

Due to this, you can create your collections, upon updating those collections you will update the cell containing them
and dependent cells will be recalculated. Two such collections already is added to the cellx:

### cellx.ObservableMap

The short syntax to create:

```js
var map = cellx.map({
    key1: 1,
    key2: 2,
    key3: 3
});
```

`cellx.ObservableMap` repeats
[Map](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map) from ecmascript 6,
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
var list = cellx.list([1, 2, 3]);
```

Like `cellx.ObservableMap`, list generates an event `change` upon any change of its records.

During initialization the list may take option `comparator`, which will implement the assortment of its values:

```js
var list = cellx.list([
    { x: 5 },
    { x: 1 },
    { x: 10 }
], {
    comparator: function(a, b) {
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
var list = cellx.list([5, 1, 10], { sorted: true });

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

Type signature: `(index?: int, count?: uint) -> Array;`.

If `count` is unspecified it makes copies till the end of the list.

##### set

Type signature: `(index: int, value) -> cellx.ObservableList;`.

##### setRange

Type signature: `(index: int, items: Array) -> cellx.ObservableList;`.

##### add

Type signature: `(item) -> cellx.ObservableList;`.

##### addRange

Type signature: `(items: Array) -> cellx.ObservableList;`.

##### insert

Type signature: `(index: int, item) -> cellx.ObservableList;`.

##### insertRange

Type signature: `(index: int, items: Array) -> cellx.ObservableList;`.

##### remove

Type signature: `(item, fromIndex?: int) -> cellx.ObservableList;`.

Removes the first occurrence of `item` in the list.

##### removeAll

Type signature: `(item, fromIndex?: int) -> cellx.ObservableList;`.

It removes all occurrences of `item` list.

##### removeAt

Type signature: `(index: int) -> cellx.ObservableList;`.

##### removeRange

Type signature: `(index?: int, count?: uint) -> cellx.ObservableList;`.

If `count` is unspecified it will remove everything till the end of the list.

##### clear

Type signature: `() -> cellx.ObservableList;`.

##### join

Type signature: `(separator?: string) -> string;`.

##### forEach

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList), context?);`.

##### map

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> *, context?) -> Array;`.

##### filter

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> Array;`.

##### find

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> *;`.

##### findIndex

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> int;`.

##### every

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> boolean;`.

##### some

Type signature: `(cb: (item, index: uint, arr: cellx.ObservableList) -> boolean|undefined, context?) -> boolean;`.

##### reduce

Type signature: `(cb: (accumulator, item, index: uint, arr: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### reduceRight

Type signature: `(cb: (accumulator, item, index: uint, arr: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### clone

Type signature: `() -> cellx.ObservableList;`.

##### toArray

Type signature: `() -> Array;`.

##### toString

Type signature: `() -> string;`.

## List of references

- [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/)
- [Warp9 — The next generation of reactive js libraries](http://rystsov.info/warp9/)
- [Knockout — Simplify dynamic JavaScript UIs with the Model-View-View Model (MVVM) pattern](http://knockoutjs.com/)
