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

или скачать файликом: [ткнименя](https://raw.githubusercontent.com/Riim/cellx/master/cellx.js)

## Пример использования:

```js
var user = {
    firstName: cellx('Вася'),
    lastName: cellx('Пупкин'),

    fullName: cellx(function() {
        return this.firstName() + ' ' + this.lastName();
    })
};

user.fullName('subscribe', function() {
    console.log('fullName: ' + user.fullName());
});

console.log(user.fullName());
// => 'Вася Пупкин'

user.firstName('Петя');
user.lastName('Дудкин');
// => 'fullName: Петя Дудкин'
```

Несмотря на то, что изменились две зависимости ячейки `fullName`, обработчик её изменения сработал только один раз.  
Важной особенностью cellx-а является то, что он старается максимально избавиться как от лишних вызовов
обработчиков изменений, так и от лишних вызовов расчётных формул зависимых ячеек. В сочетании с ещё некоторыми хитрыми
оптимизациями это приводит к идеальной скорости расчёта сложнейщих сеток зависимостей.  
В одном из основных тестов, который используется для замера производительности, генерируется сетка из множества "слоёв",
каждый из которых состоит из 4-x ячеек. Ячейки вычисляются из ячеек предыдущего слоя (кроме самого первого, он содержит
исходные значения) по формуле A2=B1, B2=A1-C1, C2=B1+D1, D2=C1. Далее запоминается начальное время, меняются значения
всех ячеек первого слоя и замеряется время, через которое все ячейки последнего слоя обновятся.
Результаты теста (в милисекундах) с разным числом слоёв (для Google Chrome 43.0.2357.124 (64-bit)):

| Number of computed layers ↓ \ Library → | cellx | [Knockout](http://knockoutjs.com/) | [AngularJS](https://angularjs.org/) | [jin-atom](https://github.com/nin-jin/pms-jin/) | [Warp9](http://rystsov.info/warp9/)               | [Kefir.js](https://rpominov.github.io/kefir/) |
|-----------------------------------------|-------|------------------------------------|-------------------------------------|-------------------------------------------------|---------------------------------------------------|-----------------------------------------------|
| 10                                      | 1     | 5                                  | 1                                   | 1                                               | 2                                                 | 30                                            |
| 15                                      | 1     | 40                                 | 3                                   | 1                                               | 2                                                 | 250                                           |
| 25                                      | 1     | 4500                               | 360                                 | 1                                               | 3                                                 | 29000                                         |
| 50                                      | 1     | >300000                            | >300000                             | 2                                               | 5                                                 | >300000                                       |
| 100                                     | 1     | >300000                            | >300000                             | 4                                               | 12                                                | >300000                                       |
| 1000                                    | 7     | >300000                            | >300000                             | 55                                              | first call - 120, subsequent calls - >120         | >300000                                       |
| 5000                                    | 50    | >300000                            | >300000                             | 860                                             | first call - 650, subsequent calls - >650         | >300000                                       |
| 25000                                   | 180   | >300000                            | >300000                             | first call - 8800, subsequent calls - 19000     | first call - 4100, subsequent calls - crashes tab | >300000                                       |

Исходники теста лежат в папке [perf](https://github.com/Riim/cellx/tree/master/perf).  
Плотность связей в реальных приложениях обычно ниже чем в данном тесте, то есть если определённая задержка появляется
на 100 вычисляемых ячейках (25 слоёв), то в реальном приложении подобная задержка будет либо на большем числе ячеек,
либо в формулах ячеек будут какие-то сложные расчёты.

## Использование

Ячейки можно ложить в переменные:

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

var user = new User('Василий');

console.log(user.upperName());
// => 'ВАСИЛИЙ'
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

var user = new User('Василий');

console.log(user.upperName());
// => 'ВАСИЛИЙ'
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

var user1 = new User('Василий');
var user2 = new User('Григорий');

user1.friends.push(new User('Леночка'));

console.log(user1.friends.length);
// => 1

console.log(user2.friends.length);
// => 1
// Опачки!
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

var user1 = new User('Василий');
var user2 = new User('Григорий');

user1.friends().push(new User('Леночка'));

console.log(user1.friends().length);
// => 1

console.log(user2.friends().length);
// => 0
// Ok!
```

Копирование происходит так:  
- если есть метод `clone`, вернуть результат его вызова
- если массив, скопировать его через `slice` и вернуть копию
- если дата, скопировать её через `new Date(value)` и вернуть копию
- если регэксп, скопировать его через `new RegExp(value)` и вернуть копию
- скопировать свойства в пустой объект (поверхностное копирование) и вернуть его

То есть просто определяйте метод `clone` для ваших кастомных типов и их можно будет использовать с cellx-ом ;) .

### Опции

При создании ячейки можно передать некоторые опции:

#### read

Дополнительная обработка значения при чтении:

```js
// массив, который не получится случайно испортить, портиться будет копия
var arr = cellx([1, 2, 3], {
    read: function(arr) { return arr.slice(); }
});

console.log(arr()[0]);
// => 1

arr()[0] = 5;

console.log(arr()[0]);
// => 1
```

#### write

Используется для создания записываемых вычисляемых ячеек:

```js
function User() {
    this.firstName = cellx('');
    this.lastName = cellx('');

    this.fullName = cellx(function() {
        return (this.firstName() + ' ' + this.lastName()).trim();
    }, {
        write: function(name) {
            name = name.split(' ');

            this.firstName(name[0]);
            this.lastName(name[1]);
        }
    });
}

var user = new User();

user.fullName('Вася Пупкин');

console.log(user.firstName());
// => 'Вася'
console.log(user.lastName());
// => 'Пупкин'
```

#### validate

Валидирует значение при записи и вычислении.

Валидация при записи в ячейку-значение:

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
свойство `constructor`. Функции с переопределённым `constructor`-ом, по умолчанию, засчитываются как обычные значения.
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

поэтому вы можете ложить одну ячейку во-внутрь другой:

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

#### pureComputed

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

Здесь пока `firstName` не определён (или пустая строка), ячейка `name` подписана и на `firstName` и на `lastName`,
так как изменение любого из них приведёт к изменению её значения. Если же задать `firstName`-у какое-то значимое
значение, то, при перевычислении значения `name`, до чтения `lastName` в формуле просто не дойдёт и ячейка отпишется
от него. В дальнейшем, если `firstName` снова станет пустой строкой, ячейка `name` вновь подпишется на `lastName`.
Другими словами, каждая ячейка постоянно отслеживает изменение набора своих зависимостей, подписывается на новые
и отписывается от устаревших.
В тоже время формулы многих ячеек пишутся так, что набор зависимостей всегда постоянен. Чтобы отключить постоянный
детект изменения набора зависимостей нужно передать опцию `pureComputed` со значением `true`. Это немного ускорит
вычисление значения ячейки.

### Методы

Вызов метода ячейки делается несколько необычно - вызывается сама ячейка, первым аргументом передаётся имя метода,
остальными - аргументы. При этом аргументов должно быть не менее одного, иначе вызов ячейки будет засчитан как её
запись. Если у метода нет аргументов, просто передайте какой-нибудь `void 0` или для краткости
просто `0` (см. `clear`).

#### on

Добавляет обработчик события. Из событий генерятся `change` и `error`:

```js
var num = cellx(5);

num('on', 'change', function(evt) {
    console.log(evt.detail);
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

#### clear или как убить ячейку

Во многих движках реактивного программирования вычисляемую ячейку (атом, observable-свойство) нужно воспринимать
как обычный обработчик изменения других ячеек, то есть, что бы "убить" ячейку, недостаточно просто снять с неё все
обработчики и потерять на неё ссылку, её саму тоже нужно отвязать от её зависимостей.
В cellx-е вычисляемые ячейки постоянно отслеживают наличие обработчиков на них самих и всех своих потомках,
и в случае их (обработчиков) отсутствия переходят в режим пассивного обновления, то есть сами отписываются от своих
зависимостей и вычисляются непосредственно при чтении. Таким образом, для "убийства" вычисляемой ячейки нужно просто
снять с неё все добавленные ранее обработчики и потерять на неё ссылку, о других ячейках, из которых она вычисляется
или вычисляемых из неё, думать не нужно. После этого сборщик мусора всё почистит.

На всякий случай можно вызвать `clear`:

```js
user.name('clear', 0);
```

это снимет все обработчики не только с самой ячейки, но и со всех вычисляемых из неё ячеек,
при отсутствии ссылок "умрёт" вся ветка зависимостей.

### Схлопывание и отбрасывание событий

Для минимизации перерисовки UI cellx может "схлопывать" несколько событий в одно. Ссылка на предыдущее находится в
`evt.detail.prevEvent`:

```js
var num = cellx(5);

num('on', 'change', function(evt) {
    console.log(evt);
});

num(10);
num(15);
num(20);
// => Event{
//     detail: {
//         oldValue: 15,
//         value: 20,
//         prevEvent: Event{
//             detail: {
//                 oldValue: 10,
//                 value: 15,
//                 prevEvent: Event{ detail: { oldValue: 5, value: 10 } }
//             }
//         }
//     }
// }
```

Если же меняется несколько зависимостей вычисляемой ячейки, то схлопывание происходит даже без `prevEvent`-а (то есть
событие получается совсем одно), а формула вычисления её значения вызывается лишь раз:

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
// => Event{
//     detail: {
//         oldValue: 15,
//         value: 25,
//         prevEvent: undefined
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

### Коллекции

Если в ячейку записать экземпляр класса наследующего от `cellx.EventEmitter`, то ячейка подпишется на его
событие `change` и будет выдавать его за своё:

```js
var value = cellx(new cellx.EventEmitter());

value('subscribe', function(err, evt) {
    console.log(evt.target == value());
    console.log(evt.detail);
});

value().emit('change', { ok: true });
// => true
// => { ok: true }
```

За счёт этого можно создавать свои коллекции, при обновлении которых будет обновляться ячейка, содержащая их
и перевычисляться зависимые от неё ячейки. Две таких коллекции уже есть в cellx-е:

#### cellx.ActiveMap

Короткий синтаксис для создания:

```js
var map = cellx.map({
    key1: 1,
    key2: 2,
    key3: 3
});
```

`cellx.ActiveMap` полностью повторяет
[Map](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map) из ecmascript 6,
за исключением следующих отличий:
- наследует от `cellx.EventEmitter`-а и генерирует событие `change` при любом изменении своих записей
- имеет метод `contains`, позволяющий узнать, содержится ли значение в map-е без перебора всех его значений
- содержит метод `clone`, создающий копию map-а
- данные при инициализации может принимать не только в виде массива, но и в виде объекта (в этом случае ключами
будут только строки, ключевое отличие объекта от Map-а как раз в том, что ключи в Map-е могут быть любого типа)
или другого map-а

#### cellx.ActiveList

Короткий синтаксис для создания:

```js
var list = cellx.list([1, 2, 3]);
```

Список также как и `cellx.Map` генерирует событие `change` при любом изменении своих записей.

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

##### Свойства cellx.ActiveList

###### length

Длинна списка. Только для чтения.

###### comparator

Функция для сравнения значений в сортированном списке. Только для чтения.

###### sorted

Является ли список сортированным. Только для чтения.

##### Методы cellx.ActiveList

Важным отличем списка от массива, является то, что он не может содержать так называемых "дырок", то есть при
попытке прочитать или установить значение по индексу вне существующего диапазона элементов, будет генериться исключение.
Расширение диапазона (добавление элементов) происходит через методы `add`, `addRange`, `insert` и `insertRange`.
При этом у последних двух передаваемый `index` не может быть больше длинны списка.

Передаваемый индекс для всех методов может быть отрицательным, в этом случае он отсчитывается от конца списка:

```js
console.log(
    [1, 2, 3, 1, 2].indexOf(1, -2),
    cellx.list([1, 2, 3, 1, 2]).indexOf(1, -2)
);
// => -1 3
```

Сортированный список предполагает, что его значения всегда находятся в отсортированном порядке. Методы
`set`, `setRange`, `insert` и `insertRange` идут вразрез с этим утверждением, они либо будут ломать правильный порядок
сортировки, либо, для сохранения этого порядка, будут устанавливать/вставлять мимо указанного индекса, то есть
работать неверно. Поэтому при вызове на сортированном списке они всегда генерируют исключение. Добавить значения в
отсортированный список можно методами `add` и `addRange`, либо при инициализации списка.

###### contains

Сигнатура вызова: `(value): boolean;`.

Проверяет содержится ли значение в списке. При большом колличестве значений в списке может быть существенно быстрее
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

Сигнатура вызова: `(index: int, value): cellx.ActiveList;`.

###### setRange

Сигнатура вызова: `(index: int, items: Array): cellx.ActiveList;`.

###### add

Сигнатура вызова: `(item): cellx.ActiveList;`.

###### addRange

Сигнатура вызова: `(items: Array): cellx.ActiveList;`.

###### insert

Сигнатура вызова: `(index: int, item): cellx.ActiveList;`.

###### insertRange

Сигнатура вызова: `(index: int, items: Array): cellx.ActiveList;`.

###### remove

Сигнатура вызова: `(item, fromIndex: int = 0): cellx.ActiveList;`.

Удаляет первое вхождениие `item` в списке.

###### removeAll

Сигнатура вызова: `(item, fromIndex: int = 0): cellx.ActiveList;`.

Удаляет все вхождениия `item` в списке.

###### removeAt

Сигнатура вызова: `(index: int): cellx.ActiveList;`.

###### removeRange

Сигнатура вызова: `(index: int = 0, count?: uint): cellx.ActiveList;`.

При неуказанном `count`-е удалит всё до конца списка.

###### clear

Сигнатура вызова: `(): cellx.ActiveList;`.

###### join

Сигнатура вызова: `(separator: string = ','): string;`.

###### forEach

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ActiveList), context: Object = global);`.

###### map

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ActiveList): *, context: Object = global): Array;`.

###### filter

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): Array;`.

###### every

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): boolean;`.

###### some

Сигнатура вызова: `(cb: (item, index: uint, arr: cellx.ActiveList): boolean, context: Object = global): boolean;`.

###### reduce

Сигнатура вызова: `(cb: (accumulator: *, item, index: uint, arr: cellx.ActiveList): *, initialValue?): *;`.

###### reduceRight

Сигнатура вызова: `(cb: (accumulator: *, item, index: uint, arr: cellx.ActiveList): *, initialValue?): *;`.

###### clone

Сигнатура вызова: `(): cellx.ActiveList;`.

###### toArray

Сигнатура вызова: `(): Array;`.

###### toString

Сигнатура вызова: `(): string;`.

## Использованные материалы

При разработке были использованы идеи [Дмитрия Карловского](https://github.com/nin-jin/)
из статьи [Атом — минимальный кирпичик FRP приложения](http://habrahabr.ru/post/235121/).
