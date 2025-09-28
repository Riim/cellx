<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

cellx is a high-performance library for implementing reactivity in JavaScript and TypeScript, providing minimal overhead and maximum computational efficiency.

## Installation

```
npm i cellx
```

## Usage example

```typescript
const firstName$ = cellx('Matroskin');
const lastName$ = cellx('Cat');

const fullName$ = cellx(() => firstName$.value + ' ' + lastName$.value);

fullName$.onChange(() => {
    console.log('fullName:', fullName$.value);
});

console.log(fullName$.value);
// => 'Matroskin Cat'

firstName$.value = 'Sharik';
lastName$.value = 'Dog';
// => 'fullName: Sharik Dog'
```

Even though two dependencies of the `fullName$` cell changed, its change handler fired only once. An important feature of cellx is that it strives to eliminate both unnecessary change handler calls and unnecessary calls to the calculation formulas of computed cells. Combined with some other optimizations, this ensures high speed in calculating complex dependency graphs.  
You can learn more about this in the article [Big State Managers Benchmark](https://habr.com/ru/articles/707600/).  
You might also be interested in the article [Разбираемся в сортах реактивности](https://habr.com/ru/companies/timeweb/articles/586450/).

## Dynamic dependency actualization

The formula of a computed cell can be written in such a way that the set of dependencies may change over time. For example:

```typescript
const user = {
    firstName$: cellx(),
    lastName$: cellx(),

    displayName$: cellx(() => user.firstName$.value ?? user.lastName$.value)
};
```

Here, while the value of `firstName$` is undefined, the `displayName$` cell is subscribed to both `firstName$` and `lastName$`, since changing either will cause its value to change. However, if we set the `firstName$` cell to some not-nullable value, then, when recalculating the value of `displayName$`, reading `lastName$` in the formula will no longer occur, meaning the value of the `displayName$` cell from this moment no longer depends on `lastName$`. In such cases, cells automatically unsubscribe from dependencies that are no longer significant to them and do not recalculate when those dependencies change. Later, if `firstName$` gets a nullable value again, the `displayName$` cell will resubscribe to `lastName$`.

## Usage

### Method Cell#onChange()

Adds a change handler.

```typescript
const num$ = cellx(5);

num$.onChange((evt) => {
    console.log(evt.data);
});

num$.value = 10;
// => { value: 10, prevValue: 5 }
```

### Method Cell#offChange()

Removes a previously added change handler.

### Method Cell#onError()

Adds an error handler.

```typescript
const name$ = cellx('Matroskin');
const upperName$ = cellx(() => name$.value.toUpperCase());

upperName$.onError((evt) => {
    console.log(evt.data.error.message);
});

name$.value = 5;
// => 'name$.value.toUpperCase is not a function'
```

### Method Cell#offError()

Removes a previously added error handler.

### Method Cell#subscribe()

Subscribes to `change` and `error` events. The handler receives the error object as the first argument and the event as the second.

```typescript
fullName$.subscribe((err, evt) => {
    if (err) {
        //
    } else {
        //
    }
});
```

### Method Cell#unsubscribe()

Unsubscribes from `change` and `error` events.

### define()

Makes object properties reactive.  
You can subscribe to such properties using `reaction()` and `autorun()` (see below).

```typescript
import { cellx, define } from 'cellx';

class User {
    name: string;
    upperName: string;

    constructor(name: string) {
        define(this, {
            name,
            upperName: cellx(() => this.name.toUpperCase())
        });
    }
}

const user = new User('Matroskin');

console.log(user.upperName);
// => 'MATROSKIN'
```

### Option Cell[context]

Sets the execution context for the cell formula and handlers.

```typescript
const context = 5;
const name$ = cellx('Matroskin');
const upperName$ = cellx(function () {
    console.log(this);
	// => 5

    return name$.value.toUpperCase();
}, { context });

upperName$.onChange(function () {
    console.log(this);
	// => 5
});

name$.value = 'Sharik';
```

### reaction()

Registers a function to handle cell changes.

```typescript
const name$ = cellx('Matroskin');

const dispose = reaction(name$, (name) => {
    console.log(name);
});

// or

const dispose = reaction(() => name$.value, (name) => {
    console.log(name);
});
```

### autorun()

Registers a function that will run every time anything it is watching changes. It also runs once when the autorun itself is created.

```typescript
const name$ = cellx('Matroskin');

const dispose = autorun(() => {
    console.log(name$.value);
});
```

### Option Cell[dependencyFilter]

Sets a function to filter found dependencies.  
By default, `DependencyFilter.allExpectUntracked` is used.

```typescript
const TRACKED = Symbol('tracked');
const firstName$ = cellx('Matroskin');
const lastName$ = cellx('Cat');

firstName$[TRACKED] = true;

const fullName$ = cellx(() => firstName$.value + ' ' + lastName$.value, {
    dependencyFilter: (cell) => cell[TRACKED]
});

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Dog';
// Nothing is logged!

console.log(fullName$.value);
// => 'Matroskin Cat'
// Recalculation of fullName$ did not occur because lastName$ was not identified as its dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### untracked()

Runs a code block where read cells are not identified as dependencies.

```typescript
const firstName$ = cellx('Matroskin');
const lastName$ = cellx('Cat');
const fullName$ = cellx(() => firstName$.value + ' ' + untracked(() => lastName$.value));

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Dog';
// Nothing is logged!

console.log(fullName$.value);
// => 'Matroskin Cat'
// Recalculation of fullName$ did not occur because lastName$ was not identified as its dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### tracked()

Runs a code block where read cells are identified as dependencies.  
Used in combination with the `Cell[dependencyFilter]` option.

```typescript
const firstName$ = cellx('Matroskin');
const lastName$ = cellx('Cat');
const fullName$ = cellx(() => tracked(() => firstName$.value) + ' ' + lastName$.value, {
    dependencyFilter: DependencyFilter.onlyTracked
});

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Dog';
// Nothing is logged!

console.log(fullName$.value);
// => 'Matroskin Cat'
// Recalculation of fullName$ did not occur because lastName$ was not identified as its dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### Option Cell[meta]

Any additional information for the cell.

```typescript
const name$ = cellx('Matroskin', {
    meta: { id: 'name' }
});

console.log(name$.meta.id);
// => 'name'
```

### Option Cell[validate]

Validates the value on write and calculation.

Validation on writing to a cell:

```typescript
const num$ = cellx(5, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Must be a number');
        }
    }
});

