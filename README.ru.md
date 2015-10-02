# cellx

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
        return this.firstName() + ' ' + this.lastName();
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
обработчиков изменений, так и от лишних вызовов расчётных формул зависимых ячеек. В сочетании с ещё некоторыми особыми
оптимизациями это приводит к идеальной скорости расчёта сложнейших сеток зависимостей.  
В одном из тестов, который используется для замера производительности, генерируется сетка из множества "слоёв",
каждый из которых состоит из 4-x ячеек. Ячейки вычисляются из ячеек предыдущего слоя (кроме самого первого, он содержит
исходные значения) по формуле A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. Далее запоминается начальное время, меняются значения
всех ячеек первого слоя и замеряется время, через которое все ячейки последнего слоя обновятся.
Результаты теста (в милисекундах) с разным числом слоёв (для Google Chrome 44.0.2403.107 (64-bit)):

| Number of computed layers ↓ \ Library → | cellx | [Knockout](http://knockoutjs.com/) | [AngularJS](https://angularjs.org/) | [jin-atom](https://github.com/nin-jin/pms-jin/) | [Warp9](http://rystsov.info/warp9/)               | [Kefir.js](https://rpominov.github.io/kefir/) |
|-----------------------------------------|-------|------------------------------------|-------------------------------------|-------------------------------------------------|---------------------------------------------------|-----------------------------------------------|
| 10                                      | 1     | 5                                  | 1                                   | 1                                               | 1                                                 | 30                                            |
| 15                                      | 1     | 40                                 | 3                                   | 1                                               | 2                                                 | 250                                           |
| 25                                      | 1     | 4500                               | 360                                 | 1                                               | 3                                                 | 29000                                         |
| 50                                      | 1     | >300000                            | >300000                             | 1                                               | 5                                                 | >300000                                       |
| 100                                     | 1     | >300000                            | >300000                             | 2                                               | 12                                                | >300000                                       |
| 1000                                    | 5     | >300000                            | >300000                             | 20                                              | first call - 120                                  | >300000                                       |
| 5000                                    | 25    | >300000                            | >300000                             | 260                                             | first call - 500, subsequent calls - >500         | >300000                                       |
| 25000                                   | 120   | >300000                            | >300000                             | first call - 5000                               | first call - 2500, subsequent calls - crashes tab | >300000                                       |

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

Создавать в конструкторе класса:

```js
function User(name) {
    this.name = cellx(name);
    this.upperName = cellx(function() { return this.name().toUpperCase(); });
}

var user = new User('Матроскин');

console.log(user.upperName());
// => 'МАТРОСКИН'
```

Объявление ячейки в прототипе класса тоже допустимо:

```js
function User(name) {
    this.name(name);
}
User.prototype = {
    name: cellx(''),
    upperName: cellx(function() { return this.name().toUpperCase(); })
};

var user = new User('Матроскин');

console.log(user.upperName());
// => 'МАТРОСКИН'
```

В javascript-е есть фича, не примитивные типы, объявленные в прототипе, разделяются всеми экземплярами класса:

```js
function User(name) {
    this.name(name);
}
User.prototype = {
    name: cellx(''),
    friends: []
};

var user1 = new User('Матроскин');
var user2 = new User('Шарик');

user1.friends.push(new User('Фёдор'));

console.log(user1.friends.length);
// => 1

console.log(user2.friends.length);
// => 1
// Опачки!

console.log(user1.friends == user2.friends);
// => true
```

cellx создаёт отдельные копии таких значений для каждого экземпляра:

```js
function User(name) {
    this.name(name);
}
User.prototype = {
    name: cellx(''),
    friends: cellx([])
};

var user1 = new User('Матроскин');
var user2 = new User('Шарик');

user1.friends().push(new User('Фёдор'));

console.log(user1.friends().length);
// => 1

console.log(user2.friends().length);
// => 0
// Ok!

console.log(user1.friends() == user2.friends());
// => false
```

Копирование делается так:  
- если есть метод `clone`, вернуть результат его вызова;
- если массив, скопировать его через `slice` и вернуть копию;
- если дата, скопировать её через `new Date(value)` и вернуть копию;
- если регэксп, скопировать его через `new RegExp(value)` и вернуть копию;
- скопировать свойства в пустой объект (поверхностное копирование) и вернуть его.

То есть определяя метод `clone` для вашего кастомного типа, вы подсказываете cellx-у как правильно копировать
его (кастомного типа) экземпляры.

### Использование с ECMAScript 6

Иногда не очень удобно постоянно дописывать скобки в конце при чтении ячейки, кроме того, бывают ситуации когда
какое-то обычное свойство класса уже используется в приложеннии и вдруг понадобилось сделать его ячейкой,
тут придётся пройтись по всем местам в приложении, где оно уже используется, и дописать скобки.
Всё это может оказаться совсем неудобным. Используя декораторы из ES6 можно избежать таких проблем:

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

let user = new User({ firstName: 'Матроскин', lastName: 'Кот' });

// добавление обработчика
user.on('change:fullName', function() {
    console.log(`fullName: ${this.fullName}`);
});

console.log(user.firstName);
// => 'Матроскин'

user.firstName = 'Шарик';
user.lastName = 'Пёс';
// => 'fullName: Шарик Пёс'
```

Теперь к любому свойству в классе всегда можно добавить декоратор `observable` и получить возможность
подписываться на его изменения и создавать вычисляемые из него свойства. При этом в уже написанной части приложения
ничего менять не придётся.

### Использование с React

Используйте npm модуль [react-bind-observables](https://github.com/Riim/react-bind-observables).

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

#### set

Используется для создания записываемых вычисляемых ячеек:

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

#### computed

По умолчанию, если первый аргумент cellx-а - обычная функция, то ячейка определяется как вычисляемая, а переданная
функция используется как формула для вычисления значения ячейки. Если же необходимо создать ячейку с функцией
в качестве значения, то можно либо установить значение уже после инициализации ячейки, либо передать опцию `computed`
со значением `false`:

```js
var value = cellx(Number, { computed: false });
```

И наоборот, функции могут быть экземплярами какого-то кастомного типа, для их детекции им обычно переопределяют
свойство `constructor` (в ECMAScript 6 можно будет менять поведение `instanceof` с помощью `Symbol.hasInstance`).
Функции с переопределённым `constructor`-ом, по умолчанию, засчитываются как обычные значения.
Экземпляры cellx-а сами являются такими:

```js
var num = cellx(5);

console.log(
    typeof num == 'function',
    num.constructor == cellx,
    num.constructor == Function
);
// => true true false
```

в результате вы можете ложить одну ячейку во-внутрь другой:

```js
var num = cellx(5);
var container = cellx(num);

console.log(container()());
// => 5
```

Если же кастомная функция всё равно должна быть засчитана как формула для вычисляемой ячейки, то нужно передать
опцию `computed` со значением `true`:

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

### Методы

Вызов метода ячейки делается несколько необычно - вызывается сама ячейка, первым аргументом передаётся имя метода,
остальными - аргументы. При этом аргументов должно быть не менее одного, иначе вызов ячейки будет засчитан как её
запись. Если у метода нет аргументов, нужно при вызове дополнительно передавать `void 0` или для краткости
просто `0` (см. `dispose`).

#### on

Добавляет обработчик события. Из событий есть `change` и `error`:

```js
var num = cellx(5);

num('on', 'change', function(evt) {
    console.log(evt);
});

num(10);
// => { oldValue: 5, value: 10 }
```

#### off

Снимает ранее добавленный обработчик события.

#### subscribe

Подписывает на события `change` и `error`. В обработчик первым аргументом приходит объект ошибки, вторым - событие.

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

### Схлопывание и отбрасывание событий

Для минимизации перерисовки UI cellx может "схлопывать" несколько событий в одно. Ссылка на предыдущее находится в
`evt.prev`:

```js
var num = cellx(5);

num('on', 'change', function(evt) {
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

num('on', 'change', function(evt) {
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

sum('on', 'change', function(evt) {
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

#### Динамическая актуализация зависимостей

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

### Коллекции

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

#### cellx.ObservableMap

Короткий синтаксис для создания:

```js
var map = cellx.map({
    key1: 1,
    key2: 2,
    key3: 3
});
```

`cellx.ObservableMap` полностью повторяет
[Map](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map) из ecmascript 6,
за исключением следующих отличий:
- наследует от `cellx.EventEmitter`-а и генерирует событие `change` при изменении своих записей;
- имеет метод `contains`, позволяющий узнать, содержится ли значение в map-е без перебора всех его значений;
- содержит метод `clone`, создающий копию map-а;
- данные при инициализации может принимать не только в виде массива, но и в виде объекта (в этом случае ключами
будут только строки, ключевое отличие объекта от Map-а как раз в том, что ключи в Map-е могут быть любого типа)
или другого map-а.

#### cellx.ObservableList

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

##### Свойства cellx.ObservableList

###### length

Длинна списка. Только для чтения.

###### comparator

Функция для сравнения значений в сортированном списке. Только для чтения.

###### sorted

Является ли список сортированным. Только для чтения.

##### Методы cellx.ObservableList

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

###### contains

Сигнатура вызова: `(value): boolean;`.

Проверяет содержится ли значение в списке. При большом колличестве значений в списке, может быть существенно быстрее
чем `list.indexOf(value) != -1`.

###### indexOf

Сигнатура вызова: `(value, fromIndex: int = 0): int;`.

###### lastIndexOf

Сигнатура вызова: `(value, fromIndex: int = -1): int;`.

###### get

Сигнатура вызова: `(index: int): *;`.

###### getRange

Сигнатура вызова: `(index: int = 0, count?: uint): Array;`.

При неуказанном `count`-е копирует до конца списка.

###### set

Сигнатура вызова: `(index: int, value): cellx.ObservableList;`.

###### setRange

Сигнатура вызова: `(index: int, items: Array): cellx.ObservableList;`.

###### add

Сигнатура вызова: `(item): cellx.ObservableList;`.

###### addRange

Сигнатура вызова: `(items: Array): cellx.ObservableList;`.

###### insert

Сигнатура вызова: `(index: int, item): cellx.ObservableList;`.

###### insertRange

Сигнатура вызова: `(index: int, items: Array): cellx.ObservableList;`.

###### remove

Сигнатура вызова: `(item, fromIndex: int = 0): cellx.ObservableList;`.

Удаляет первое вхождениие `item` в списке.

###### removeAll

Сигнатура вызова: `(item, fromIndex: int = 0): cellx.ObservableList;`.

Удаляет все вхождениия `item` в списке.

###### removeAt

Сигнатура вызова: `(index: int): cellx.ObservableList;`.

###### removeRange

Сигнатура вызова: `(index: int = 0, count?: uint): cellx.ObservableList;`.

При неуказанном `count`-е удалит всё до конца списка.

###### clear

Сигнатура вызова: `(): cellx.ObservableList;`.

###### join

Сигнатура вызова: `(separator: string = ','): string;`.

###### forEach

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ObservableList), context: Object = global);`.

###### map

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ObservableList): *, context: Object = global): Array;`.

###### filter

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): Array;`.

###### every

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): boolean;`.

###### some

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): boolean;`.

###### reduce

Сигнатура вызова: `(cb: (accumulator: *, item, index: uint, arr: cellx.ObservableList): *, initialValue?): *;`.

###### reduceRight

Сигнатура вызова: `(cb: (accumulator: *, item, index: uint, arr: cellx.ObservableList): *, initialValue?): *;`.

###### clone

Сигнатура вызова: `(): cellx.ObservableList;`.

###### toArray

Сигнатура вызова: `(): Array;`.

###### toString

Сигнатура вызова: `(): string;`.

## Использованные материалы

При разработке были использованы идеи [Дмитрия Карловского](https://github.com/nin-jin/)
из статьи [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/).
