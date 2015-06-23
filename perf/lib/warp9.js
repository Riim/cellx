var warp9 = (function(){
    return (function(){
        var files = data.apply(null);
        var library = {};
        Object.keys(files).forEach(function(i){
            initModuleStructure(library, library, files[i].path, files[i].content);
        });
        var ctors = [];
        Object.keys(files).forEach(function(i){
            addModuleContentCollectCtor(library, library, files[i].path, files[i].content, ctors);
        });
        ctors.forEach(function(x){ x(); });
        return library;
        
        function initModuleStructure(library, namespace, path, content) {
            if (path.length==0) throw new Error();
            if (path.length>1) {
                var name = path[0];
                if (!(name in namespace)) {
                    namespace[name] = {};
                }
                initModuleStructure(library, namespace[name], path.slice(1), content);
            }
            if (path.length==1) {
                var exposed = null;
                try {
                    content.apply(null, [library, function(obj) {
                        exposed = obj;
                        throw new ExposeBreak();
                    }]);
                } catch (e) {
                    if (!(e instanceof ExposeBreak)) {
                        throw new Error(e);
                    }
                }
                if (exposed!=null) {
                    if (typeof exposed==="object") {
                        namespace[path[0]] = {};
                    }
                }
            }
            function ExposeBreak() {}
        }
        function addModuleContentCollectCtor(library, namespace, path, content, ctors) {
            if (path.length>1) {
                addModuleContentCollectCtor(library, namespace[path[0]], path.slice(1), content, ctors);
            }
            if (path.length==1) {
                content.apply(null, [library, function(obj, ctor) {
                    if (ctor) ctors.push(ctor);
                    namespace[path[0]] = obj;
                }]);
            }
        }
    })();
    function data(data, hack) {
        if (data || hack) {
            // removes unused parameter warning
        }
        return [
            {
                path: ["__init__"],
                content: function(root, expose) {
                    expose(null, function() {
                        root.uid = function() {
                            return id++;
                        };
                    
                        root.do = function(f, context) {
                            return new root.core.cells.DependentCell(f, context);
                        };
                    
                        root.empty = function() {
                            throw new root.core.cells.EmptyError();
                        };
                    
                        root.unwrapObject = root.core.unwrapObject;
                    
                        root.Cell = root.core.cells.Cell;
                    
                        root.List = root.core.lists.List;
                    
                        root.render = root.ui.renderer.render;
                    
                        root.tx = function(f) {
                            return function() {
                                root.core.event_broker.call(null, f, []);
                            };
                        };
                    });
                    
                    var id = 0;
                }
            },
            {
                path: ["core","Matter"],
                content: function(root, expose) {
                    expose(Matter);
                    
                    
                    function Matter() {
                        this._atoms = [];
                        this.instanceof = of;
                        this.attach = attach;
                        this.metaType = Matter;
                    }
                    
                    Matter.instanceOf = function(obj, type) {
                        return obj.metaType === Matter && obj.instanceof(type);
                    }
                    
                    function attach(atom) {
                        if (this.instanceof(atom)) {
                            return;
                        }
                        this._atoms.push(atom);
                    }
                    
                    function of(atom) {
                        for (var i=0;i<this._atoms.length;i++) {
                            if (this._atoms[i]===atom) return true;
                        }
                        return false;
                    }
                }
            },
            {
                path: ["core","adt","Set"],
                content: function(root, expose) {
                    expose(Set);
                    
                    function Set() {
                        this.length = 0;
                        this._items = [];
                    }
                    
                    Set.prototype.push = function(item) {
                        if (this._items.indexOf(item)>=0) return;
                        this._items.push(item);
                        this.length++;
                    };
                    
                    Set.prototype.toList = function() {
                        return this._items.map(function(item){ return item; });
                    };
                    
                }
            },
            {
                path: ["core","adt","SortedList"],
                content: function(root, expose) {
                    expose(SortedList);
                    
                    // TODO: rewrite to SortedSet
                    function SortedList(comparator) {
                        // TODO: implement http://en.wikipedia.org/wiki/Treap
                        this.length = 0;
                        this.comparator = comparator;
                        this._items = [];
                    }
                    
                    SortedList.prototype.push = function(item) {
                        this._items.push(item);
                        this.length++;
                    };
                    
                    SortedList.prototype.pop = function(item) {
                        if (this.length==0) {
                            throw new Error();
                        }
                        this._items = this._items.sort(this.comparator);
                        this.length--;
                        return this._items.shift();
                    };
                    
                }
            },
            {
                path: ["core","adt","maybe"],
                content: function(root, expose) {
                    expose({
                        Some: Some,
                        None: None
                    });
                    
                    function Some(value) {
                        this.value = function() {
                            return value;
                        };
                        this.isEmpty = function() {
                            return false;
                        };
                        this.lift = function(f) {
                            return new Some(f(value));
                        };
                        this.isEqualTo = function(brother) {
                            if (brother==null) return false;
                            return !brother.isEmpty() && brother.value() === value;
                        };
                        this.get = function() {
                            return value;
                        };
                    }
                    
                    function None() {
                        this.value = function() {
                            throw new Error();
                        };
                        this.isEmpty = function() {
                            return true;
                        };
                        this.lift = function() {
                            return this;
                        };
                        this.isEqualTo = function(brother) {
                            if (brother==null) return false;
                            return brother.isEmpty();
                        };
                        this.get = function(alt) {
                            if (arguments.length==0) {
                                throw new root.core.cells.EmptyError();
                            }
                            return alt;
                        };
                    }
                    
                }
            },
            {
                path: ["core","algebra","GroupReducer"],
                content: function(root, expose) {
                    expose(GroupReducer, function() {
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                    });
                    
                    var None, Some;
                    
                    function GroupReducer(monoid, wrap, ignoreUnset) {
                        this.monoid = monoid;
                        this.wrap = wrap;
                        this.ignoreUnset = ignoreUnset;
                    
                        this.sum = monoid.identity();
                        this.value = new Some(this.sum);
                    
                        this.info = {};
                        this.blocks = 0;
                    }
                    
                    GroupReducer.prototype.add = function(key, value) {
                        if (this.info.hasOwnProperty(key)) {
                            throw new Error();
                        }
                        var info = {
                            blocked: value.isEmpty(),
                            last: value.isEmpty() ? this.monoid.identity() : this.wrap(value.value())
                        };
                        this.info[key] = info;
                        this.sum = this.monoid.add(this.sum, info.last);
                    
                        if (info.blocked) {
                            this.blocks++;
                        }
                    
                        if (this.blocks==0 || this.ignoreUnset) {
                            this.value = new Some(this.sum);
                        } else if (this.blocks==1) {
                            this.value = new None();
                        }
                    };
                    
                    GroupReducer.prototype.update = function(key, value) {
                        this.remove(key);
                        this.add(key, value);
                    };
                    
                    GroupReducer.prototype.remove = function(key) {
                        if (!this.info.hasOwnProperty(key)) {
                            throw new Error();
                        }
                        var info = this.info[key];
                        delete this.info[key];
                    
                        this.sum = this.monoid.add(this.sum, this.monoid.invert(info.last));
                    
                        if (info.blocked) {
                            this.blocks--;
                        }
                    
                        if (this.blocks==0 || this.ignoreUnset) {
                            this.value = new Some(this.sum);
                        }
                    };
                }
            },
            {
                path: ["core","algebra","MonoidReducer"],
                content: function(root, expose) {
                    expose(MonoidReducer, function() {
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                        MonoidTree = root.core.algebra.MonoidTree;
                    });
                    
                    var None, Some, MonoidTree;
                    
                    function MonoidReducer(monoid, wrap, ignoreUnset) {
                        this.monoid = monoid;
                        this.wrap = wrap;
                        this.ignoreUnset = ignoreUnset;
                    
                        this.value = new Some(monoid.identity());
                    
                        this.root = null;
                        this.keyToIndex = {};
                        this.indexToKey = [];
                    
                        this.info = {};
                        this.blocks = 0;
                    }
                    
                    MonoidReducer.prototype.add = function(key, value) {
                        if (this.info.hasOwnProperty(key)) {
                            throw new Error();
                        }
                        var info = {
                            blocked: value.isEmpty()
                        };
                        if (info.blocked) {
                            this.blocks++;
                        }
                        this.info[key] = info;
                    
                        value = value.isEmpty() ? this.monoid.identity() : this.wrap(value.get());
                    
                        this.keyToIndex[key] = MonoidTree.size(this.root);
                        this.indexToKey.push(key);
                        this.root = this.root==null ? MonoidTree.leaf(value) : this.root.put(this.monoid, value);
                        assert(MonoidTree.size(this.root) == this.indexToKey.length);
                    
                        if (this.blocks==0 || this.ignoreUnset) {
                            this.value = new Some(this.root.value);
                        } else if (this.blocks==1) {
                            this.value = new None();
                        }
                    };
                    
                    MonoidReducer.prototype.update = function(key, value) {
                        this.remove(key);
                        this.add(key, value);
                    };
                    
                    MonoidReducer.prototype.remove = function(key) {
                        if (!this.keyToIndex.hasOwnProperty(key)) {
                            throw new Error("Unknown key: " + key);
                        }
                        // the element being deleted is not the last
                        if (this.keyToIndex[key]+1 !== this.indexToKey.length) {
                            this.root = this.root.change(this.monoid, this.keyToIndex[key], this.root.peek());
                            var lastKey = this.indexToKey.pop();
                            this.indexToKey[this.keyToIndex[key]] = lastKey;
                            this.keyToIndex[lastKey] = this.keyToIndex[key];
                        } else {
                            this.indexToKey.pop();
                        }
                        this.root = this.root.pop(this.monoid);
                        delete this.keyToIndex[key];
                    
                        if (!this.info.hasOwnProperty(key)) {
                            throw new Error();
                        }
                        if (this.info[key].blocked) {
                            this.blocks--;
                        }
                        delete this.info[key];
                        if (this.blocks==0 || this.ignoreUnset) {
                            if (this.root == null) {
                                this.value = new Some(this.monoid.identity());
                            } else {
                                this.value = new Some(this.root.value);
                            }
                        }
                    };
                    
                    function assert(value) {
                        if (!value) throw new Error();
                    }
                }
            },
            {
                path: ["core","algebra","MonoidTree"],
                content: function(root, expose) {
                    expose(MonoidTree);
                    
                    function MonoidTree(value, size, left, right) {
                        this.value = value;
                        this.size = size;
                        this.left = left;
                        this.right = right;
                    }
                    MonoidTree.leaf = function(value) {
                        return new MonoidTree(value, 1, null, null);
                    };
                    MonoidTree.of = function(monoid, left, right) {
                        return new MonoidTree(monoid.add(left.value, right.value), left.size + right.size, left, right);
                    };
                    
                    MonoidTree.prototype.change = function(monoid, index, value) {
                        if (index === 0 && this.size === 1) {
                            return MonoidTree.leaf(value);
                        }
                        if (index < this.left.size) {
                            return MonoidTree.of(monoid, this.left.change(monoid, index, value), this.right);
                        } else {
                            return MonoidTree.of(monoid, this.left, this.right.change(monoid, index - this.left.size, value));
                        }
                    };
                    
                    MonoidTree.prototype.peek = function() {
                        return this.size === 1 ? this.value : this.right.peek();
                    };
                    
                    MonoidTree.prototype.put = function(monoid, value) {
                        assert (MonoidTree.size(this.left)>=MonoidTree.size(this.right));
                        var left, right;
                        if (MonoidTree.size(this.left)==MonoidTree.size(this.right)) {
                            left = this;
                            right = MonoidTree.leaf(value);
                        } else {
                            left = this.left;
                            right = this.right.put(monoid, value);
                        }
                        return MonoidTree.of(monoid, left, right);
                    };
                    
                    MonoidTree.prototype.pop = function(monoid) {
                        if (this.size==1) return null;
                        assert (this.right!=null);
                        assert (this.left!=null);
                        var right = this.right.pop(monoid);
                        if (right==null) {
                            return this.left;
                        } else {
                            return MonoidTree.of(monoid, this.left, right);
                        }
                    };
                    
                    MonoidTree.size = function(node) {
                        return node==null ? 0 : node.size;
                    };
                    
                    function assert(value) {
                        if (!value) throw new Error();
                    }
                }
            },
            {
                path: ["core","algebra","Reducer"],
                content: function(root, expose) {
                    expose(Reducer, function() {
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                    });
                    
                    var None, Some;
                    
                    function Reducer(monoid, wrap, ignoreUnset) {}
                    
                    Reducer.prototype.add = function(key, value) {
                    
                    };
                    
                    Reducer.prototype.update = function(key, value) {
                    
                    };
                    
                    Reducer.prototype.remove = function(key) {
                    
                    };
                }
            },
            {
                path: ["core","cells","AggregatedCell"],
                content: function(root, expose) {
                    expose(AggregatedCell, function(){
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                        BaseCell = root.core.cells.BaseCell;
                        List = root.core.lists.List;
                        DAG = root.core.dag.DAG;
                        event_broker = root.core.event_broker;
                        tracker = root.core.tracker;
                        Matter = root.core.Matter;
                    
                        SetPrototype();
                    });
                    
                    var DAG, None, Some, BaseCell, List, Matter, event_broker, tracker;
                    
                    function AggregatedCell(list, Reducer, algebraicStructure, wrap, unwrap, ignoreUnset) {
                        BaseCell.apply(this);
                        this.attach(AggregatedCell);
                    
                        this.list = list;
                        this.Reducer = Reducer;
                    
                        this.itemIdToNodeId = {};
                        this.nodeIdToItemIds = {};
                        this.dependencies = {};
                        this.reducer = null;
                        this.content = null;
                    
                        this._monoid = algebraicStructure;
                        this._wrap = wrap;
                        this._unwrap = unwrap;
                        this._ignoreUnset = ignoreUnset;
                    }
                    
                    
                    function SetPrototype() {
                        AggregatedCell.prototype = new BaseCell();
                    
                        // dependenciesChanged is being called during propagating only (!)
                    
                        AggregatedCell.prototype.dependenciesChanged = function() {
                            // guard
                            for (var nodeId in this.changed) {
                                if (!this.changed.hasOwnProperty(nodeId)) continue;
                                if (nodeId == this.list.nodeId) continue;
                                if (!this.dependencies.hasOwnProperty(nodeId)) {
                                    throw new Error();
                                }
                                if (!this.nodeIdToItemIds.hasOwnProperty(nodeId)) {
                                    throw new Error();
                                }
                            }
                    
                            if (this.changed.hasOwnProperty(this.list.nodeId)) {
                                for (var i=0;i<this.changed[this.list.nodeId].length;i++) {
                                    var change = this.changed[this.list.nodeId][i];
                                    if (change[0]=="reset") {
                                        var data = change[1];
                                        this._dispose();
                                        this.reducer = new this.Reducer(this._monoid, this._wrap, this._ignoreUnset);
                                        for (var j=0;j<data.length;j++) {
                                            this._addItem(data[j].key, data[j].value);
                                        }
                                    } else if (change[0]=="add") {
                                        var item = change[1];
                                        this._addItem(item.key, item.value);
                                    } else if (change[0]=="remove") {
                                        var key = change[1];
                                        this._removeItem(key);
                                    } else {
                                        throw new Error("Unknown event: " + change[0]);
                                    }
                                }
                                delete this.changed[this.list.nodeId];
                            }
                    
                            for (var nodeId in this.changed) {
                                if (!this.changed.hasOwnProperty(nodeId)) continue;
                                if (!this.dependencies.hasOwnProperty(nodeId)) {
                                    continue;
                                }
                                if (!this.nodeIdToItemIds.hasOwnProperty(nodeId)) {
                                    continue;
                                }
                    
                                for (var i=0;i<this.changed[nodeId].length;i++) {
                                    var change = this.changed[nodeId][i];
                                    for (var j=0;j<this.nodeIdToItemIds[nodeId].length;j++) {
                                        var itemId = this.nodeIdToItemIds[nodeId][j];
                                        this.reducer.update(itemId, change);
                                    }
                                }
                            }
                    
                            this.changed = {};
                    
                            var value = this.reducer.value.lift(this._unwrap);
                            if (value.isEqualTo(this.content)) {
                                return { hasChanges: false };
                            }
                            this.content = value;
                            this._putEventToDependants(this.content.isEmpty() ? ["unset"] : ["set", this.content.value()]);
                            event_broker.notify(this);
                    
                            return {
                                hasChanges: true,
                                changeSet: [this.content]
                            };
                        };
                    
                        // _leak & _seal are called only by onChange
                    
                        AggregatedCell.prototype._leak = function(id) {
                            BaseCell.prototype._leak.apply(this, [id]);
                    
                            if (this.usersCount === 1) {
                                DAG.addNode(this);
                                this.list._leak(this.nodeId);
                                DAG.addRelation(this.list, this);
                    
                                this.reducer = new this.Reducer(this._monoid, this._wrap, this._ignoreUnset);
                                for (var j=0;j<this.list.data.length;j++) {
                                    this._addItem(this.list.data[j].key, this.list.data[j].value);
                                }
                                this.content = this.reducer.value.lift(this._unwrap);
                            }
                        };
                    
                        AggregatedCell.prototype._seal = function(id) {
                            id = arguments.length==0 ? this.nodeId : id;
                            BaseCell.prototype._seal.apply(this, [id]);
                    
                            if (this.usersCount === 0) {
                                this._dispose();
                                DAG.removeRelation(this.list, this);
                                this.list._seal(this.nodeId);
                                DAG.removeNode(this);
                                this.content = null;
                            }
                        };
                    
                        // gets
                    
                        AggregatedCell.prototype.hasValue = function() {
                            var marker = {};
                            return this.get(marker) !== marker;
                        };
                    
                        AggregatedCell.prototype.get = function(alt) {
                            tracker.track(this);
                    
                            var value = this.content;
                            if (this.usersCount===0) {
                                var reducer = new this.Reducer(this._monoid, this._wrap, this._ignoreUnset);
                                var data = this.list.get();
                                var marker = {};
                                var id = 0;
                                for (var i=0;i<data.length;i++) {
                                    if (data[i].metaType === Matter && data[i].instanceof(BaseCell)) {
                                        var item = data[i].get(marker);
                                        if (item===marker) {
                                            reducer.add(id++, new None());
                                        } else {
                                            reducer.add(id++, new Some(item));
                                        }
                                    } else {
                                        reducer.add(id++, new Some(data[i]));
                                    }
                                }
                                value = reducer.value;
                            }
                            return value.get.apply(value, arguments);
                        };
                    
                        // internal
                    
                        AggregatedCell.prototype._dispose = function() {
                            for (var nodeId in this.dependencies) {
                                if (!this.dependencies.hasOwnProperty(nodeId)) continue;
                                DAG.removeRelation(this.dependencies[nodeId], this);
                                this.dependencies[nodeId]._seal(this.nodeId);
                            }
                            this.itemIdToNodeId = {};
                            this.nodeIdToItemIds = {};
                            this.dependencies = {};
                            this.reducer = null;
                            this.content = null;
                        };
                    
                        AggregatedCell.prototype._addItem = function(key, value) {
                            if (value.metaType === Matter && value.instanceof(BaseCell)) {
                                if (this.itemIdToNodeId.hasOwnProperty(key)) {
                                    throw new Error();
                                }
                                this.itemIdToNodeId[key] = value.nodeId;
                                if (!this.nodeIdToItemIds.hasOwnProperty(value.nodeId)) {
                                    this.nodeIdToItemIds[value.nodeId] = [];
                                }
                                this.nodeIdToItemIds[value.nodeId].push(key);
                    
                                if (this.nodeIdToItemIds[value.nodeId].length==1) {
                                    this.dependencies[value.nodeId] = value;
                                    value._leak(this.nodeId);
                                    DAG.addRelation(value, this);
                                }
                    
                                this.reducer.add(key, value.content);
                            } else {
                                this.reducer.add(key, new Some(value));
                            }
                        };
                    
                        AggregatedCell.prototype._removeItem = function(key) {
                            this.reducer.remove(key);
                            if (this.itemIdToNodeId.hasOwnProperty(key)) {
                                var nodeId = this.itemIdToNodeId[key];
                                if (!this.nodeIdToItemIds.hasOwnProperty(nodeId)) {
                                    throw new Error();
                                }
                                this.nodeIdToItemIds[nodeId] = this.nodeIdToItemIds[nodeId].filter(function(item){
                                    return item != key;
                                });
                                if (this.nodeIdToItemIds[nodeId].length==0) {
                                    var node = this.dependencies[nodeId];
                                    DAG.removeRelation(node, this);
                                    node._seal(this.nodeId);
                                    delete this.dependencies[nodeId];
                                    delete this.nodeIdToItemIds[nodeId];
                                }
                            }
                            delete this.itemIdToNodeId[key];
                        };
                    }
                    
                }
            },
            {
                path: ["core","cells","BaseCell"],
                content: function(root, expose) {
                    expose(BaseCell, function(){
                        Matter = root.core.Matter;
                        Node = root.core.dag.Node;
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                        event_broker = root.core.event_broker;
                        tracker = root.core.tracker;
                        EmptyError = root.core.cells.EmptyError;
                        DAG = root.core.dag.DAG;
                        uid = root.uid;
                        empty = root.empty;
                    });
                    
                    var Matter, Node, None, Some, event_broker, EmptyError, DAG, tracker, uid, empty;
                    
                    function BaseCell() {
                        root.core.Matter.apply(this, []);
                        root.core.dag.Node.apply(this, []);
                        this.attach(BaseCell);
                    
                        this.dependants = [];
                        this.users = {};
                        this.usersCount = 0;
                    }
                    
                    BaseCell.prototype.sendAllMessages = function() {
                        for (var i=0;i<this.dependants.length;i++) {
                            this.sendItsMessages(this.dependants[i]);
                        }
                    };
                    
                    BaseCell.prototype.sendItsMessages = function(dependant) {
                        if (dependant.disabled) return;
                        if (dependant.mailbox.length==0) return;
                        var event = dependant.mailbox[dependant.mailbox.length - 1];
                        dependant.mailbox = [];
                        dependant.f(this, event, dependant.dispose);
                    };
                    
                    BaseCell.prototype.onChange = function(f) {
                        if (!event_broker.isOnProcessCall) {
                            return event_broker.invokeOnProcess(this, this.onChange, [f]);
                        }
                    
                        this._leak(this.nodeId);
                    
                        var self = this;
                    
                        var dependant = {
                            key: uid(),
                            f: function(obj, event, dispose) {
                                if (this.disposed) return;
                                f(obj, event, dispose);
                            },
                            disposed: false,
                            mailbox: [ this.content.isEmpty() ? ["unset"] : ["set", this.content.value()]],
                            dispose: function() {
                                if (dependant.disposed) return;
                                self._seal(self.nodeId);
                                dependant.disposed = true;
                                self.dependants = self.dependants.filter(function(d) {
                                    return d.key != dependant.key;
                                });
                            }
                        };
                    
                        this.dependants.push(dependant);
                    
                        if (this.usersCount > 0) {
                            event_broker.notifySingle(this, dependant);
                        }
                    
                        return dependant.dispose;
                    };
                    
                    BaseCell.prototype._leak = function(id) {
                        if (!this.users.hasOwnProperty(id)) {
                            this.users[id] = 0;
                        }
                        this.users[id]++;
                        this.usersCount++;
                    };
                    
                    BaseCell.prototype._seal = function(id) {
                        if (!this.users.hasOwnProperty(id)) {
                            throw new Error();
                        }
                        if (this.users[id]===0) {
                            throw new Error();
                        }
                        this.users[id]--;
                        this.usersCount--;
                        if (this.users[id]===0) {
                            delete this.users[id];
                        }
                    };
                    
                    BaseCell.prototype._putEventToDependants = function(event) {
                        for (var i=0;i<this.dependants.length;i++) {
                            this.dependants[i].mailbox.push(event);
                        }
                    };
                    
                    // extensions
                    
                    BaseCell.prototype.coalesce = function(value) {
                        return root.do(function(){
                            return this.get(value);
                        }, this);
                    };
                    
                    BaseCell.prototype.lift = function(f) {
                        return root.do(function(){
                            return f(this.get());
                        }, this);
                    };
                    
                    BaseCell.prototype.isSet = function() {
                        return root.do(function(){
                            return this.hasValue();
                        }, this);
                    };
                    
                    BaseCell.prototype.when = function(condition, transform, alternative) {
                        var test = typeof condition === "function" ? condition : function(value) {
                            return value === condition;
                        };
                    
                        var map = null;
                        if (arguments.length > 1) {
                            map = typeof transform === "function" ? transform : function() { return transform; };
                        }
                    
                        var alt = null;
                        if (arguments.length==3) {
                            alt = typeof alternative === "function" ? alternative : function() { return alternative; };
                        }
                    
                        return root.do(function(){
                            var value = this.get();
                            if (test(value)) {
                                return map != null ? map(value) : value;
                            } else {
                                return alt != null ? alt(value) : empty();
                            }
                        }, this);
                    };
                    
                    BaseCell.prototype.onSet = function(callback) {
                        return this.onChange(function(cell, event){
                            if (event[0]==="set") {
                                callback(cell, event);
                            }
                        });
                    };
                    
                    BaseCell.prototype.on = function(value, callback) {
                        return this.onChange(function(cell){
                            if (cell.hasValue() && cell.get()===value) {
                                callback(cell);
                            }
                        });
                    };
                }
            },
            {
                path: ["core","cells","Cell"],
                content: function(root, expose) {
                    expose(Cell, function(){
                        BaseCell = root.core.cells.BaseCell;
                        Matter = root.core.Matter;
                        Node = root.core.dag.Node;
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                        event_broker = root.core.event_broker;
                        tracker = root.core.tracker;
                        EmptyError = root.core.cells.EmptyError;
                        DAG = root.core.dag.DAG;
                    
                        SetCellPrototype();
                    });
                    
                    var BaseCell, Matter, Node, None, Some, event_broker, EmptyError, DAG, tracker;
                    
                    function Cell() {
                        BaseCell.apply(this, []);
                        this.attach(Cell);
                    
                        if (arguments.length!=0) {
                            this.content = new Some(arguments[0]);
                        } else {
                            this.content = new None();
                        }
                    }
                    
                    function SetCellPrototype() {
                        Cell.prototype = new BaseCell();
                    
                        // set and unset called only outside of propagating
                    
                        Cell.prototype.set = function(value) {
                            event_broker.postponeChange(this, {value: value});
                        };
                    
                        Cell.prototype.unset = function() {
                            event_broker.postponeChange(this, null);
                        };
                    
                        Cell.prototype.applyChange = function(change) {
                            if (change == null) {
                                return this._update(new None(), ["unset"]);
                            } else {
                                return this._update(new Some(change.value), ["set", change.value]);
                            }
                        };
                    
                        // dependenciesChanged is being called during propagating only (!)
                    
                        Cell.prototype.dependenciesChanged = function() {
                            return {
                                hasChanges: true,
                                changeSet: [this.content]
                            };
                        };
                    
                        // _leak & _seal are called only by onChange
                    
                        Cell.prototype._leak = function(id) {
                            BaseCell.prototype._leak.apply(this, [id]);
                    
                            if (this.usersCount===1) {
                                DAG.addNode(this);
                            }
                        };
                    
                        Cell.prototype._seal = function(id) {
                            BaseCell.prototype._seal.apply(this, [id]);
                    
                            if (this.usersCount===0) {
                                DAG.removeNode(this);
                            }
                        };
                    
                        // gets
                    
                        Cell.prototype.hasValue = function() {
                            tracker.track(this);
                    
                            return !this.content.isEmpty();
                        };
                    
                        Cell.prototype.get = function(alt) {
                            tracker.track(this);
                    
                            if (arguments.length==0 && this.content.isEmpty()) {
                                throw new EmptyError();
                            }
                            return this.content.isEmpty() ? alt : this.content.value();
                        };
                    
                        // internals
                    
                        Cell.prototype._update = function(value, event) {
                            if (this.content.isEqualTo(value)) return false;
                    
                            this.content = value;
                            if (this.usersCount>0) {
                                this._putEventToDependants(event);
                                event_broker.notify(this);
                            }
                            return true;
                        };
                    }
                    
                }
            },
            {
                path: ["core","cells","DependentCell"],
                content: function(root, expose) {
                    expose(DependentCell, function(){
                        Matter = root.core.Matter;
                        Node = root.core.dag.Node;
                        None = root.core.adt.maybe.None;
                        Some = root.core.adt.maybe.Some;
                        event_broker = root.core.event_broker;
                        tracker = root.core.tracker;
                        EmptyError = root.core.cells.EmptyError;
                        DAG = root.core.dag.DAG;
                        BaseCell = root.core.cells.BaseCell;
                    
                        SetDependentCellPrototype();
                    });
                    
                    var Matter, Node, None, Some, event_broker, tracker, EmptyError, DAG, BaseCell;
                    
                    function DependentCell(f, context) {
                        BaseCell.apply(this, []);
                        this.attach(DependentCell);
                    
                        this.dependants = [];
                        this.users = {};
                        this.usersCount = 0;
                        this.f = f;
                        this.context = context;
                        this.dependencies = null;
                        this.content = null;
                    }
                    
                    function SetDependentCellPrototype() {
                        DependentCell.prototype = new BaseCell();
                    
                        // dependenciesChanged is being called during propagating only (!)
                    
                        DependentCell.prototype.dependenciesChanged = function() {
                            var i;
                            var known = {};
                            for (i=0;i<this.dependencies.length;i++) {
                                known[this.dependencies[i].nodeId] = this.dependencies[i];
                            }
                    
                            var value, tracked, nova = {};
                            tracker.inScope(function(){
                                try {
                                    value = new Some(this.f.apply(this.context, []));
                                } catch (e) {
                                    if (e instanceof EmptyError) {
                                        value = new None();
                                    } else {
                                        throw e;
                                    }
                                }
                                tracked = tracker.tracked;
                            }, this);
                    
                            var deleted = [];
                            var added = [];
                            for (i=0;i<tracked.length;i++) {
                                nova[tracked[i].nodeId] = tracked[i];
                                if (!known.hasOwnProperty(tracked[i].nodeId)) {
                                    added.push(tracked[i]);
                                }
                            }
                            for (i=0;i<this.dependencies.length;i++) {
                                if (!nova.hasOwnProperty(this.dependencies[i].nodeId)) {
                                    deleted.push(this.dependencies[i]);
                                }
                            }
                    
                            for (i=0;i<deleted.length;i++) {
                                DAG.removeRelation(deleted[i], this);
                                deleted[i]._seal(this.nodeId);
                            }
                            for (i=0;i<added.length;i++) {
                                added[i]._leak(this.nodeId);
                                DAG.addRelation(added[i], this);
                            }
                    
                            this.dependencies = tracked;
                            this.changed = {};
                    
                            if (this.content.isEmpty() && value.isEmpty()) {
                                return { hasChanges: false };
                            }
                            if (!this.content.isEmpty() && !value.isEmpty()) {
                                if (this.content.value() === value.value()) {
                                    return { hasChanges: false };
                                }
                            }
                            this.content = value;
                            this._putEventToDependants(this.content.isEmpty() ? ["unset"] : ["set", this.content.value()]);
                            event_broker.notify(this);
                    
                            return {
                                hasChanges: true,
                                changeSet: [this.content]
                            };
                        };
                    
                        // _leak & _seal are called only by onChange
                    
                        DependentCell.prototype._leak = function(id) {
                            BaseCell.prototype._leak.apply(this, [id]);
                    
                            if (this.usersCount===1) {
                                tracker.inScope(function(){
                                    try {
                                        this.content = new Some(this.f.apply(this.context, []));
                                    } catch (e) {
                                        if (e instanceof EmptyError) {
                                            this.content = new None();
                                        } else {
                                            throw e;
                                        }
                                    }
                                    this.dependencies = tracker.tracked;
                                }, this);
                    
                                DAG.addNode(this);
                                for (var i=0;i<this.dependencies.length;i++) {
                                    this.dependencies[i]._leak(this.nodeId);
                                    DAG.addRelation(this.dependencies[i], this);
                                }
                            }
                        };
                    
                        DependentCell.prototype._seal = function(id) {
                            BaseCell.prototype._seal.apply(this, [id]);
                    
                            if (this.usersCount===0) {
                                for (var i=0;i<this.dependencies.length;i++) {
                                    DAG.removeRelation(this.dependencies[i], this);
                                    this.dependencies[i]._seal(this.nodeId);
                                }
                                DAG.removeNode(this);
                                this.dependencies = null;
                                this.content = null;
                            }
                        };
                    
                        // gets
                    
                        DependentCell.prototype.hasValue = function() {
                            var marker = {};
                            return this.get(marker) !== marker;
                        };
                    
                        DependentCell.prototype.get = function(alt) {
                            tracker.track(this);
                    
                            var args = arguments.length==0 ? [] : [alt];
                    
                            var value = this.content;
                            if (this.usersCount===0) {
                                value = tracker.outScope(function(){
                                    try {
                                        return new Some(this.f.apply(this.context, []));
                                    } catch (e) {
                                        if (e instanceof EmptyError) {
                                            return new None();
                                        } else {
                                            throw e;
                                        }
                                    }
                                }, this);
                            }
                    
                            return unwrap.apply(value, args);
                        };
                    
                        function unwrap(alt) {
                            if (arguments.length==0 && this.isEmpty()) {
                                throw new EmptyError();
                            }
                            return this.isEmpty() ? alt : this.value();
                        }
                    }
                }
            },
            {
                path: ["core","cells","EmptyError"],
                content: function(root, expose) {
                    expose(EmptyError);
                    
                    function EmptyError() {
                    }
                    
                }
            },
            {
                path: ["core","dag","DAG"],
                content: function(root, expose) {
                    var dag = new DAG();
                    
                    expose(dag, function(){
                        Node = root.core.dag.Node;
                        Set = root.core.adt.Set;
                        SortedList = root.core.adt.SortedList;
                        event_broker = root.core.event_broker;
                    
                        dag.reset();
                    });
                    
                    var Node, SortedList, Set, event_broker;
                    
                    function DAG() {}
                    
                    DAG.prototype.reset = function() {
                        this.nodes = {};
                        this.length = 0;
                        this.dependencies = {};
                        this.dependants = {};
                    
                        this.changed = new SortedList(function(a,b){
                            return a.nodeRank - b.nodeRank;
                        });
                    };
                    
                    DAG.prototype.addNode = function(node) {
                        if (knownNode(this, node)) {
                            throw new Error();
                        }
                        this.nodes[node.nodeId] = node;
                        this.dependencies[node.nodeId] = [];
                        this.dependants[node.nodeId] = [];
                        this.length++;
                    };
                    
                    DAG.prototype.removeNode = function(node) {
                        if (!knownNode(this, node)) {
                            throw new Error();
                        }
                        if (this.dependants[node.nodeId].length!=0) {
                            throw new Error();
                        }
                        if (this.dependencies[node.nodeId].length!=0) {
                            throw new Error();
                        }
                        delete this.nodes[node.nodeId];
                        delete this.dependants[node.nodeId];
                        delete this.dependencies[node.nodeId];
                        this.length--;
                    };
                    
                    DAG.prototype.addRelation = function(from, to) {
                        if (inRelation(this, from, to) || inRelation(this, to, from)) {
                            throw new Error();
                        }
                        this.dependencies[to.nodeId].push(from.nodeId);
                        this.dependants[from.nodeId].push(to.nodeId);
                        calcRank(this, to);
                    };
                    
                    DAG.prototype.removeRelation = function(from, to) {
                        if (!inRelation(this, from, to)) {
                            throw new Error();
                        }
                    
                        var len = this.dependencies[to.nodeId].length;
                        this.dependencies[to.nodeId] = this.dependencies[to.nodeId].filter(function(item){
                            return item != from.nodeId;
                        });
                        if (len != this.dependencies[to.nodeId].length+1) throw new Error();
                    
                        len = this.dependants[from.nodeId].length;
                        this.dependants[from.nodeId] = this.dependants[from.nodeId].filter(function(item){
                            return item != to.nodeId;
                        });
                        if (len != this.dependants[from.nodeId].length+1) throw new Error();
                    
                        calcRank(this, to);
                    };
                    
                    DAG.prototype.notifyChanged = function(node) {
                        if (!knownNode(this, node)) {
                            throw new Error();
                        }
                        this.changed.push(node);
                    };
                    
                    DAG.prototype.propagate = function() {
                        while (this.changed.length>0) {
                            var front = this.changed.pop();
                            var info = front.dependenciesChanged();
                            if (!info.hasChanges) continue;
                    
                            for (var i=0;i<this.dependants[front.nodeId].length;i++) {
                                var node = this.nodes[this.dependants[front.nodeId][i]];
                                if (!node.changed.hasOwnProperty(front.nodeId)) {
                                    node.changed[front.nodeId] = [];
                                }
                                for (var j=0;j<info.changeSet.length;j++) {
                                    node.changed[front.nodeId].push(info.changeSet[j]);
                                }
                                this.changed.push(node);
                            }
                        }
                    };
                    
                    function knownNode(dag, node) {
                        if (!node.instanceof(Node)) {
                            throw new Error();
                        }
                        return dag.nodes.hasOwnProperty(node.nodeId);
                    }
                    
                    function inRelation(dag, from, to) {
                        if (!knownNode(dag, from) || !knownNode(dag, to)) {
                            throw new Error();
                        }
                        if (dag.dependencies[to.nodeId].indexOf(from.nodeId) >= 0) {
                            if (dag.dependants[from.nodeId].indexOf(to.nodeId)<0) {
                                throw new Error();
                            }
                            return true;
                        } else {
                            if (dag.dependants[from.nodeId].indexOf(to.nodeId)>=0) {
                                throw new Error();
                            }
                        }
                        return false;
                    }
                    
                    function calcRank(dag, node) {
                        var rank = 0;
                        dag.dependencies[node.nodeId].forEach(function(nodeId){
                            rank = Math.max(dag.nodes[nodeId].nodeRank+1, rank);
                        });
                        node.nodeRank = rank;
                    }
                }
            },
            {
                path: ["core","dag","Node"],
                content: function(root, expose) {
                    expose(Node, function(){});
                    
                    
                    function Node() {
                        this.attach(Node);
                        this.nodeId = root.uid();
                        this.changed = {};
                        this.delta = null;
                        this.nodeRank = 0;
                    }
                    
                }
            },
            {
                path: ["core","event_broker"],
                content: function(root, expose) {
                    expose(new EventBroker());
                    
                    function EventBroker() {
                        this.changeRequests = [];
                    
                        // TODO: replace to set
                        this.nodesToNotify = [];
                        this.dependantsToNotify = [];
                    
                        this.active = false;
                        this.isOnProcessCall = false;
                    }
                    
                    EventBroker.prototype.postponeChange = function(node, change) {
                        this.changeRequests.push({
                            node: node,
                            change: change
                        });
                        this.loop();
                    };
                    
                    EventBroker.prototype.notify = function(node) {
                        this.nodesToNotify.push(node);
                    };
                    
                    EventBroker.prototype.call = function(context, f, args) {
                        if (this.active) {
                            f.apply(context, args);
                        } else {
                            this.active = true;
                            f.apply(context, args);
                            this.active = false;
                            this.loop();
                        }
                    };
                    
                    EventBroker.prototype.notifySingle = function(node, dependant) {
                        this.dependantsToNotify.push({node: node, dependant: dependant});
                    };
                    
                    // TODO: merge with call
                    EventBroker.prototype.invokeOnProcess = function(obj, f, args) {
                        if (this.isOnProcessCall) {
                            return f.apply(obj, args);
                        } else {
                            this.isOnProcessCall = true;
                            var result = f.apply(obj, args);
                            this.isOnProcessCall = false;
                            this.loop();
                            return result;
                        }
                    };
                    
                    EventBroker.prototype.loop = function() {
                        if (this.active) return;
                        this.active = true;
                    
                        while(this.changeRequests.length + this.nodesToNotify.length + this.dependantsToNotify.length > 0) {
                            var hasChanges = false;
                            while (this.changeRequests.length!=0) {
                                var request = this.changeRequests.shift();
                                if (request.node.applyChange(request.change)) {
                                    hasChanges = true;
                                    if (request.node.usersCount > 0) {
                                        root.core.dag.DAG.notifyChanged(request.node);
                                    }
                                }
                            }
                            if (hasChanges) {
                                root.core.dag.DAG.propagate();
                            }
                            if (this.nodesToNotify.length!=0) {
                                var node = this.nodesToNotify.shift();
                                node.sendAllMessages();
                                continue;
                            }
                            if (this.dependantsToNotify.length!=0) {
                                var info = this.dependantsToNotify.shift();
                                info.node.sendItsMessages(info.dependant);
                                continue;
                            }
                        }
                    
                        this.active = false;
                    };
                    
                }
            },
            {
                path: ["core","lists","BaseList"],
                content: function(root, expose) {
                    expose(BaseList, function() {
                        uid = root.uid;
                        event_broker = root.core.event_broker;
                        Matter = root.core.Matter;
                        AggregatedCell = root.core.cells.AggregatedCell;
                        GroupReducer = root.core.algebra.GroupReducer;
                        MonoidReducer = root.core.algebra.MonoidReducer;
                        LiftedList = root.core.lists.LiftedList;
                        BaseCell = root.core.cells.BaseCell;
                    });
                    
                    var uid, event_broker, Matter, AggregatedCell, GroupReducer, MonoidReducer, LiftedList, BaseCell;
                    
                    function BaseList() {
                        root.core.Matter.apply(this, []);
                        root.core.dag.Node.apply(this, []);
                        this.attach(BaseList);
                    
                        this.dependants = [];
                        this.data = [];
                        this.users = {};
                        this.usersCount = 0;
                    }
                    
                    BaseList.prototype.sendAllMessages = function() {
                        for (var i=0;i<this.dependants.length;i++) {
                            this.sendItsMessages(this.dependants[i]);
                        }
                    };
                    
                    BaseList.prototype.sendItsMessages = function(dependant) {
                        if (dependant.disabled) return;
                        if (dependant.mailbox.length==0) return;
                        for (var i=0;i<dependant.mailbox.length;i++) {
                            dependant.f(this, dependant.mailbox[i]);
                        }
                        dependant.mailbox = [];
                    };
                    
                    BaseList.prototype.onChange = function(f) {
                        if (!event_broker.isOnProcessCall) {
                            return event_broker.invokeOnProcess(this, this.onChange, [f]);
                        }
                    
                        this._leak(this.nodeId);
                    
                        var self = this;
                    
                        var dependant = {
                            key: uid(),
                            f: function(list, event) {
                                if (this.disposed) return;
                                f(list, event);
                            },
                            disposed: false,
                            mailbox: [ ["reset", this.data.slice()] ]
                        };
                    
                        this.dependants.push(dependant);
                    
                        if (this.usersCount > 0) {
                            event_broker.notifySingle(this, dependant);
                        }
                    
                        return function() {
                            if (dependant.disposed) return;
                            self._seal(self.nodeId);
                            dependant.disposed = true;
                            self.dependants = self.dependants.filter(function(d) {
                                return d.key != dependant.key;
                            });
                        };
                    };
                    
                    BaseList.prototype._leak = function(id) {
                        if (!this.users.hasOwnProperty(id)) {
                            this.users[id] = 0;
                        }
                        this.users[id]++;
                        this.usersCount++;
                    };
                    
                    BaseList.prototype._seal = function(id) {
                        if (!this.users.hasOwnProperty(id)) {
                            throw new Error();
                        }
                        if (this.users[id]===0) {
                            throw new Error();
                        }
                        this.users[id]--;
                        this.usersCount--;
                        if (this.users[id]===0) {
                            delete this.users[id];
                        }
                    };
                    
                    BaseList.prototype._putEventToDependants = function(event) {
                        for (var i=0;i<this.dependants.length;i++) {
                            this.dependants[i].mailbox.push(event);
                        }
                    };
                    
                    
                    BaseList.prototype.reduceGroup = function(group, opt) {
                        if (!opt) opt = {};
                        if (!opt.hasOwnProperty("wrap")) opt.wrap = function(x) { return x; };
                        if (!opt.hasOwnProperty("unwrap")) opt.unwrap = function(x) { return x; };
                        if (!opt.hasOwnProperty("ignoreUnset")) opt.ignoreUnset = false;
                    
                        return new AggregatedCell(this, GroupReducer, group, opt.wrap, opt.unwrap, opt.ignoreUnset);
                    };
                    
                    BaseList.prototype.reduceMonoid = function(monoid, opt) {
                        if (!opt) opt = {};
                        if (!opt.hasOwnProperty("wrap")) opt.wrap = function(x) { return x; };
                        if (!opt.hasOwnProperty("unwrap")) opt.unwrap = function(x) { return x; };
                        if (!opt.hasOwnProperty("ignoreUnset")) opt.ignoreUnset = false;
                    
                        return new AggregatedCell(this, MonoidReducer, monoid, opt.wrap, opt.unwrap, opt.ignoreUnset);
                    };
                    
                    BaseList.prototype.lift = function(f) {
                        return new LiftedList(this, f);
                    };
                    
                    // extensions
                    
                    BaseList.prototype.reduce = function(identity, add, opt) {
                        return this.reduceMonoid({
                            identity: function() {return identity; },
                            add: add
                        }, opt);
                    };
                    
                    BaseList.prototype.all = function(predicate) {
                        return this.lift(predicate).reduceGroup({
                            identity: function() { return [0,0]; },
                            add: function(x,y) { return [x[0]+y[0],x[1]+y[1]]; },
                            invert: function(x) { return [-x[0],-x[1]]; }
                        },{
                            wrap: function(x) { return checkBool(x) ? [1,1] : [0,1]; },
                            unwrap: function(x) { return x[0]==x[1]; }
                        });
                    };
                    
                    BaseList.prototype.count = function() {
                        var predicate = arguments.length===0 ? function() { return true; } : arguments[0];
                    
                        return this.lift(function(x){
                            x = predicate(x);
                            if (x.metaType === Matter && x.instanceof(BaseCell)) {
                                return x.lift(function(x) { return checkBool(x) ? 1 : 0; });
                            }
                            return checkBool(x) ? 1 : 0;
                        }).reduceGroup({
                            identity: function() { return 0; },
                            add: function(x,y) { return x+y; },
                            invert: function(x) { return -x; }
                        });
                    };
                    
                    function checkBool(x) {
                        if (typeof x == "boolean") return x;
                        throw new Error();
                    }
                }
            },
            {
                path: ["core","lists","LiftedList"],
                content: function(root, expose) {
                    expose(LiftedList, function(){
                        BaseList = root.core.lists.BaseList;
                        event_broker = root.core.event_broker;
                        DAG = root.core.dag.DAG;
                    
                        SetLiftedPrototype();
                    });
                    
                    var BaseList, event_broker, DAG;
                    
                    function LiftedList(source, f) {
                        BaseList.apply(this);
                        this.attach(LiftedList);
                    
                        this.source = source;
                        this.f = f;
                        this.data = null;
                    }
                    
                    function SetLiftedPrototype() {
                        LiftedList.prototype = new BaseList();
                    
                        // dependenciesChanged is being called during propagating only (!)
                    
                        LiftedList.prototype.dependenciesChanged = function() {
                            if (!this.changed.hasOwnProperty(this.source.nodeId)) {
                                throw new Error();
                            }
                    
                            var changesIn  = this.changed[this.source.nodeId];
                            var info = {
                                hasChanges: true,
                                changeSet: []
                            };
                    
                            for (var i=0;i<changesIn.length;i++) {
                                var change = changesIn[i];
                                if (change[0]=="reset") {
                                    this.data = [];
                                    for (var j=0;j<change[1].length;j++) {
                                        this.data.push({
                                            key: change[1][j].key,
                                            value: this.f(change[1][j].value)
                                        });
                                    }
                                    info.changeSet.push(["reset", this.data.slice()]);
                                    this._putEventToDependants(["reset", this.data.slice()]);
                                } else if (change[0]=="add") {
                                    var added = {
                                        key: change[1].key,
                                        value: this.f(change[1].value)
                                    };
                                    this.data.push(added);
                                    info.changeSet.push(["add", added]);
                                    this._putEventToDependants(["add", added]);
                                } else if (change[0]=="remove") {
                                    var nova = [];
                                    for (var k=0;k<this.data.length;k++) {
                                        if (this.data[k].key===change[1]) continue;
                                        nova.push(this.data[k]);
                                    }
                                    this.data = nova;
                                    info.changeSet.push(["remove", change[1]]);
                                    this._putEventToDependants(["remove", change[1]]);
                                } else {
                                    throw new Error("Unknown event: " + change[0]);
                                }
                            }
                            event_broker.notify(this);
                    
                            this.changed = {};
                    
                            return info;
                        };
                    
                        // _leak & _seal are called only by onChange
                    
                        LiftedList.prototype._leak = function(id) {
                            BaseList.prototype._leak.apply(this, [id]);
                    
                            if (this.usersCount === 1) {
                                DAG.addNode(this);
                                this.source._leak(this.nodeId);
                                DAG.addRelation(this.source, this);
                    
                                this.data = [];
                                for (var j=0;j<this.source.data.length;j++) {
                                    this.data.push({
                                        key: this.source.data[j].key,
                                        value: this.f(this.source.data[j].value)
                                    });
                                }
                            }
                        };
                    
                        LiftedList.prototype._seal = function(id) {
                            id = arguments.length==0 ? this.nodeId : id;
                            BaseList.prototype._seal.apply(this, [id]);
                    
                            if (this.usersCount === 0) {
                                DAG.removeRelation(this.source, this);
                                this.source._seal(this.nodeId);
                                DAG.removeNode(this);
                                this.data = null;
                            }
                        };
                    
                        // gets
                    
                        LiftedList.prototype.get = function() {
                            if (this.usersCount > 0) {
                                return this.data.map(function(item){
                                    return item.value;
                                });
                            } else {
                                var data = this.source.get();
                                var result = [];
                                for (var j=0;j<data.length;j++) {
                                    result.push(this.f(data[j]));
                                }
                                return result;
                            }
                        };
                    }
                }
            },
            {
                path: ["core","lists","List"],
                content: function(root, expose) {
                    expose(List, function(){
                        BaseList = root.core.lists.BaseList;
                        uid = root.uid;
                        event_broker = root.core.event_broker;
                        DAG = root.core.dag.DAG;
                    
                        SetListPrototype();
                    });
                    
                    var uid, BaseList, DAG, event_broker;
                    
                    function List(data) {
                        BaseList.apply(this);
                        this.attach(List);
                    
                        this.changeSet = [];
                        this._setData(data || []);
                    }
                    
                    function SetListPrototype() {
                        List.prototype = new BaseList();
                    
                        // add, remove, setData are being called only outside of propagating
                    
                        List.prototype.add = function(f) {
                            var key = uid();
                            event_broker.postponeChange(this, ["add", key, f]);
                            return key;
                        };
                    
                        List.prototype.remove = function(key) {
                            event_broker.postponeChange(this, ["remove", key]);
                        };
                    
                        List.prototype.setData = function(data) {
                            event_broker.postponeChange(this, ["setData", data]);
                        };
                    
                        List.prototype.applyChange = function(change) {
                            if (change[0]==="add") {
                                return this._add(change[1],change[2]);
                            } else if (change[0]==="remove") {
                                return this._remove(change[1]);
                            } else if (change[0]==="setData") {
                                return this._setData(change[1]);
                            } else {
                                throw new Error();
                            }
                        };
                    
                        // dependenciesChanged is being called during propagating only (!)
                    
                        List.prototype.dependenciesChanged = function() {
                            var info = {
                                hasChanges: this.changeSet.length > 0,
                                changeSet: this.changeSet
                            };
                            this.changeSet = [];
                            return info;
                        };
                    
                        // may be called during propagating or outside it
                    
                        List.prototype._leak = function(id) {
                            BaseList.prototype._leak.apply(this, [id]);
                    
                            if (this.usersCount===1) {
                                DAG.addNode(this);
                            }
                        };
                    
                        List.prototype._seal = function(id) {
                            BaseList.prototype._seal.apply(this, [id]);
                    
                            if (this.usersCount===0) {
                                DAG.removeNode(this);
                            }
                        };
                    
                        // gets
                    
                        List.prototype.get = function() {
                            return this.data.map(function(item){
                                return item.value;
                            });
                        };
                    
                        // internal
                    
                        List.prototype._add = function(key, f) {
                            if (typeof(f) != "function") {
                                var item = f;
                                f = function(id) { return item; };
                            }
                    
                            var value = {key: key, value: f(key)};
                            this.data.push(value);
                    
                            if (this.usersCount>0) {
                                var event = ["add", value];
                                this.changeSet.push(event);
                                this._putEventToDependants(event);
                                event_broker.notify(this);
                            }
                            return true;
                        };
                    
                        List.prototype._remove = function(key) {
                            this.data = this.data.filter(function(item) {
                                return item.key != key;
                            });
                    
                            if (this.usersCount>0) {
                                var event = ["remove", key];
                                this.changeSet.push(event);
                                this._putEventToDependants(event);
                                event_broker.notify(this);
                            }
                    
                            return true;
                        };
                    
                        List.prototype._setData = function(data) {
                            this.data = data.map(function(item){
                                return {
                                    key: uid(),
                                    value: item
                                }
                            });
                            if (this.usersCount>0) {
                                var event = ["reset", this.data.slice()];
                                this.changeSet.push(event);
                                this._putEventToDependants(event);
                                event_broker.notify(this);
                            }
                    
                            return true;
                        };
                    
                        // extensions
                    
                        List.prototype.forEach = function(f) {
                            if (!event_broker.isOnProcessCall) {
                                event_broker.invokeOnProcess(this, this.forEach, [f]);
                                return;
                            }
                    
                            for (var i=0;i<this.data.length;i++) {
                                f(this.data[i].value);
                            }
                        };
                    
                        List.prototype.removeWhich = function(f) {
                            if (!event_broker.active) {
                                event_broker.call(this, this.removeWhich, [f]);
                                return;
                            }
                    
                            var toRemove = [];
                            for (var i=0;i<this.data.length;i++) {
                                if (f(this.data[i].value)) {
                                    toRemove.push(this.data[i].key);
                                }
                            }
                            for (var i=0;i<toRemove.length;i++) {
                                this.remove(toRemove[i]);
                            }
                        }
                    }
                    
                    List.handler = function(handlers) {
                        return function(list, e) {
                            while(true) {
                                if (e[0]==="reset") break;
                                if (e[0]==="add") break;
                                if (e[0]==="remove") break;
                                throw new Error();
                            }
                            handlers[e[0]].apply(handlers, [e[1]]);
                        };
                    };
                }
            },
            {
                path: ["core","tracker"],
                content: function(root, expose) {
                    expose(new Tracker());
                    
                    function Tracker() {
                        this.active = false;
                        this.tracked = null;
                        this.stack = [];
                    }
                    
                    Tracker.prototype.track = function(cell) {
                        if (!this.active) return;
                        // TODO: optimize
                        if (this.tracked.indexOf(cell)>=0) return;
                        this.tracked.push(cell);
                    };
                    
                    Tracker.prototype.inScope = function(fn, context) {
                        this.stack.push([this.active, this.tracked]);
                    
                        this.active = true;
                        this.tracked = [];
                        try {
                            return fn.apply(context, []);
                        } finally {
                            var last = this.stack.pop();
                            this.active = last[0];
                            this.tracked = last[1];
                        }
                    };
                    
                    Tracker.prototype.outScope = function(fn, context) {
                        var active = this.active;
                        this.active = false;
                        try {
                            return fn.apply(context, []);
                        } finally {
                            this.active = active;
                        }
                    };
                    
                }
            },
            {
                path: ["core","unwrapObject"],
                content: function(root, expose) {
                    expose(unwrapObject, function(){
                        Cell = root.core.cells.Cell;
                        BaseCell = root.core.cells.BaseCell;
                        BaseList = root.core.lists.BaseList;
                        List = root.core.lists.List;
                    });
                    
                    var Cell, BaseCell, List, BaseList;
                    
                    function unwrapObject(obj, opt) {
                        if (typeof obj == "function") {
                            throw new Error("Can't unwrap functions");
                        }
                        if (typeof obj != "object") {
                            return new Cell(obj);
                        }
                        if (obj instanceof Skip) return new Cell(obj);
                        if (obj.metaType && obj.instanceof(BaseCell)) {
                            return root.do(function(){
                                return unwrapObject(obj.get()).get();
                            });
                        }
                        if (obj.metaType && obj.instanceof(BaseList)) {
                            return obj.lift(unwrapObject).reduce(
                                [], function(a,b) { return a.concat(b); }, {
                                    wrap: function(x) { return [x]; },
                                    ignoreUnset: true
                                }
                            );
                        }
                        var disassembled = [];
                        for (var key in obj) {
                            if (!obj.hasOwnProperty(key)) continue;
                            if (typeof obj[key] == "function") continue;
                            (function(key){
                                disassembled.push(unwrapObject(obj[key]).lift(function(value){
                                    return new Skip({key: key, value: value});
                                }));
                            })(key);
                        }
                        return unwrapObject(new List(disassembled)).lift(function(items){
                            var obj = {};
                            for (var i=0;i<items.length;i++) {
                                var kv = items[i].value;
                                obj[kv.key] = kv.value;
                            }
                            return obj;
                        });
                    }
                    
                    function Skip(value) {
                        this.value = value;
                    }
                    
                }
            },
            {
                path: ["ui","Component"],
                content: function(root, expose) {
                    expose(Component);
                    
                    function Component(builder) {
                        this.type = Component;
                    
                        this.builder = builder;
                    }
                    
                }
            },
            {
                path: ["ui","ast","Component"],
                content: function(root, expose) {
                    expose(Component);
                    
                    function Component() {
                        this.type = Component;
                    }
                    
                    Component.prototype.dispose = function() {};
                }
            },
            {
                path: ["ui","ast","Element"],
                content: function(root, expose) {
                    expose(Element, function(){
                        jq = root.ui.jq;
                        Matter = root.core.Matter;
                        register = root.ui.attributes.register;
                        BaseCell = root.core.cells.BaseCell;
                    });
                    
                    var jq, register, Matter, BaseCell;
                    
                    var id = 0;
                    
                    function Element(tag, attr) {
                        this.type = Element;
                    
                        this.tag = tag;
                        this.children = [];
                    
                        if (arguments.length==1) {
                            this.events = {};
                            this.attributes = {};
                            this.css = {};
                            this.onDraw = [];
                        } else if (arguments.length==2) {
                            this.events = attr.events;
                            this.attributes = attr.attributes;
                            this.css = attr.css;
                            this.onDraw = attr.onDraw;
                        } else {
                            throw new Error();
                        }
                    
                        this.elementId = "warp9/" + (id++);
                    
                        this.disposes = [];
                        this.cells = {};
                    
                    
                    
                        this.dispose = function() {
                            this.disposes.forEach(function(x) { x(); });
                    
                            this.dispose = function() { throw new Error(); }
                        };
                    
                        this.view = function() {
                            var view = document.createElement(tag);
                    
                            for (var name in this.attributes) {
                                if (!this.attributes.hasOwnProperty(name)) continue;
                                var setter = register.findAttributeSetter(this.tag, name);
                                this.disposes.push(setter.apply(name, this, view, this.attributes[name]));
                            }
                    
                            for (var name in this.events) {
                                if (!this.events.hasOwnProperty(name)) continue;
                                (function(name){
                                    view.addEventListener(name, function(event) {
                                        this.events[name](this, view, event);
                                    }.bind(this), false);
                                }.bind(this))(name);
                            }
                    
                            for (var name in this.css) {
                                if (!this.css.hasOwnProperty(name)) continue;
                                // TODO: unnecessary condition?!
                                if (name.indexOf("warp9:")==0) continue;
                                (function(name, value){
                                    if (value.metaType==Matter && value.instanceof(BaseCell)) {
                                        this.cells[value.cellId] = value;
                                        var dispose = value.onChange(function(value){
                                            jq.css(view, name, value.hasValue() ? value.get() : null);
                                        });
                                        this.disposes.push(function(){
                                            dispose();
                                        }.bind(this));
                                    } else {
                                        jq.css(view, name, value);
                                    }
                                }.bind(this))(name, this.css[name]);
                            }
                    
                            this.view = function() {
                                throw new Error();
                            };
                    
                            return view;
                        };
                    }
                    
                }
            },
            {
                path: ["ui","ast","Fragment"],
                content: function(root, expose) {
                    expose(Fragment);
                    
                    function Fragment(html) {
                        this.type = Fragment;
                        this.dispose = function() {};
                        this.children = [];
                        this.events = {};
                        this.cells = {};
                        this.css = {};
                        this.onDraw = [];
                        this.view = function() {
                            this.view = function() {
                                throw new Error();
                            };
                    
                            return html;
                        };
                    }
                }
            },
            {
                path: ["ui","ast","TextNode"],
                content: function(root, expose) {
                    expose(TextNode);
                    
                    function TextNode(text) {
                        this.type = TextNode;
                        this.dispose = function() {};
                        this.children = [];
                        this.onDraw = [];
                        this.css = {};
                        this.events = {};
                        this.cells = {};
                        this.view = function() {
                            var view = document.createTextNode(text);
                    
                            this.view = function() {
                                throw new Error();
                            };
                    
                            return view;
                        };
                    }
                }
            },
            {
                path: ["ui","attributes","AttributeSetter"],
                content: function(root, expose) {
                    expose(AttributeSetter);
                    
                    function AttributeSetter() {
                        this.type = AttributeSetter;
                    }
                    
                    // returns dispose
                    AttributeSetter.prototype.apply = function(attribute, element, view, value) {
                        throw new Error();
                    };
                    
                }
            },
            {
                path: ["ui","attributes","CelledAttributeSetter"],
                content: function(root, expose) {
                    expose(CelledAttributeSetter, function(){
                        AttributeSetter = root.ui.attributes.AttributeSetter;
                        Matter = root.core.Matter;
                        BaseCell = root.core.cells.BaseCell;
                    });
                    
                    var AttributeSetter, Matter, BaseCell;
                    
                    function CelledAttributeSetter(template) {
                        AttributeSetter.apply(this, []);
                        this._template = template;
                    }
                    
                    CelledAttributeSetter.prototype.apply = function(attribute, element, view, value) {
                        if (value.metaType === Matter && value.instanceof(BaseCell)) {
                            var self = this;
                            var dispose = value.onChange(function(value) {
                                if (value.hasValue()) {
                                    self._template.set(view, value.get());
                                } else {
                                    self._template.unset(view);
                                }
                            });
                            return function() {
                                dispose();
                            };
                        } else {
                            this._template.set(view, value);
                            return function() {};
                        }
                    };
                }
            },
            {
                path: ["ui","attributes","DefaultAttributeSetter"],
                content: function(root, expose) {
                    expose(DefaultAttributeSetter, function(){
                        jq = root.ui.jq;
                        AttributeSetter = root.ui.attributes.AttributeSetter;
                        Matter = root.core.Matter;
                        BaseCell = root.core.cells.BaseCell;
                    });
                    
                    var AttributeSetter, jq, Matter, BaseCell;
                    
                    function DefaultAttributeSetter() {
                        AttributeSetter.apply(this, []);
                    }
                    
                    DefaultAttributeSetter.prototype.apply = function(attribute, element, view, value) {
                        if (value.metaType === Matter && value.instanceof(BaseCell)) {
                            value.leak(element.elementId);
                            var dispose = value.onChange(function(value) {
                                if (value.hasValue()) {
                                    view.setAttribute(attribute, value.get());
                                } else {
                                    view.removeAttribute(attribute);
                                }
                            });
                            return function() {
                                dispose();
                                value.seal(element.elementId);
                            };
                        } else {
                            view.setAttribute(attribute, value);
                            return function() {};
                        }
                    };
                }
            },
            {
                path: ["ui","attributes","common"],
                content: function(root, expose) {
                    expose(null, function(){
                        jq = root.ui.jq;
                        CelledAttributeSetter = root.ui.attributes.CelledAttributeSetter;
                        DefaultAttributeSetter = root.ui.attributes.DefaultAttributeSetter;
                        register = root.ui.attributes.register;
                    
                        registerDefaultInterceptors();
                        registerDefaultAttributeSetters();
                    });
                    
                    var jq, register, CelledAttributeSetter, DefaultAttributeSetter;
                    
                    function registerDefaultInterceptors() {
                        register.registerAttributeInterceptor("input-text", function(tag, args) {
                            if (!args.events.hasOwnProperty("key:enter")) {
                                return args;
                            }
                            var keypress = null;
                            if (args.events.hasOwnProperty("keypress")) {
                                keypress = args.events["keypress"];
                            }
                            var enter = args.events["key:enter"];
                            args.events["keypress"] = function (element, view, event) {
                                if (keypress!=null) {
                                    keypress(element, view, event);
                                }
                                if (event.keyCode == 13) {
                                    enter(element, view, event);
                                }
                            };
                            delete args.events["key:enter"];
                            return args;
                        });
                    }
                    
                    function registerDefaultAttributeSetters() {
                        register.registerAttributeSetter("*", "*", new DefaultAttributeSetter());
                    
                        register.registerAttributeSetter("*", "checked", new CelledAttributeSetter({
                            set: function(view, value) {
                                view.checked = value;
                            },
                            unset: function(view) {
                                view.checked = false;
                            }
                        }));
                    
                        register.registerAttributeSetter("*", "value", new CelledAttributeSetter({
                            set: function(view, v) {
                                if (view.value != v) view.value = v;
                            },
                            unset: function(view) {
                                if (view.value != "") view.value = "";
                            }
                        }));
                    
                        register.registerAttributeSetter("*", "disabled", new CelledAttributeSetter({
                            set: function(view, v) {
                                if (v) {
                                    view.setAttribute("disabled", "")
                                } else {
                                    if (view.hasAttribute("disabled")) view.removeAttribute("disabled");
                                }
                            },
                            unset: function(view) {
                                view.removeAttribute("disabled");
                            }
                        }));
                    
                        // TODO: adds list support for class attribute
                        register.registerAttributeSetter("*", "class", new CelledAttributeSetter({
                            set: function(view, v) {
                                jq.removeClass(view);
                                view.classList.add(v);
                            },
                            unset: function(view) {
                                jq.removeClass(view);
                            }
                        }));
                    }
                    
                }
            },
            {
                path: ["ui","attributes","register"],
                content: function(root, expose) {
                    expose(new Register());
                    
                    function Register() {
                        this._tags = {};
                        this._common = {};
                        this._fallback = null;
                    
                        this._interceptors = {
                            tags: {},
                            common: []
                        };
                    }
                    
                    Register.prototype.findAttributeInterceptors = function(tagName) {
                        if (this._interceptors.tags.hasOwnProperty(tagName)) {
                            return this._interceptors.tags[tagName].concat(this._interceptors.common);
                        }
                        return this._interceptors.common;
                    };
                    
                    Register.prototype.registerAttributeInterceptor = function(tagName, interceptor) {
                        if (tagName === "*") {
                            this._interceptors.common.push(interceptor);
                        } else {
                            if (!this._interceptors.tags.hasOwnProperty(tagName)) {
                                this._interceptors.tags[tagName] = [];
                            }
                            this._interceptors.tags[tagName].push(interceptor);
                        }
                    };
                    
                    
                    // may return null
                    Register.prototype.findAttributeSetter = function(tagName, attributeName) {
                        while(true){
                            if (!this._tags.hasOwnProperty(tagName)) break;
                            if (!this._tags[tagName].hasOwnProperty(attributeName)) break;
                            return this._tags[tagName][attributeName];
                        }
                        if (this._common.hasOwnProperty(attributeName)) {
                            return this._common[attributeName];
                        }
                        return this._fallback;
                    };
                    
                    Register.prototype.registerAttributeSetter = function(tagName, attributeName, setter) {
                        if (tagName === "*") {
                            if (attributeName === "*") {
                                if (this._fallback != null) {
                                    return false;
                                }
                                this._fallback = setter;
                            } else {
                                if (this._common.hasOwnProperty(attributeName)) {
                                    return false;
                                }
                                this._common[attributeName] = setter;
                            }
                        } else {
                            if (!this._tags.hasOwnProperty(tagName)) {
                                this._tags[tagName] = {};
                            }
                            if (this._tags[tagName].hasOwnProperty(attributeName)) {
                                return false;
                            }
                            this._tags[tagName][attributeName] = setter;
                        }
                        return true;
                    };
                    
                }
            },
            {
                path: ["ui","hacks"],
                content: function(root, expose) {
                    expose({
                        unrecursion: unrecursion,
                        once: once
                    });
                    
                    // https://gist.github.com/rystsov/5898584
                    // https://code.google.com/p/chromium/issues/detail?id=117307
                    function unrecursion(f) {
                        var active = false;
                        return function() {
                            if (active) return;
                            active = true;
                            f.apply(null, arguments);
                            active = false;
                        };
                    }
                    
                    function once(f) {
                        var called = false;
                        return function() {
                            if (called) return;
                            called = true;
                            f();
                        };
                    }
                }
            },
            {
                path: ["ui","jq"],
                content: function(root, expose) {
                    expose({
                        css: css,
                        removeClass: removeClass,
                        after: after,
                        remove: remove,
                        removeChildren: removeChildren
                    });
                    
                    function css(self, property, value) {
                        var getComputedStyle = document.defaultView.getComputedStyle;
                    
                        if (arguments.length < 3 && typeof property == 'string') {
                            return self.style[camelize(property)] || getComputedStyle(self, '').getPropertyValue(property);
                        }
                    
                        if (!value && value !== 0) {
                            self.style.removeProperty(dasherize(property));
                            return;
                        }
                    
                        self.style.cssText += ';' + dasherize(property) + ":" + value;
                    }
                    
                    function removeClass(self, name) {
                        if (!name) {
                            while (self.classList.length > 0) self.classList.remove(self.classList.item(0));
                        } else {
                            self.classList.remove(name);
                        }
                    }
                    
                    function after(self, element) {
                        self.parentNode.insertBefore(element, self.nextSibling);
                    }
                    
                    function remove(self) {
                        try {
                            self.parentNode.removeChild(self);
                        } catch (e) {
                            throw e;
                        }
                    }
                    
                    function removeChildren(self) {
                        while (self.firstChild) {
                            self.removeChild(self.firstChild);
                        }
                    }
                    
                    
                    function camelize(str){ 
                        return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' });
                    }
                    
                    function dasherize(str) {
                        return str.replace(/::/g, '/')
                               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                               .replace(/_/g, '-')
                               .toLowerCase();
                    }
                    
                }
            },
            {
                path: ["ui","renderer"],
                content: function(root, expose) {
                    expose({
                        h: h,
                        parse: parse,
                        render: render,
                        addTag: addTag
                    }, function() {
                        BaseCell = root.core.cells.BaseCell;
                        List = root.core.lists.List;
                        BaseList = root.core.lists.BaseList;
                        Element = root.ui.ast.Element;
                        Component = root.ui.ast.Component;
                        Fragment = root.ui.ast.Fragment;
                        TextNode = root.ui.ast.TextNode;
                        jq = root.ui.jq;
                        hacks = root.ui.hacks;
                        Matter = root.core.Matter;
                    
                        addTag("div", root.ui.tags.TagParserFactory("div"));
                        addTag("a", root.ui.tags.TagParserFactory("a"));
                        addTag("section", root.ui.tags.TagParserFactory("section"));
                        addTag("header", root.ui.tags.TagParserFactory("header"));
                        addTag("footer", root.ui.tags.TagParserFactory("footer"));
                        addTag("span", root.ui.tags.TagParserFactory("span"));
                        addTag("strong", root.ui.tags.TagParserFactory("strong"));
                        addTag("h1", root.ui.tags.TagParserFactory("h1"));
                        addTag("ul", root.ui.tags.TagParserFactory("ul"));
                        addTag("li", root.ui.tags.TagParserFactory("li"));
                        addTag("label", root.ui.tags.TagParserFactory("label"));
                        addTag("button", root.ui.tags.TagParserFactory("button"));
                        addTag("b", root.ui.tags.TagParserFactory("b"));
                    
                        addTag(root.ui.tags.InputTextParser.TAG, root.ui.tags.InputTextParser);
                        addTag(root.ui.tags.InputCheckParser.TAG, root.ui.tags.InputCheckParser("checkbox"));
                    });
                    
                    var Matter, BaseCell, List, BaseList, Element, Component, Fragment, TextNode, jq, hacks;
                    
                    var tags = {};
                    
                    function addTag(name, parser) {
                        tags[name] = parser;
                    }
                    
                    function h(element) { return new root.ui.tags.utils.H(element); }
                    
                    function parse(element) {
                        if (typeof element==="string" || element instanceof String) {
                            return new TextNode(element);
                        }
                        if (typeof element==="number") {
                            return new TextNode(element);
                        }
                        if (element instanceof Array) {
                            if (element.length==0) throw new Error();
                            var tag = element[0];
                            if (!(tag in tags)) throw new Error("Unknown tag: " + tag);
                            return tags[tag](element.slice(1));
                        }
                        if (typeof element==="object") {
                            if (element.metaType==Matter && element.instanceof(BaseCell)) {
                                return element.lift(parse);
                            }
                            if (element.metaType==Matter && element.instanceof(BaseList)) {
                                return element.lift(parse);
                            }
                            if (element.type==root.ui.Component) {
                                element = element.builder;
                            }
                        }
                        if (typeof element==="function") {
                            var component = new Component();
                            component.value = parse(element.apply(component, []));
                            return component;
                        }
                        throw new Error();
                    }
                    
                    function render(canvas, element) {
                        var placeToCanvas = function(item) {
                            canvas.appendChild(item);
                        };
                    
                        bindDomTo(placeToCanvas, parse(element));
                    }
                    
                    function bindDomTo(place, dom) {
                        if (dom instanceof Element) {
                            return bindElementTo(place, dom);
                        } else if (dom instanceof Fragment) {
                            return bindElementTo(place, dom);
                        } else if (dom instanceof TextNode) {
                            return bindElementTo(place, dom);
                        } else if (dom instanceof Component) {
                            return bindComponentTo(place, dom);
                        } else if (dom.metaType==Matter && dom.instanceof(BaseCell)) {
                            return bindCellTo(place, dom);
                        }
                        throw new Error();
                    }
                    
                    function bindElementTo(place, element) {
                        var html = element.view();
                        var appendToHtml = function(item) {
                            html.appendChild(item);
                        };
                    
                        place(html);
                    
                        if (element.children instanceof Array) {
                            var dispose = [];
                            element.children.forEach(function(dom){
                                dispose.push(bindDomTo(appendToHtml, dom));
                            });
                            element.onDraw.forEach(function(handler) {
                                handler(element, html);
                            });
                            return hacks.once(function() {
                                dispose.forEach(function(f){ f(); });
                                jq.remove(html);
                                element.dispose();
                            });
                        } else if (element.children.metaType==Matter && element.children.instanceof(BaseList)) {
                            var keyDispose = {};
                            var stopChildren = function() {
                                for (var key in keyDispose) {
                                    if (!keyDispose.hasOwnProperty(key)) continue;
                                    keyDispose[key]();
                                }
                                keyDispose = {};
                            };
                            var dispose = element.children.onChange(List.handler({
                                reset: function(items) {
                                    stopChildren();
                                    items.forEach(this.add);
                                },
                                add: function(item) {
                                    keyDispose[item.key] = bindDomTo(appendToHtml, item.value);
                                },
                                remove: function(key) {
                                    if (!(key in keyDispose)) throw new Error();
                                    keyDispose[key]();
                                    delete keyDispose[key];
                                }
                            }));
                            element.onDraw.forEach(function(handler) {
                                handler(element, html);
                            });
                            return hacks.once(function() {
                                dispose();
                                stopChildren();
                                jq.remove(html);
                                element.dispose();
                            });
                        }
                        throw new Error();
                    }
                    
                    function bindCellTo(place, cell) {
                        var mark = document.createElement("script");
                        var placeAfterMark = function(item) {
                            jq.after(mark, item);
                        };
                        place(mark);
                    
                        var clean = function() {};
                        var dispose = cell.onChange(function(cell){
                            if (cell.hasValue()) {
                                clean();
                                clean = bindDomTo(placeAfterMark, cell.get());
                            } else {
                                clean();
                                clean = function() {};
                            }
                        });
                    
                        // TODO: why hacks.once, is it needed?
                        return hacks.once(function() {
                            dispose();
                            clean();
                        });
                    }
                    
                    function bindComponentTo(place, component) {
                        var dispose = bindDomTo(place, component.value);
                        return hacks.once(function() {
                            dispose();
                            component.dispose();
                        });
                    }
                }
            },
            {
                path: ["ui","tags","InputCheckParser"],
                content: function(root, expose) {
                    expose(InputCheckParser, function(){
                        Matter = root.core.Matter;
                        Cell = root.core.cells.Cell;
                        BaseCell = root.core.cells.BaseCell;
                    });
                    
                    var Matter, Cell, BaseCell;
                    
                    function InputCheckParser(type) {
                        if (!type) {
                            throw new Error("type must be provided");
                        }
                        if (!(type in {checkbox: 0, radio: 0})) {
                            throw new Error("type must be checkbox or radio");
                        }
                        return function(args) {
                            args = root.ui.tags.args.parse(args);
                            args = root.ui.tags.args.tryIntercept(InputCheckParser.TAG, args);
                    
                            var element = new root.ui.ast.Element("input");
                            element.events = args.events;
                            element.attributes = args.attributes;
                            element.css = args.css;
                            element.onDraw = args.onDraw;
                    
                            var state;
                            if (args.children.length == 0) {
                                state = new Cell();
                            } else {
                                if (args.children.length != 1) throw new Error();
                                if (!(args.children[0].metaType==Matter && args.children[0].instanceof(BaseCell))) throw new Error();
                                state = args.children[0];
                            }
                    
                            element.attributes.type = type;
                            element.attributes.checked = state.coalesce(false);
                    
                    
                            var isViewOnly = element.attributes["warp9:role"]==="view";
                            var change = element.events.change || function(){};
                    
                            var changed = element.events["warp9:changed"] || function(){};
                            delete element.events["warp9:changed"];
                            delete element.attributes["warp9:role"];
                    
                            element.events.change = function(control, view) {
                                change.apply(element.events, [control, view]);
                                changed(view.checked);
                                if (!isViewOnly) {
                                    state.set(view.checked);
                                }
                            };
                    
                            return element;
                        };
                    }
                    
                    InputCheckParser.TAG = "input-check";
                }
            },
            {
                path: ["ui","tags","InputTextParser"],
                content: function(root, expose) {
                    expose(InputTextParser, function() {
                        Matter = root.core.Matter;
                        Cell = root.core.cells.Cell;
                    });
                    
                    var Matter, Cell;
                    
                    function InputTextParser(args) {
                        args = root.ui.tags.args.parse(args);
                        args = root.ui.tags.args.tryIntercept(InputTextParser.TAG, args);
                    
                        if (args.children.length != 1) {
                            throw new Error();
                        }
                        if (!(args.children[0].metaType==Matter && args.children[0].instanceof(Cell))) {
                            throw new Error();
                        }
                    
                        var element = new root.ui.ast.Element("input");
                        element.events = args.events;
                        element.attributes = args.attributes;
                        element.onDraw = args.onDraw;
                        element.css = args.css;
                        element.attributes.type = "text";
                        element.attributes.value = args.children[0];
                    
                        var input = "input" in element.events ? element.events.input : function(){};
                        element.events.input = function(control, view) {
                            input.apply(element.events, [control, view]);
                            element.attributes.value.set(view.value);
                        };
                    
                        return element;
                    }
                    
                    InputTextParser.TAG = "input-text";
                }
            },
            {
                path: ["ui","tags","TagParserFactory"],
                content: function(root, expose) {
                    expose(TagParserFactory, function(){
                        Matter = root.core.Matter;
                        BaseList = root.core.lists.BaseList;
                    });
                    
                    var Matter, BaseList;
                    
                    function TagParserFactory(tagName) {
                        return function(args) {
                            args = root.ui.tags.args.parse(args);
                            args = root.ui.tags.args.tryIntercept(tagName, args);
                    
                            var element = new root.ui.ast.Element(tagName);
                            element.events = args.events;
                            element.attributes = args.attributes;
                            element.onDraw = args.onDraw;
                            element.css = args.css;
                    
                            if (args.children.length==1) {
                                element.children = [root.ui.renderer.parse(args.children[0])];
                                if (element.children[0].metaType==Matter && element.children[0].instanceof(BaseList)) {
                                    element.children = element.children[0]
                                }
                            } else {
                                element.children = args.children.map(function(child) {
                                    child = root.ui.renderer.parse(child);
                                    if (child.metaType==Matter && child.instanceof(BaseList)) {
                                        throw new Error();
                                    }
                                    return child;
                                });
                            }
                    
                            return element;
                        };
                    }
                }
            },
            {
                path: ["ui","tags","args"],
                content: function(root, expose) {
                    expose({
                        parse: parse,
                        tryIntercept: tryIntercept,
                        H: H
                    }, function(){
                        Matter = root.core.Matter;
                        BaseCell = root.core.cells.BaseCell;
                        BaseList = root.core.lists.BaseList;
                        register = root.ui.attributes.register;
                    });
                    
                    var Matter, BaseCell, BaseList, register;
                    
                    function H(element) {
                        this.element = element
                    }
                    
                    function tryIntercept(tag, args) {
                        var interceptors = register.findAttributeInterceptors(tag);
                        for (var i=0;i<interceptors.length;i++) {
                            args = interceptors[i](tag, args);
                        }
                        return args;
                    }
                    
                    function parse(args) {
                        if (args.length==0) throw new Error();
                    
                        var children = [args[0]];
                        var attr = null;
                    
                        while(true) {
                            if (typeof args[0]==="string") break;
                            if (args[0] instanceof Array) break;
                            if (args[0].metaType==Matter && args[0].instanceof(BaseCell)) break;
                            if (args[0].metaType==Matter && args[0].instanceof(BaseList)) break;
                            if (args[0] instanceof H) break;
                            if (args[0] instanceof root.ui.Component) break;
                            children = [];
                            attr = args[0];
                            break;
                        }
                    
                        for (var i=1;i<args.length;i++) {
                            children.push(args[i]);
                        }
                    
                        if (children.length==1) {
                            if (children[0] instanceof H) {
                                children = children[0].element;
                            }
                        }
                    
                        var element = normalizeAttributes(attr);
                    
                        var onDraw = [];
                        if (element.events.hasOwnProperty("warp9:draw")) {
                            onDraw.push(element.events["warp9:draw"]);
                            delete element.events["warp9:draw"];
                        }
                    
                        return {
                            events: element.events,
                            onDraw: onDraw,
                            attributes: element.attributes,
                            css: element.css,
                            children: children
                        };
                    }
                    
                    
                    
                    function normalizeAttributes(attr) {
                        var element = {
                            events: {},
                            attributes: {},
                            css: {}
                        };
                        if (attr!=null) {
                            for (var name in attr) {
                                if (!attr.hasOwnProperty(name)) continue;
                    
                                if (typeof attr[name]==="function" && name[0]==="!") {
                                    element.events[name.substring(1)] = attr[name];
                                    continue;
                                }
                                if (name.indexOf("css/")===0) {
                                    element.css[name.substring(4)] = attr[name];
                                    continue;
                                }
                                if (name==="css") {
                                    for (var key in attr[name]) {
                                        if (!attr[name].hasOwnProperty(key)) continue;
                                        element.css[key] = attr[name][key];
                                    }
                                    continue;
                                }
                                element.attributes[name] = attr[name];
                            }
                        }
                        return element;
                    }
                    
                }
            }
        ];
    }
})();