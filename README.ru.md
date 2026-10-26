<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

cellx — это высокопроизводительная библиотека для реализации реактивности в JavaScript и TypeScript, обеспечивающая минимальные накладные расходы и максимальную эффективность вычислений.

## Установка

```
npm i cellx
```

## Пример использования

```typescript
const firstName$ = cellx('Матроскин');
const lastName$ = cellx('Кот');

const fullName$ = cellx(() => firstName$.value + ' ' + lastName$.value);

fullName$.onChange(() => {
    console.log('fullName:', fullName$.value);
});

console.log(fullName$.value);
// => 'Матроскин Кот'

firstName$.value = 'Шарик';
lastName$.value = 'Пёс';
// => 'fullName: Шарик Пёс'
```

Несмотря на то, что изменились две зависимости ячейки `fullName$`, обработчик её изменения сработал только один раз. Важной особенностью cellx-а является то, что он старается максимально избавиться как от лишних вызовов обработчиков изменений, так и от лишних вызовов расчётных формул вычисляемых ячеек. В сочетании с ещё некоторыми оптимизациями это обеспечивает высокую скорость расчёта сложнейших сеток зависимостей.  
Больше об этом можно узнать в статье [Big State Managers Benchmark](https://habr.com/ru/articles/707600/).  
Также вам может быть интересна статья [Разбираемся в сортах реактивности](https://habr.com/ru/companies/timeweb/articles/586450/).

## Динамическая актуализация зависимостей

Формула вычисляемой ячейки может быть написана так, что набор зависимостей может со временем меняться. Например:

```typescript
const user = {
    firstName$: cellx(),
    lastName$: cellx(),

    displayName$: cellx(() => user.firstName$.value ?? user.lastName$.value)
};
```

Когда значение `firstName$` равно `null` или `undefined`, при вычислении `displayName$` читаются обе ячейки: `firstName$` и `lastName$`. Если задать `firstName$` значение, отличное от `null` и `undefined`, при следующем вычислении `lastName$` уже не будет прочитана и перестанет быть зависимостью `displayName$`. cellx автоматически исключает зависимости, которые больше не читаются, поэтому их изменения не вызывают перевычисление. Если `firstName$` снова получит значение `null` или `undefined`, `lastName$` вновь станет зависимостью.

## Использование

### Метод Cell#onChange()

Добавляет обработчик изменения.

```typescript
const num$ = cellx(5);

const dispose = num$.onChange((value) => {
    console.log(value);
});

num$.value = 10;
// => 10

dispose(); // Снять обработчик изменения.
```

### Метод Cell#onError()

Добавляет обработчик ошибок.

```typescript
const name$ = cellx('Матроскин');
const upperName$ = cellx(() => name$.value.toUpperCase());

const dispose = upperName$.onError((err) => {
    console.log(err.message);
});

name$.value = 5;
// => 'name$.value.toUpperCase is not a function'
```

### Метод Cell#disconnect()

Снимает собственные обработчики `change` и `error` ячейки и рекурсивно отключает
зависимые ячейки. Обработчики `observed` и `unobserved` сохраняются. Это не
окончательное уничтожение: ячейку можно использовать снова.

### Опция Cell[context]

Задаёт контекст выполнения для формулы ячейки и обработчиков.

```typescript
const context = 5;
const name$ = cellx('Матроскин');
const upperName$ = cellx(function () {
    console.log(this);
    // => 5

    return name$.value.toUpperCase();
}, { context });

upperName$.onChange(function () {
    console.log(this);
    // => 5
});

name$.value = 'Шарик';
```

### effect()

Сразу запускает функцию, отслеживает прочитанные ею ячейки и повторно запускает её при изменении этих зависимостей.

```typescript
const firstName$ = cellx('Матроскин');
const lastName$ = cellx('Кот');

const dispose = effect(() => {
    console.log(firstName$.value + ' ' + lastName$.value);
});
// => 'Матроскин Кот'

lastName$.value = 'Пёс';
release();
// => 'Матроскин Пёс'

dispose();
```

### reaction()

Регистрирует функцию для обработки изменения ячейки.

```typescript
const name$ = cellx('Матроскин');

const dispose = reaction(name$, (name) => {
    console.log(name);
});

// или

const dispose = reaction(() => name$.value, (name) => {
    console.log(name);
});
```

### Опция Cell[dependencyFilter]

Устанавливает функцию для фильтрации найденных зависимостей.  
По умолчанию отслеживаются все чтения вне `untracked()`.

```typescript
const TRACKED = Symbol('tracked');
const firstName$ = cellx('Матроскин');
const lastName$ = cellx('Кот');

firstName$[TRACKED] = true;

const fullName$ = cellx(() => firstName$.value + ' ' + lastName$.value, {
    dependencyFilter: (cell) => cell[TRACKED]
});

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Пёс';
// Ничего не выводится!

console.log(fullName$.value);
// => 'Матроскин Кот'
// fullName$ не пересчиталась, так как lastName$ не отслеживается как его зависимость.

firstName$.value = 'Шарик';
// => 'Шарик Пёс'
```

### untracked()

Запускает фрагмент кода в котором прочитанные ячейки не определяются как зависимости.

```typescript
const firstName$ = cellx('Матроскин');
const lastName$ = cellx('Кот');
const fullName$ = cellx(() => firstName$.value + ' ' + untracked(() => lastName$.value));

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Пёс';
// Ничего не выводится!

console.log(fullName$.value);
// => 'Матроскин Кот'
// fullName$ не пересчиталась, так как lastName$ не отслеживается как его зависимость.

firstName$.value = 'Шарик';
// => 'Шарик Пёс'
```

### tracked()

Запускает фрагмент кода в котором прочитанные ячейки определяются как зависимости.  Используется с `DependencyFilter.onlyTracked` в опции `Cell[dependencyFilter]`.

```typescript
const firstName$ = cellx('Матроскин');
const lastName$ = cellx('Кот');
const fullName$ = cellx(() => tracked(() => firstName$.value) + ' ' + lastName$.value, {
    dependencyFilter: DependencyFilter.onlyTracked
});

fullName$.onChange(() => {
    console.log(fullName$.value);
});

lastName$.value = 'Пёс';
// Ничего не выводится!

console.log(fullName$.value);
// => 'Матроскин Кот'
// fullName$ не пересчиталась, так как lastName$ не отслеживается как его зависимость.

firstName$.value = 'Шарик';
// => 'Шарик Пёс'
```

### Опция Cell[assertValue]

Проверяет пользовательский ввод на двух границах: начальное значение, переданное
конструктору, и значение, переданное в `set()` (в том числе присваиванием через
`.value`).

У вычисляемой ячейки проверяется явно заданное начальное значение (`options.value`).
Если начального значения нет, при создании проверка пропускается. У обычной ячейки
начальное значение проверяется, даже если оно равно `undefined`.

Валидация при записи в ячейку:

```typescript
const num$ = cellx(5, {
    assertValue: (value) => {
        if (typeof value !== 'number') {
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

### Опция Cell[put]

Может использоваться для обработки значения при записи и перенаправления записи.

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

user.fullName$.value = 'Матроскин Кот';

console.log(user.firstName$.value);
// => 'Матроскин'
console.log(user.lastName$.value);
// => 'Кот'
```

Например, можно синхронизировать значение ячейки с localStorage:

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

Или с хранящимся на сервере значением:

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

### Опция Cell[async]

По умолчанию Promise, возвращённый формулой ячейки, считается обычным значением. Укажите `async: true`, чтобы ячейка ожидала Promise и публиковала результат его выполнения. Во время ожидания ячейка содержит `WaitError`.

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
