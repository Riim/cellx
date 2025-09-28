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

Здесь пока значение `firstName$` неопределено, ячейка `displayName$` подписана и на `firstName$` и на `lastName$`, так как изменение любого из них приведёт к изменению её значения. Если же задать ячейке `firstName$` какое-то not-nullable значение, то, при перевычислении значения `displayName$`, чтение `lastName$` в формуле уже не произойдёт, то есть значение ячейки `displayName$` с этого момента уже никак не зависит от `lastName$`. В таких случаях ячейки автоматически отписываются от незначимых для них зависимостей и не перевычисляются при их изменении. В дальнейшем, если `firstName$` снова получит nullable значение, ячейка `displayName$` вновь подпишется на `lastName$`.

## Использование

### Метод Cell#onChange()

Добавляет обработчик изменения.

```typescript
const num$ = cellx(5);

num$.onChange((evt) => {
    console.log(evt.data);
});

num$.value = 10;
// => { value: 10, prevValue: 5 }
```

### Метод Cell#offChange()

Снимает ранее добавленный обработчик изменения.

### Метод Cell#onError()

Добавляет обработчик ошибок.

```typescript
const name$ = cellx('Матроскин');
const upperName$ = cellx(() => name$.value.toUpperCase());

upperName$.onError((evt) => {
    console.log(evt.data.error.message);
});

name$.value = 5;
// => 'name$.value.toUpperCase is not a function'
```

### Метод Cell#offError()

Снимает ранее добавленный обработчик ошибок.

### Метод Cell#subscribe()

Подписывает на события `change` и `error`. В обработчик первым аргументом приходит объект ошибки, вторым — событие.

```typescript
fullName$.subscribe((err, evt) => {
    if (err) {
        //
    } else {
        //
    }
});
```

### Метод Cell#unsubscribe()

Отписывает от событий `change` и `error`.

### define()

Делает свойства объекта реактивными.  
Подписаться на такие свойства можно используя `reaction()` и `autorun()` (см. далее).

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

const user = new User('Матроскин');

console.log(user.upperName);
// => 'MАТРОСКИН'
```

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

### autorun()

Регистрирует функцию, которая будет запускаться каждый раз, когда изменяется что-либо, за чем она наблюдает. Она также запускается один раз, когда создаётся сам автозапуск.

```typescript
const name$ = cellx('Матроскин');

const dispose = autorun(() => {
    console.log(name$.value);
});
```

### Опция Cell[dependencyFilter]

Устанавливает функцию для фильтрации найденных зависимостей.  
По умолчанию используется `DependencyFilter.allExpectUntracked`.

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
// Перевычисление fullName$ не произошло, тк. lastName$ не определилися как его записимость.

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
// Перевычисление fullName$ не произошло, тк. lastName$ не определилися как его записимость.

firstName$.value = 'Шарик';
// => 'Шарик Пёс'
```

### tracked()

Запускает фрагмент кода в котором прочитанные ячейки определяются как зависимости.  
Используется в сочетании с опцией `Cell[dependencyFilter]`.

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
// Перевычисление fullName$ не произошло, тк. lastName$ не определилися как его записимость.

firstName$.value = 'Шарик';
// => 'Шарик Пёс'
```

### Опция Cell[meta]

Любая дополнительная информация для ячейки.

```typescript
const name$ = cellx('Матроскин', {
    meta: { id: 'name' }
});

console.log(name$.meta.id);
// => 'name'
```

### Опция Cell[validate]

Проверяет значение при записи и вычислении.

Валидация при записи в ячейку:

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

Валидация при вычислении ячейки:

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

### Опция Cell[put]

Может использоваться для обработки значения при записи и перенаправления записи.

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
