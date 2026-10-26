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

Even though two dependencies of the `fullName$` cell changed, its change handler fired only once. A key feature of cellx is that it minimizes both unnecessary change handler calls and unnecessary evaluations of computed cells. Together with other optimizations, this makes updates efficient even in complex dependency graphs.  
You can learn more about this in the article [Big State Managers Benchmark](https://habr.com/ru/articles/707600/).  
You might also be interested in the article [Разбираемся в сортах реактивности](https://habr.com/ru/companies/timeweb/articles/586450/).

## Dynamic dependency tracking

The formula of a computed cell can be written in such a way that the set of dependencies may change over time. For example:

```typescript
const user = {
    firstName$: cellx(),
    lastName$: cellx(),

    displayName$: cellx(() => user.firstName$.value ?? user.lastName$.value)
};
```

When the value of `firstName$` is `null` or `undefined`, evaluating `displayName$` reads both `firstName$` and `lastName$`. If `firstName$` is set to a non-nullish value (anything other than `null` or `undefined`), the next evaluation no longer reads `lastName$`, so `displayName$` no longer depends on it. cellx automatically stops tracking dependencies that are no longer read, so changes to those cells no longer trigger recomputation. If `firstName$` later becomes `null` or `undefined` again, `lastName$` becomes a dependency again.

## Usage

### Method Cell#onChange()

Adds a change handler.

```typescript
const num$ = cellx(5);

const dispose = num$.onChange((value) => {
    console.log(value);
});

num$.value = 10;
// => 10

dispose(); // Remove the change handler.
```

### Method Cell#onError()

Adds an error handler.

```typescript
const name$ = cellx('Matroskin');
const upperName$ = cellx(() => name$.value.toUpperCase());

const dispose = upperName$.onError((err) => {
    console.log(err.message);
});

name$.value = 5;
// => 'name$.value.toUpperCase is not a function'
```

### Method Cell#disconnect()

Removes the cell's own `change` and `error` listeners and recursively disconnects
its dependents. It retains `observed` and `unobserved` handlers. This is not permanent disposal: the cell remains
reusable.

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

### effect()

Runs a function immediately, tracks the cells it reads, and reruns it when those dependencies change.

```typescript
const firstName$ = cellx('Matroskin');
const lastName$ = cellx('Cat');

const dispose = effect(() => {
    console.log(firstName$.value + ' ' + lastName$.value);
});
// => 'Matroskin Cat'

lastName$.value = 'Dog';
release();
// => 'Matroskin Dog'

dispose();
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

### Option Cell[dependencyFilter]

Sets a function to filter discovered dependencies. By default, all reads outside `untracked()` are tracked.

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
// fullName$ was not recomputed because lastName$ was not tracked as a dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### untracked()

Runs a function without tracking its cell reads as dependencies of the current computation.

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
// fullName$ was not recomputed because lastName$ was not tracked as a dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### tracked()

Runs a function that marks its cell reads for dependency tracking in the current computation. Use with `DependencyFilter.onlyTracked` in the `Cell[dependencyFilter]` option.

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
// fullName$ was not recomputed because lastName$ was not tracked as a dependency.

firstName$.value = 'Sharik';
// => 'Sharik Dog'
```

### Option Cell[assertValue]

Validates user input at two boundaries: the initial value passed to the constructor
and a value passed to `set()` (including assignment through `.value`).

For a computed cell, an explicit initial value (`options.value`) is validated. If
no initial value is provided, construction skips validation. For an ordinary cell,
the initial value is validated even when it is `undefined`.

Validating values written to a cell:

```typescript
const num$ = cellx(5, {
    assertValue: (value) => {
        if (typeof value !== 'number') {
            throw TypeError('Must be a number');
        }
    }
});

try {
    num$.value = 'a string';
} catch (err) {
    console.log(err.message);
    // => 'Must be a number'
}

console.log(num$.value);
// => 5
```

### Option Cell[put]

Handles writes to the cell, allowing you to transform the value or forward the write elsewhere.

```typescript
class User {
    firstName$ = cellx('');
    lastName$ = cellx('');

    fullName$ = cellx(
        () => (this.firstName$.value + ' ' + this.lastName$.value).trim(),
        {
            put: (_cell, nextValue) => {
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

### Option Cell[async]

By default, a Promise returned by a cell formula is treated as a regular value. Set `async: true` to make the cell wait for the Promise and publish its fulfilled value. While waiting, the cell contains a `WaitError`.

```typescript
const promise$ = cellx(() => Promise.resolve(42));
console.log(promise$.value instanceof Promise);
// => true

const value$ = cellx(() => Promise.resolve(42), { async: true });
console.log(value$.value);
// => undefined

await Promise.resolve();
console.log(value$.value);
// => 42
```
