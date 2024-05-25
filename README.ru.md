<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

Сверхбыстрая реализация реактивности для javascript.

## Установка

```
npm i -S cellx
```

## Пример использования

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

Несмотря на то, что изменились две зависимости ячейки `fullName`, обработчик её изменения сработал только один раз.
Важной особенностью cellx-а является то, что он старается максимально избавиться как от лишних вызовов обработчиков
изменений, так и от лишних вызовов расчётных формул зависимых ячеек. В сочетании с ещё некоторыми оптимизациями это
приводит к идеальной скорости расчёта сложнейших сеток зависимостей.
Больше об этом можно узнать в статье [Big State Managers Benchmark](https://habr.com/ru/articles/707600/).
Также вам может быть интересна статья [Разбираемся в сортах реактивности](https://habr.com/ru/companies/timeweb/articles/586450/).

## Тест производительности

В одном из тестов, который используется для замера производительности, генерируется сетка из множества "слоёв",
каждый из которых состоит из 4-x ячеек. Ячейки вычисляются из ячеек предыдущего слоя (кроме самого первого, он содержит
исходные значения) по формуле A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. Далее запоминается начальное время, меняются значения
всех ячеек первого слоя и замеряется время, через которое все ячейки последнего слоя обновятся.
Результаты теста (в милисекундах) с разным числом слоёв:

| Library ↓ \ Number of computed layers →                 | 10      | 20                                | 30                                  | 50      | 100     | 1000    | 5000                                         |
|---------------------------------------------------------|---------|-----------------------------------|-------------------------------------|---------|---------|---------|----------------------------------------------|
| cellx                                                   |     <~1 |                               <~1 |                                 <~1 |     <~1 |     <~1 |       4 |                                           20 |
| VanillaJS (naive)                                       |     <~1 |                                15 |                                1750 | >300000 | >300000 | >300000 |                                      >300000 |
| [Knockout](http://knockoutjs.com/)                      |      10 | 750, increases in subsequent runs | 67250, increases in subsequent runs | >300000 | >300000 | >300000 |                                      >300000 |
| [$jin.atom](https://github.com/nin-jin/pms-jin/)        |       2 |                                 3 |                                   3 |       4 |       6 |      40 |                                          230 |
| [$mol_atom](https://github.com/nin-jin/mol)             |     <~1 |                               <~1 |                                 <~1 |       1 |       2 |      20 | RangeError: Maximum call stack size exceeded |
| [Kefir.js](https://rpominov.github.io/kefir/)           |      25 |                              2500 |                             >300000 | >300000 | >300000 | >300000 |                                      >300000 |
| [MobX](https://mobxjs.github.io/mobx/)                  |     <~1 |                               <~1 |                                 <~1 |       2 |       3 |      40 | RangeError: Maximum call stack size exceeded |

Исходники теста можно найти в папке [perf](https://github.com/Riim/cellx/tree/master/perf).
Плотность связей в реальных приложениях обычно ниже чем в данном тесте, то есть если в тесте определённая задержка
появляется на 100 вычисляемых ячейках (25 слоёв), то в реальном приложении подобная задержка будет либо
на большем числе ячеек, либо в формулах ячеек будут какие-то сложные расчёты (например, вычисление одного массива
из другого).

## Использование

Функциональный стиль:

```js
let num = cellx(1);
let plusOne = cellx(() => num.value + 1);

console.log(plusOne.value);
// => 2
```

ООП стиль:

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

ООП стиль с декораторами:

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

### Опции

#### put

Может использоваться для обработки значения при записи и перенаправления записи:

```js
function User() {
    this.firstName = cellx('');
    this.lastName = cellx('');

    this.fullName = cellx(
		() => (this.firstName.value + ' ' + this.lastName.value).trim(),
		{
			put: (name) => {
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

Валидирует значение при записи и вычислении.

Валидация при записи в ячейку:

```js
let num = cellx(5, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Oops!');
        }
    }
});

try {
    num('Йа строчка');
} catch (err) {
    console.log(err.message);
    // => 'Oops!'
}

console.log(num.value);
// => 5
```

Валидация при вычислении ячейки:

```js
let someValue = cellx(5);

let num = cellx(() => someValue.value, {
    validate: (value) => {
        if (typeof value != 'number') {
            throw TypeError('Oops!');
        }
    }
});

num.subscribe((err) => {
    console.log(err.message);
});

someValue.value = 'Я строчка';
// => 'Oops!'

console.log(someValue.value);
// => 'Я строчка'
```

### Методы

#### onChange

Добавляет обработчик изменения:

```js
let num = cellx(5);

num.onChange((evt) => {
    console.log(evt);
});

num.value = 10;
// => { prevValue: 5, value: 10 }
```

#### offChange

Снимает ранее добавленный обработчик изменения.

#### onError

Добавляет обработчик ошибки:

```js
let someValue = cellx(1);

let num = cellx(() => someValue.value, {
    validate: (v) => {
        if (v > 1) {
            throw RangeError('Oops!');
        }
    }
});

num.onError(evt => {
    console.log(evt.error.message);
});

someValue.value = 2;
// => 'Oops!'
```

#### offError

Снимает ранее добавленный обработчик ошибки.

#### subscribe

Подписывает на события `change` и `error`. В обработчик первым аргументом приходит объект ошибки, вторым — событие.

```js
fullName.subscribe((err, evt) => {
    if (err) {
        //
    } else {
        //
    }
});
```

#### unsubscribe

Отписывает от событий `change` и `error`.

## Динамическая актуализация зависимостей

Формула вычисляемой ячейки может быть написана так, что набор зависимостей может со временем меняться. Например:

```js
let user = {
    firstName: cellx(''),
    lastName: cellx(''),

    name: cellx(() => user.firstName.value || user.lastName.value)
};
```

Здесь пока `firstName` является пустой строкой, ячейка `name` подписана и на `firstName` и на `lastName`,
так как изменение любого из них приведёт к изменению её значения. Если же задать `firstName`-у какую-то не пустую
строку, то, при перевычислении значения `name`, до чтения `lastName` в формуле просто не дойдёт,
то есть значение ячейки `name` с этого момента уже никак не зависит от `lastName`.
В таких случаях ячейки автоматически отписываются от незначимых для них зависимостей и не перевычисляются
при их изменении. В дальнейшем, если `firstName` снова станет пустой строкой, ячейка `name` вновь подпишется
на `lastName`.

## Синхронизация значения с синхронным хранилищем

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
foo('FOO');
console.log(foobar.value); // => 'FOObar'
console.log(localStorage.foo); // => 'FOO'
```

## Синхронизация значения с асинхронным хранилищем

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
	put: (value, cell, next) => {
		request.put('http://...', { value: value }).then((res) => {
			if (res.ok) {
				cell.push(value);
			} else {
				cell.fail(res.error);
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