try {
    num$.value = 'строка';
} catch (err) {
    console.log(err.message);
    // => 'Must be a number'
}

console.log(num$.value);
// => 5
```

Validation on cell calculation:

```typescript
const someValue$ = cellx(5);

const num$ = cellx(() => someValue$.value, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Must be a number');
        }
    }
});

num$.onError((err) => {
    console.log(err.message);
});

someValue$.value = 'строка';
// => 'Must be a number'

console.log(someValue$.value);
// => 'строка'
console.log(num$.value);
// => 5
```

### Option Cell[put]

Can be used to process the value on write and redirect the write operation.

```typescript
class User {
    firstName$ = cellx('');
    lastName$ = cellx('');

    fullName$ = cellx(
        () => (this.firstName$.value + ' ' + this.lastName$.value).trim(),
        {
            put: (nextValue) => {
				[this.firstName$.value, this.lastName$.value] = nextValue.split(' ');
            }
        }
    );
}

const user = new User();

user.fullName$.value = 'Matroskin Cat';

console.log(user.firstName$.value);
// => 'Matroskin'
console.log(user.lastName$.value);
// => 'Cat'
```

For example, you can synchronize a cell's value with localStorage:

```typescript
const foo$ = cellx(() => localStorage.getItem('foo') ?? 'default', {
    put: ({ push }, nextValue) => {
        localStorage.setItem('foo', nextValue);

        push(nextValue);
    }
});

const foobar$ = cellx(() => foo$.value + '_bar');

console.log(localStorage.getItem('foo')); // => null
console.log(foobar$.value); // => 'default_bar'

foo$.value = 'foo';

console.log(localStorage.getItem('foo')); // => 'foo'
console.log(foobar$.value); // => 'foo_bar'
```

Or with a value stored on the server:

```typescript
const foo$ = cellx(({ push, fail }) => {
    request.get('http://...').then((res) => {
        if (res.ok) {
            push(res.data.value);
        } else {
            fail(res.error);
        }
    });

    return 0;
}, {
    put: ({ push, fail }, nextValue) => {
        request.post('http://...', { value: nextValue }).then((res) => {
            if (res.ok) {
                push(nextValue);
            } else {
                fail(res.error);
            }
        });
    }
});

foo$.onChange(() => {
    console.log('foo$.value:', foo$.value);

    foo$.value = 5;
});

console.log(foo$.value);
// => 0

// => 'foo$.value: 1'
// => 'foo$.value: 5'
```
