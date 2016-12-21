<p>
    <img src="https://raw.githubusercontent.com/Riim/cellx/master/docs/images/logo.png" width="237" height="129">
</p>

Сверхбыстрая реализация реактивности для javascript.

## Где достать

Установить через `npm`:
```
npm install cellx --save
```

или через `bower`:
```
bower install cellx --save
```

или скачать файлом: [ткнименя](https://raw.githubusercontent.com/Riim/cellx/master/cellx.js)

## Поддержка браузеров

Все актуальные, IE9+.

## Пример использования

```js
var user = {
    firstName: cellx('Матроскин'),
    lastName: cellx('Кот'),

    fullName: cellx(function() {
        return (this.firstName() + ' ' + this.lastName()).trim();
    })
};

user.fullName('subscribe', function() {
    console.log('fullName: ' + user.fullName());
});

console.log(user.fullName());
// => 'Матроскин Кот'

user.firstName('Шарик');
user.lastName('Пёс');
// => 'fullName: Шарик Пёс'
```

Несмотря на то, что изменились две зависимости ячейки `fullName`, обработчик её изменения сработал только один раз.  
Важной особенностью cellx-а является то, что он старается максимально избавиться как от лишних вызовов
обработчиков изменений, так и от лишних вызовов расчётных формул зависимых ячеек. В сочетании с ещё некоторыми оптимизациями это приводит к идеальной скорости расчёта сложнейших сеток зависимостей.

## Тест производительности

В одном из тестов, который используется для замера производительности, генерируется сетка из множества "слоёв",
каждый из которых состоит из 4-x ячеек. Ячейки вычисляются из ячеек предыдущего слоя (кроме самого первого, он содержит
исходные значения) по формуле A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. Далее запоминается начальное время, меняются значения
всех ячеек первого слоя и замеряется время, через которое все ячейки последнего слоя обновятся.
Результаты теста (в милисекундах) с разным числом слоёв (для Google Chrome 53.0.2785.116 (64-bit)):

| Library ↓ \ Number of computed layers →                 | 10      | 20                                | 30                                  | 50      | 100     | 1000    | 5000                                         | 25000                                        |
|---------------------------------------------------------|---------|-----------------------------------|-------------------------------------|---------|---------|---------|----------------------------------------------|----------------------------------------------|
| cellx                                                   |     <~1 |                               <~1 |                                 <~1 |     <~1 |     <~1 |       4 |                                           20 |                                          100 |
| VanillaJS (naive)                                       |     <~1 |                                15 |                                1750 | >300000 | >300000 | >300000 |                                      >300000 |                                      >300000 |
| [Knockout](http://knockoutjs.com/)                      |      10 | 750, increases in subsequent runs | 67250, increases in subsequent runs | >300000 | >300000 | >300000 |                                      >300000 |                                      >300000 |
| [$jin.atom](https://github.com/nin-jin/pms-jin/)        |       2 |                                 3 |                                   3 |       4 |       6 |      40 |                                          230 |                                         1100 |
| [$mol_atom](https://github.com/nin-jin/mol)             |     <~1 |                               <~1 |                                 <~1 |       1 |       2 |      20 | RangeError: Maximum call stack size exceeded | RangeError: Maximum call stack size exceeded |
| [Warp9](http://rystsov.info/warp9/)                     |       2 |                                 3 |                                   4 |       6 |      10 |     140 |            900, increases in subsequent runs |           4200, increases in subsequent runs |
| [Reactor.js](https://github.com/fynyky/reactor.js)      |     <~1 |                               <~1 |                                   2 |       3 |       5 |      50 |                                          230 |                                      >300000 |
| [Reactive.js](https://github.com/mattbaker/Reactive.js) |     <~1 |                               <~1 |                                   2 |       3 |       5 |     140 | RangeError: Maximum call stack size exceeded | RangeError: Maximum call stack size exceeded |
| [Kefir.js](https://rpominov.github.io/kefir/)           |      25 |                              2500 |                             >300000 | >300000 | >300000 | >300000 |                                      >300000 |                                      >300000 |
| [MobX](https://mobxjs.github.io/mobx/)                  |     <~1 |                               <~1 |                                 <~1 |       2 |       3 |      40 | RangeError: Maximum call stack size exceeded | RangeError: Maximum call stack size exceeded |
| [Matreshka.js](https://matreshka.io/)                   |      11 |                              1150 |                              143000 | >300000 | >300000 | >300000 |                                      >300000 |                                      >300000 |

Исходники теста можно найти в папке [perf](https://github.com/Riim/cellx/tree/master/perf).  
Плотность связей в реальных приложениях обычно ниже чем в данном тесте, то есть если в тесте определённая задержка
появляется на 100 вычисляемых ячейках (25 слоёв), то в реальном приложении подобная задержка будет либо
на большем числе ячеек, либо в формулах ячеек будут какие-то сложные расчёты (например, вычисление одного массива
из другого).

## Использование

Ячейки можно сохранять в переменных:

```js
var num = cellx(1);
var plusOne = cellx(function() { return num() + 1; });

console.log(plusOne());
// => 2
```

в вызываемых свойствах:

```js
function User(name) {
    this.name = cellx(name);
    this.nameInitial = cellx(function() { return this.name().charAt(0).toUpperCase(); });
}

var user = new User('Матроскин');

console.log(user.nameInitial());
// => 'М'
```

в том числе в прототипе:

```js
function User(name) {
    this.name(name);
}
User.prototype.name = cellx();
User.prototype.friends = cellx(function() { return []; }); // каждый инстанс юзера получит свой инстанс массива

var user1 = new User('Матроскин');
var user2 = new User('Шарик');

console.log(user1.friends() == user2.friends());
// => false
```

или в обычных свойствах:

```js
function User(name) {
    cellx.define(this, {
        name: name,
        nameInitial: function() { return this.name.charAt(0).toUpperCase(); }
    });
}

var user = new User('Матроскин');

console.log(user.nameInitial);
// => 'М'
```

### Использование с ES.Next

Используйте npm модуль [cellx-decorators](https://www.npmjs.com/package/cellx-decorators).

### Использование с React

Используйте npm модуль [cellx-react](https://www.npmjs.com/package/cellx-react).

### Другие модули для cellx

* [cellx-indexed-collections](https://www.npmjs.com/package/cellx-indexed-collections)
* [Rionite](https://www.npmjs.com/package/rionite)

### Опции

При создании ячейки можно передать некоторые опции:

#### get

Дополнительная обработка значения при чтении:

```js
// массив, который не получится случайно испортить, портиться будет копия
var arr = cellx([1, 2, 3], {
    get: function(arr) { return arr.slice(); }
});

console.log(arr()[0]);
// => 1

arr()[0] = 5;

console.log(arr()[0]);
// => 1
```

#### put

Используется для создания записываемых вычисляемых ячеек:

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

var user = new User();

user.fullName('Матроскин Кот');

console.log(user.firstName());
// => 'Матроскин'
console.log(user.lastName());
// => 'Кот'
```

#### validate

Валидирует значение при записи и вычислении.

Валидация при записи в ячейку:

```js
var num = cellx(5, {
    validate: function(value) {
        if (typeof value != 'number') {
            throw new TypeError('Oops!');
        }
    }
});

try {
    num('Йа строчка');
} catch (err) {
    console.log(err.message);
    // => 'Oops!'
}

console.log(num());
// => 5
```

Валидация при вычислении ячейки:

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

value('Йа строчка');
// => 'Oops!'

console.log(value());
// => 'Йа строчка'

console.log(num());
// => 5
```

### Методы

Вызов метода ячейки делается несколько необычно — вызывается сама ячейка, первым аргументом передаётся имя метода,
остальными — аргументы. При этом аргументов должно быть не менее одного, иначе вызов ячейки будет засчитан как её
запись. Если у метода нет аргументов, нужно при вызове дополнительно передавать `undefined` или для краткости
просто `0` (см. `dispose`).

#### addChangeListener

Добавляет обработчик изменения:

```js
var num = cellx(5);

num('addChangeListener', function(evt) {
    console.log(evt);
});

num(10);
// => { oldValue: 5, value: 10 }
```

#### removeChangeListener

Снимает ранее добавленный обработчик изменения.

#### addErrorListener

Добавляет обработчик ошибки:

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

Снимает ранее добавленный обработчик ошибки.

#### subscribe

Подписывает на события `change` и `error`. В обработчик первым аргументом приходит объект ошибки, вторым — событие.

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

Отписывает от событий `change` и `error`.

#### Подписка на свойства созданные с помощью `cellx.define`

Подписаться на изменение свойства созданного с помощью `cellx.define` можно через `EventEmitter`:

```js
class User extends cellx.EventEmitter {
    constructor(name) {
        cellx.define(this, {
            name,
            nameInitial: function() { return this.name.charAt(0).toUpperCase(); }
        });
    }
}

let user = new User('Матроскин');

user.on('change:nameInitial', function(evt) {
    console.log('nameInitial: ' + evt.value);
});

console.log(user.nameInitial);
// => 'М'

user.name = 'Шарик';
// => 'nameInitial: Ш'
```

#### dispose или как убить ячейку

Во многих движках реактивного программирования вычисляемую ячейку (атом, observable-свойство) нужно воспринимать
как обычный обработчик изменения других ячеек, то есть, что бы "убить" ячейку, недостаточно просто снять с неё все
обработчики и потерять на неё ссылку, её саму тоже нужно отвязать от её зависимостей.
В cellx-е вычисляемые ячейки постоянно отслеживают наличие обработчиков на них самих и всех своих потомках,
и в случае их (обработчиков) отсутствия переходят в режим пассивного обновления, то есть сами отписываются от своих
зависимостей и вычисляются непосредственно при чтении. Таким образом, для "убийства" вычисляемой ячейки нужно просто
снять с неё все добавленные ранее обработчики и забыть ссылку на неё, о других ячейках, из которых она вычисляется
или вычисляемых из неё, думать не нужно. После этого сборщик мусора всё почистит.

На всякий случай можно вызвать `dispose`:

```js
user.name('dispose', 0);
```

это снимет все обработчики не только с самой ячейки, но и со всех вычисляемых из неё ячеек,
при отсутствии ссылок "умрёт" вся ветка зависимостей.

## Схлопывание и отбрасывание событий

Для минимизации перерисовки UI cellx может "схлопывать" несколько событий в одно. Ссылка на предыдущее находится в
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

В ситуации когда ячейка приходит к исходному значению до генерации события, она совсем его не генерит:

```js
var num = cellx(5);

num('addChangeListener', function(evt) {
    console.log(evt);
});

num(10);
num(15);
num(5); // возвращаем исходное значение
// а ничегошеньки здесь нет
```

При изменении нескольких зависимостей вычисляемой ячейки, она вычисляется лишь раз и событие создаётся одно:

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

## Динамическая актуализация зависимостей

Формула вычисляемой ячейки может быть написана так, что набор зависимостей может со временем меняться. Например:

```js
var user = {
    firstName: cellx(''),
    lastName: cellx(''),

    name: cellx(function() {
        return this.firstName() || this.lastName();
    })
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
var foo = cellx(function() {
	return localStorage.foo || 'foo';
}, {
	put: function(value) {
		localStorage.foo = value;
		this.push(value);
	}
});

var foobar = cellx(function() {
	return foo() + 'bar';
});

console.log(foobar()); // => 'foobar'
console.log(localStorage.foo); // => undefined
foo('FOO');
console.log(foobar()); // => 'FOObar'
console.log(localStorage.foo); // => 'FOO'
```

## Синхронизация значения с асинхронным хранилищем

```js
var request = (function() {
	var value = 1;

	return {
		get: function(url) {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve({
						ok: true,
						value: value
					});
				}, 1000);
			});
		},

		put: function(url, params) {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					value = params.value;

					resolve({
						ok: true
					});
				}, 1000);
			});
		}
	};
})();

var foo = cellx(function(push, fail, oldValue) {
	request.get('http://...').then(function(res) {
		if (res.ok) {
			push(res.value);
		} else {
			fail(res.error);
		}
	});

	return oldValue || 0;
}, {
	put: function(value, push, fail, oldValue) {
		request.put('http://...', { value: value }).then(function(res) {
			if (res.ok) {
				push(value);
			} else {
				fail(res.error);
			}
		});
	}
});

foo('subscribe', function() {
	console.log('New foo value: ' + foo());
	foo(5);
});

console.log(foo());
// => 0

foo('then', function() {
    console.log(foo());
});
// => 'New foo value: 1'
// => 1
// => 'New foo value: 5'
```

## Коллекции

Если в ячейку записать экземпляр класса наследующего от `cellx.EventEmitter`, то ячейка подпишется на его
событие `change` и будет выдавать его за своё:

```js
var value = cellx(new cellx.EventEmitter());

value('subscribe', function(err, evt) {
    console.log(evt.ok);
});

value().emit({ type: 'change', ok: true });
// => true
```

За счёт этого можно создавать свои коллекции, при обновлении которых будет обновляться ячейка, содержащая их
и перевычисляться зависимые от неё ячейки. Две таких коллекции уже есть в cellx-е:

### cellx.ObservableMap

Короткий синтаксис для создания:

```js
var map = cellx.map({
    key1: 1,
    key2: 2,
    key3: 3
});
```

`cellx.ObservableMap` полностью повторяет
[Map](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map) из ECMAScript 2015,
за исключением следующих отличий:
- наследует от `cellx.EventEmitter`-а и генерирует событие `change` при изменении своих записей;
- имеет метод `contains`, позволяющий узнать, содержится ли значение в map-е без перебора всех его значений;
- содержит метод `clone`, создающий копию map-а;
- данные при инициализации может принимать не только в виде массива, но и в виде объекта (в этом случае ключами
будут только строки, ключевое отличие объекта от Map-а как раз в том, что ключи в Map-е могут быть любого типа)
или другого map-а.

### cellx.ObservableList

Короткий синтаксис для создания:

```js
var list = cellx.list([1, 2, 3]);
```

Список также как и `cellx.ObservableMap` генерирует событие `change` при любом изменении своих записей.

При инициализации список может принимать `comparator`, с помощью которого будет происходить сортировка его значений:

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

Если вместо `comparator`-а передать опцию `sorted` со значением `true`, то будет использован стандартный `comparator`:

```js
var list = cellx.list([5, 1, 10], { sorted: true });

console.log(list.toArray());
// => [1, 5, 10]

list.addRange([100, -100, 7]);

console.log(list.toArray());
// => [-100, 1, 5, 7, 10, 100]
```

#### Свойства cellx.ObservableList

##### length

Длинна списка. Только для чтения.

##### comparator

Функция для сравнения значений в сортированном списке. Только для чтения.

##### sorted

Является ли список сортированным. Только для чтения.

#### Методы cellx.ObservableList

Важным отличем списка от массива, является то, что список не может содержать так называемых "дырок",
то есть при попытке прочитать или установить значение по индексу вне существующего диапазона элементов,
будет генерироваться исключение.
Расширение диапазона (добавление элементов) происходит через методы `add`, `addRange`, `insert` и `insertRange`.
При этом у последних двух передаваемый `index` не может быть больше длинны списка.

Сортированный список предполагает, что его значения всегда находятся в отсортированном порядке. Методы
`set`, `setRange`, `insert` и `insertRange` идут вразрез с этим утверждением, они либо будут ломать правильный порядок
сортировки, либо, для сохранения этого порядка, будут устанавливать/вставлять мимо указанного индекса, то есть
работать неверно. Поэтому при вызове на сортированном списке они всегда генерируют исключение. Добавить значения в
отсортированный список можно методами `add` и `addRange`, либо при инициализации списка.

##### contains

Сигнатура вызова: `(value) -> boolean;`.

Проверяет содержится ли значение в списке. При большом колличестве значений в списке, может быть существенно быстрее
чем `list.indexOf(value) != -1`.

##### indexOf

Сигнатура вызова: `(value, fromIndex?: int) -> int;`.

##### lastIndexOf

Сигнатура вызова: `(value, fromIndex?: int) -> int;`.

##### get

Сигнатура вызова: `(index: int) -> *;`.

##### getRange

Сигнатура вызова: `(index: int, count?: uint) -> Array;`.

При неуказанном `count`-е копирует до конца списка.

##### set

Сигнатура вызова: `(index: int, value) -> cellx.ObservableList;`.

##### setRange

Сигнатура вызова: `(index: int, values: Array) -> cellx.ObservableList;`.

##### add

Сигнатура вызова: `(value) -> cellx.ObservableList;`.

##### addRange

Сигнатура вызова: `(values: Array) -> cellx.ObservableList;`.

##### insert

Сигнатура вызова: `(index: int, value) -> cellx.ObservableList;`.

##### insertRange

Сигнатура вызова: `(index: int, values: Array) -> cellx.ObservableList;`.

##### remove

Сигнатура вызова: `(values, fromIndex?: int) -> boolean;`.

Удаляет первое вхождениие `values` в списке.

##### removeAll

Сигнатура вызова: `(values, fromIndex?: int) -> boolean;`.

Удаляет все вхождениия `values` в списке.

##### removeEach

Сигнатура вызова: `(values: Array, fromIndex?: int) -> boolean;`.

##### removeAllEach

Сигнатура вызова: `(values: Array, fromIndex?: int) -> boolean;`.

##### removeAt

Сигнатура вызова: `(index: int) -> *;`.

##### removeRange

Сигнатура вызова: `(index: int, count?: uint) -> Array;`.

При неуказанном `count`-е удалит всё до конца списка.

##### clear

Сигнатура вызова: `() -> cellx.ObservableList;`.

##### join

Сигнатура вызова: `(separator?: string) -> string;`.

##### forEach

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList), context?);`.

##### map

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> *, context?) -> Array;`.

##### filter

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> Array;`.

##### find

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> *;`.

##### findIndex

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> int;`.

##### every

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> boolean;`.

##### some

Сигнатура вызова: `(cb: (item, index: uint, list: cellx.ObservableList) -> ?boolean, context?) -> boolean;`.

##### reduce

Сигнатура вызова: `(cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### reduceRight

Сигнатура вызова: `(cb: (accumulator, item, index: uint, list: cellx.ObservableList) -> *, initialValue?) -> *;`.

##### clone

Сигнатура вызова: `() -> cellx.ObservableList;`.

##### toArray

Сигнатура вызова: `() -> Array;`.

##### toString

Сигнатура вызова: `() -> string;`.

## Размер

| File         | Original |  Gzipped |
|--------------|----------|----------|
| cellx.js     | 65.39 kB | 12.81 kB |
| cellx.min.js |  27.8 kB |  7.91 kB |

## Использованные материалы

- [Пишем простое приложение на React с использованием библиотеки cellx](https://habrahabr.ru/post/313038/)
- [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/)
- [Knockout — Simplify dynamic JavaScript UIs with the Model-View-View Model (MVVM) pattern](http://knockoutjs.com/)
