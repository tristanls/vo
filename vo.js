"use strict";

const VO = module.exports;
VO.version = "0.0.0";

function deepFreeze(obj)
{
    Object.getOwnPropertyNames(obj).map(name =>
        {
            const value = obj[name];
            if ((value !== null)
                && (typeof value === "object")
                && (!Object.isFrozen(value)))
            {
                deepFreeze(value);
            }
        }
    );
    return Object.freeze(obj);
};

function isNativeObject(object)
{
    return (Object.prototype.toString.call(object) === "[object Object]");
};

let _ordinal = -1;
function ordinal()
{
    return ++_ordinal;
};

VO.assert = function assert(predicate)
{
    if (predicate !== VO.true)
    {
        throw new Error(predicate);
    }
};

VO.fromNative = function fromNative(native)
{
    if (native === null)
    {
        return VO.unit;
    }
    else if (native === true)
    {
        return VO.true;
    }
    else if (native === false)
    {
        return VO.false;
    }
    else if (typeof native === "number")
    {
        return new VO.Number(native);
    }
    else if (typeof native === "string")
    {
        return new VO.String(native);
    }
    else if (Array.isArray(native))
    {
        return new VO.Array(native.map(e => VO.fromNative(e)));
    }
    else if (isNativeObject(native))
    {
        return new VO.Object(
            Object.entries(native)
                .reduce((obj, entry) =>
                    {
                        obj[entry[0]] = VO.fromNative(entry[1]);
                        return obj;
                    },
                    {}
                )
            );
    }
    throw new Error(native);
};

const valuePrototype =
{
    constructor: function Value()
    {
        if (!(this instanceof Value))
        {
            return new Value();
        }
    },
    equals(that)
    {
        if (this === that)
        {
            return VO.true;
        }
        return VO.false;
    }
};

const typePrototype =
{
    constructor: function Type(prototype)
    {
        if (!(this instanceof Type))
        {
            return new Type(prototype);
        }
        if (prototype === undefined)
        {
            return;
        }
        const newType = Object.assign({},
            valuePrototype,
            typePrototype,
            prototype
        );
        newType.constructor = Object.assign(newType.constructor,
            valuePrototype,
            typePrototype
        );
        newType.constructor.prototype = newType;
        return newType.constructor;
    },
    hasType(type)
    {
        for (let entry of Object.entries(type.prototype)
                                .filter(entry => entry[1] instanceof Function))
        {
            if (!(this[entry[0]] instanceof Function))
            {
                return VO.false;
            }
        }
        if (type.prototype.distinguished !== undefined)
        {
            if (this.distinguished !== type.prototype.distinguished)
            {
                return VO.false;
            }
        }
        return VO.true;
    }
};

VO.Type = (function (self = {})
{
    self = Object.assign(self,
        valuePrototype,
        typePrototype
    );
    self.constructor = Object.assign(self.constructor,
        valuePrototype,
        typePrototype
    );
    self.constructor.prototype = self;
    return self.constructor;
})();

VO.Value = VO.Type(valuePrototype);

VO.Data = VO.Type(Object.assign({},
    VO.Value.prototype,
    {
        constructor: function Data()
        {
            if (!(this instanceof Data))
            {
                return new Data();
            }
        },
        asJSON()
        {
            VO.assert(this.hasType(VO.Data));
            return new VO.String(JSON.stringify(this._value));
        }
    }
));

VO.Void = VO.Type(Object.assign({},
    VO.Type.prototype,
    {
        distinguished: ordinal(),
        constructor: function Void()
        {
            if (!(this instanceof Void))
            {
                return new Void();
            }
            if (VO.void === undefined)
            {
                VO.void = deepFreeze(this);
            }
            return VO.void;
        }
    }
));
VO.void = VO.Void();

VO.Unit = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        distinguished: ordinal(),
        constructor: function Unit()
        {
            if (!(this instanceof Unit))
            {
                return new Unit();
            }
            if (VO.unit === undefined)
            {
                this._value = null;
                VO.unit = deepFreeze(this);
            }
            return VO.unit;
        }
    }
));
VO.unit = VO.Unit();

VO.Boolean = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        constructor: function Boolean(value)
        {
            if (!(this instanceof Boolean))
            {
                return new Boolean(value);
            }
            if (value)
            {
                if (VO.true === undefined)
                {
                    this._value = true;
                    VO.true = deepFreeze(this);
                }
                return VO.true;
            }
            else
            {
                if (VO.false === undefined)
                {
                    this._value = false;
                    VO.false = deepFreeze(this);
                }
                return VO.false;
            }
        },
        not()
        {
            return this === VO.true ? VO.false : VO.true;
        },
        and(that)
        {
            VO.assert(that.hasType(VO.Boolean));
            return VO.Boolean(this === that && this === VO.true);
        },
        or(that)
        {
            VO.assert(that.hasType(VO.Boolean));
            return VO.Boolean((this === VO.true) || (that === VO.true));
        },
        xor(that)
        {
            VO.assert(that.hasType(VO.Boolean));
            return VO.Boolean(this.or(that)._value && this !== that);
        }
    }
));
VO.true = VO.Boolean(true);
VO.false = VO.Boolean(false);

VO.Number = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        constructor: function Number(value)
        {
            if (!(this instanceof Number))
            {
                return new Number(value);
            }
            VO.assert(VO.Boolean(typeof value === "number"));
            this._value = value;
            deepFreeze(this);
        },
        equals(that)
        {
            if (this === that)
            {
                return VO.true;
            }
            if (that.hasType(VO.Number) === VO.false)
            {
                return VO.false;
            }
            return VO.Boolean(this._value === that._value);
        },
        lessThan(that)
        {
            VO.assert(that.hasType(VO.Number));
            return VO.Boolean(this._value < that._value);
        },
        lessEqual(that)
        {
            VO.assert(that.hasType(VO.Number));
            return VO.Boolean(this._value <= that._value);
        },
        greaterThan(that)
        {
            VO.assert(that.hasType(VO.Number));
            return VO.Boolean(this._value > that._value);
        },
        greaterEqual(that)
        {
            VO.assert(that.hasType(VO.Number));
            return VO.Boolean(this._value >= that._value);
        },
        plus(that)
        {
            VO.assert(that.hasType(VO.Number));
            return new VO.Number(this._value + that._value);
        },
        times(that)
        {
            VO.assert(that.hasType(VO.Number));
            return new VO.Number(this._value * that._value);
        }
    }
));
VO.minusOne = VO.Number(-1);
VO.zero = VO.Number(0);
VO.one = VO.Number(1);
VO.two = VO.Number(2);

VO.String = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        constructor: function String(value)
        {
            if (!(this instanceof String))
            {
                return new String(value);
            }
            if (value === undefined)
            {
                return VO.emptyString;
            }
            VO.assert(VO.Boolean(typeof value === "string"));
            this._value = value;
            deepFreeze(this);
        },
        equals(that)
        {
            if (this === that)
            {
                return VO.true;
            }
            if (that.hasType(VO.String) === VO.false)
            {
                return VO.false;
            }
            return VO.Boolean(this._value === that._value);
        },
        length()
        {
            VO.assert(this.hasType(VO.String));
            return new VO.Number(Array.from(this._value).length); // codePoint length
        },
        value(offset)
        {
            VO.assert(offset.hasType(VO.Number));
            VO.assert(VO.zero.lessEqual(offset));
            VO.assert(offset.lessEqual(this.length()));
            return new VO.Number(Array.from(this._value)[offset._value].codePointAt(0));
        },
        concatenate(that)
        {
            VO.assert(that.hasType(VO.String));
            return new VO.String(this._value + that._value);
        },
        skip(count)
        {
            VO.assert(count.hasType(VO.Number));
            VO.assert(count.greaterEqual(VO.zero));
            if (count.greaterEqual(this.length()) === VO.true)
            {
                return VO.emptyString;
            }
            return new VO.String(Array.from(this._value).slice(count._value, this.length()._value).join(""));
        },
        take(count)
        {
            VO.assert(count.hasType(VO.Number));
            VO.assert(count.greaterEqual(VO.zero));
            VO.assert(count.lessEqual(this.length()));
            return new VO.String(Array.from(this._value).slice(0, count._value).join(""));
        },
        extract(interval)
        {
            VO.assert(interval.hasType(VO.Object));
            const from = interval.value(VO.String("from"));
            const upto = interval.value(VO.String("upto"));
            VO.assert(VO.zero.lessEqual(from));
            VO.assert(from.lessEqual(upto));
            VO.assert(upto.lessEqual(this.length()));
            return new VO.String(Array.from(this._value).slice(from._value, upto._value).join(""));
        },
        append(value)
        {
            VO.assert(value.hasType(VO.Number));
            return new VO.String(this._value + String.fromCodePoint(value._value));
        },
        bind(value)
        {
            VO.assert(value.hasType(VO.Value));
            const obj = {};
            obj[this._value] = value;
            return new VO.Object(obj);
        },
        asArray()
        {
            let array = VO.emptyArray;
            for (let codePoint of this._value)
            {
                array = array.append(VO.Number(codePoint.codePointAt(0)));
            }
            return array;
        }
    }
));
VO.emptyString = VO.String("");

const _Array = Array;
VO.Array = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        constructor: function Array(value)
        {
            if (!(this instanceof Array))
            {
                return new Array(value);
            }
            if (value === undefined)
            {
                return VO.emptyArray;
            }
            VO.assert(VO.Boolean(_Array.isArray(value)));
            this._value = value;
            deepFreeze(this);
        },
        equals(that)
        {
            if (this === that)
            {
                return VO.true;
            }
            if (that.hasType(VO.Array) === VO.false)
            {
                return VO.false;
            }
            if (this._value.length === that._value.length)
            {
                for (let i = 0; i < that._value.length; i++)
                {
                    if (this._value[i].equals(that._value[i]) === VO.false)
                    {
                        return VO.false;
                    }
                }
                return VO.true;
            }
            return VO.false;
        },
        length()
        {
            return new VO.Number(this._value.length);
        },
        value(offset)
        {
            VO.assert(VO.zero.lessEqual(offset));
            VO.assert(offset.lessEqual(this.length()));
            return this._value[offset._value];
        },
        concatenate(that)
        {
            VO.assert(that.hasType(VO.Array));
            return new VO.Array(this._value.concat(that._value));
        },
        skip(count)
        {
            VO.assert(count.hasType(VO.Number));
            VO.assert(count.greaterEqual(VO.zero));
            if (count.greaterEqual(this.length()) === VO.true)
            {
                return VO.emptyArray;
            }
            return new VO.Array(this._value.slice(count._value, this.length()._value));
        },
        take(count)
        {
            VO.assert(count.hasType(VO.Number));
            VO.assert(count.greaterEqual(VO.zero))
            VO.assert(count.lessEqual(this.length()));
            return new VO.Array(this._value.slice(0, count._value));
        },
        extract(interval)
        {
            VO.assert(interval.hasType(VO.Object));
            const from = interval.value(VO.String("from"));
            const upto = interval.value(VO.String("upto"));
            VO.assert(VO.zero.lessEqual(from));
            VO.assert(from.lessEqual(upto));
            VO.assert(upto.lessEqual(this.length()));
            return new VO.Array(this._value.slice(from._value, upto._value));
        },
        append(value)
        {
            VO.assert(value.hasType(VO.Value));
            return new VO.Array(this._value.concat(value));
        },
        asString()
        {
            return this._value.reduce((str, e) => str.append(e), VO.emptyString);
        },
        asJSON()
        {
            return new VO.String(`[${this._value.map(v => v.asJSON()._value).join(",")}]`);
        }
    }
));
VO.emptyArray = VO.Array([]);

const _Object = Object;
VO.Object = VO.Type(Object.assign({},
    VO.Data.prototype,
    {
        constructor: function Object(value)
        {
            if (!(this instanceof Object))
            {
                return new Object(value);
            }
            if (value === undefined)
            {
                return VO.emptyObject;
            }
            VO.assert(VO.Boolean(isNativeObject(value)));
            this._value = value;
            deepFreeze(this);
        },
        equals(that)
        {
            if (this === that)
            {
                return VO.true;
            }
            if (that.hasType(VO.Object) === VO.false)
            {
                return VO.false;
            }
            if (Object.keys(this._value).length === Object.keys(that._value).length)
            {
                for (let key of Object.keys(this._value))
                {
                    if (this._value[key].equals(that._value[key]) === VO.false)
                    {
                        return VO.false;
                    }
                }
                return VO.true;
            }
            return VO.false;
        },
        hasProperty(name)
        {
            VO.assert(name.hasType(VO.String));
            return VO.Boolean(this._value.hasOwnProperty(name._value));
        },
        value(name)
        {
            VO.assert(name.hasType(VO.String));
            VO.assert(this.hasProperty(name));
            return this._value[name._value];
        },
        concatenate(that)
        {
            VO.assert(that.hasType(VO.Object));
            return new VO.Object(
                Object.entries(this._value)
                    .concat(Object.entries(that._value))
                    .reduce((obj, entry) =>
                        {
                            obj[entry[0]] = entry[1];
                            return obj;
                        },
                        {}
                    )
            );
        },
        extract(names)
        {
            VO.assert(names.hasType(VO.Array));
            const obj = {};
            for (let i = 0; i < names.length()._value; i++)
            {
                const name = names.value(VO.Number(i));
                const value = this.value(name);
                obj[name._value] = value;
            }
            return VO.Object(obj);
        },
        names()
        {
            return new VO.Array(Object.keys(this._value).map(key => VO.String(key)));
        },
        asJSON()
        {
            return new VO.String(`{${Object.entries(this._value).map(e => `"${e[0]}":${e[1].asJSON()._value}`).join(",")}}`);
        }
    }
));
VO.emptyObject = VO.Object({});

VO.Expression = VO.Type(Object.assign({},
    VO.Value.prototype,
    {
        constructor: function Expression()
        {
            if (!(this instanceof Expression))
            {
                return new Expression();
            }
        },
        evaluate()
        {
            throw new Error("Not Implemented");
        }
    }
));

VO.ValueExpr = VO.Type(Object.assign({},
    VO.Expression.prototype,
    {
        constructor: function ValueExpr(value)
        {
            if (!(this instanceof ValueExpr))
            {
                return new ValueExpr(value);
            }
            VO.assert(value.hasType(VO.Value));
            this._value = value;
        },
        evaluate()
        {
            return this._value;
        }
    }
));

VO.VariableExpr = VO.Type(Object.assign({},
    VO.Expression.prototype,
    {
        constructor: function VariableExpr(name)
        {
            if (!(this instanceof VariableExpr))
            {
                return new VariableExpr(name);
            }
            VO.assert(name.hasType(VO.String));
            this._name = name;
        },
        evaluate(context)
        {
            return context.value(this._name);
        }
    }
));

VO.CombineExpr = VO.Type(Object.assign({},
    VO.Expression.prototype,
    {
        constructor: function CombineExpr(expr, data)
        {
            if (!(this instanceof CombineExpr))
            {
                return new CombineExpr(expr, data);
            }
            VO.assert(expr.hasType(VO.Expression));
            VO.assert(data.hasType(VO.Value));
            this._expr = expr;
            this._data = data;
        },
        evaluate(context)
        {
            const operation = this._expr.evaluate(context);
            VO.assert(operation.hasType(VO.Operation));
            return operation.operate(this._data, context);
        }
    }
));

VO.Operation = VO.Type(Object.assign({},
    VO.Expression.prototype,
    {
        constructor: function Operation(operative)
        {
            if (!(this instanceof Operation))
            {
                return new Operation(operative);
            }
            VO.assert(VO.Boolean(typeof operative === "function"));
            this._oper = operative;
            deepFreeze(this);
        },
        evaluate()
        {
            return this; // operations evaluate to themselves
        },
        operate(value, context)
        {
            VO.assert(value.hasType(VO.Value));
            const operative = this._oper;
            return operative(value, context);
        },
        concatenate(that)
        {
            VO.assert(that.hasType(VO.Operation));
            const first = this._oper;
            const second = that._oper;
            const composition = function composition(value, context)
            {
                return second(first(value, context), context);
            };
            return new VO.Operation(composition);
        }
    }
));
// returns unevaluted argument
VO.quoteOper = VO.Operation(
    function quoteOper(value)
    {
        VO.assert(value.hasType(VO.Value));
        return value;
    }
);
// returns array of evaluated arguments
VO.arrayOper = VO.Operation(
    function arrayOper(array, context)
    {
        VO.assert(array.hasType(VO.Array));
        const result = [];
        for (let i = 0; i < array.length()._value; i++)
        {
            const expr = array.value(VO.Number(i));
            VO.assert(expr.hasType(VO.Expression));
            result.push(expr.evaluate(context));
        }
        return new VO.Array(result);
    }
);
// evaluate expression sequentially, returning the last value */
VO.sequentialOper = VO.Operation(
    function sequentialOper(array, context)
    {
        VO.assert(array.hasType(VO.Array));
        let result = VO.unit;
        for (let i = 0; i < array.length()._value; i++)
        {
            const expr = array.value(VO.Number(i));
            VO.assert(expr.hasType(VO.Expression));
            result = expr.evaluate(context);
        }
        return result;
    }
);

VO.MethodExpr = VO.Type(Object.assign({},
    VO.Expression.prototype,
    {
        constructor: function MethodExpr(target, selector)
        {
            if (!(this instanceof MethodExpr))
            {
                return new MethodExpr(target, selector);
            }
            VO.assert(target.hasType(VO.Expression));
            VO.assert(selector.hasType(VO.Expression));
            this._target = target;
            this._selector = selector;
        },
        evaluate(context)
        {
            const selector = this._selector.evaluate(context);
            VO.assert(selector.hasType(VO.String));
            const target = this._target.evaluate(context);
            VO.assert(selector.hasType(VO.Value));
            const operation = target.method(selector);
            const applicative = VO.arrayOper.concatenate(operation); // evaluate arguments before calling method
            return applicative; // return applicative bound to target object
        }
    }
));


VO.selfTest = (function ()
{
    const type = new VO.Type();
    const value = new VO.Value();
    const data = new VO.Data();
    const sampleString = new VO.String("Hello, World!");
    const codePointString = new VO.String("A\uD835\uDC68B\uD835\uDC69C\uD835\uDC6A"); // "A𝑨B𝑩C𝑪"
    const sampleArray = new VO.Array(
        [
            VO.unit,
            VO.true,
            VO.false,
            VO.zero,
            VO.one,
            VO.emptyString,
            VO.emptyArray,
            VO.emptyObject
        ]
    );
    const sampleObject = new VO.Object(
        {
            "unit": VO.unit,
            "true": VO.true,
            "false": VO.false,
            "zero": VO.zero,
            "one": VO.one,
            "emptyString": VO.emptyString,
            "emptyArray": VO.emptyArray,
            "emptyObject": VO.emptyObject
        }
    );
    return function selfTest()
    {
        // Type
        VO.assert(VO.Type.hasType(VO.Type));
        VO.assert(VO.Type.hasType(VO.Value));
        VO.assert(VO.Type.hasType(VO.Data).not());
        VO.assert(VO.Type.hasType(VO.Void).not());
        VO.assert(VO.Type.hasType(VO.Unit).not());
        VO.assert(VO.Type.hasType(VO.Boolean).not());
        VO.assert(VO.Type.hasType(VO.Number).not());
        VO.assert(VO.Type.hasType(VO.String).not());
        VO.assert(VO.Type.hasType(VO.Array).not());
        VO.assert(VO.Type.hasType(VO.Object).not());

        VO.assert(VO.Type.equals(VO.Type));
        VO.assert(VO.Type.equals(VO.Value).not());
        VO.assert(VO.Type.equals(VO.Data).not());
        VO.assert(VO.Type.equals(VO.Void).not());
        VO.assert(VO.Type.equals(VO.Unit).not());
        VO.assert(VO.Type.equals(VO.Boolean).not());
        VO.assert(VO.Type.equals(VO.Number).not());
        VO.assert(VO.Type.equals(VO.String).not());
        VO.assert(VO.Type.equals(VO.Array).not());
        VO.assert(VO.Type.equals(VO.Object).not());

        VO.assert(type.hasType(VO.Type));
        VO.assert(type.hasType(VO.Value));
        VO.assert(type.hasType(VO.Data).not());
        VO.assert(type.hasType(VO.Void).not());
        VO.assert(type.hasType(VO.Unit).not());
        VO.assert(type.hasType(VO.Boolean).not());
        VO.assert(type.hasType(VO.Number).not());
        VO.assert(type.hasType(VO.String).not());
        VO.assert(type.hasType(VO.Array).not());
        VO.assert(type.hasType(VO.Object).not());

        // Value
        VO.assert(VO.Value.hasType(VO.Type));
        VO.assert(VO.Value.hasType(VO.Value));
        VO.assert(VO.Value.hasType(VO.Data).not());
        VO.assert(VO.Value.hasType(VO.Void).not());
        VO.assert(VO.Value.hasType(VO.Unit).not());
        VO.assert(VO.Value.hasType(VO.Boolean).not());
        VO.assert(VO.Value.hasType(VO.Number).not());
        VO.assert(VO.Value.hasType(VO.String).not());
        VO.assert(VO.Value.hasType(VO.Array).not());
        VO.assert(VO.Value.hasType(VO.Object).not());

        VO.assert(VO.Value.equals(VO.Type).not());
        VO.assert(VO.Value.equals(VO.Value));
        VO.assert(VO.Value.equals(VO.Data).not());
        VO.assert(VO.Value.equals(VO.Void).not());
        VO.assert(VO.Value.equals(VO.Unit).not());
        VO.assert(VO.Value.equals(VO.Boolean).not());
        VO.assert(VO.Value.equals(VO.Number).not());
        VO.assert(VO.Value.equals(VO.String).not());
        VO.assert(VO.Value.equals(VO.Array).not());
        VO.assert(VO.Value.equals(VO.Object).not());

        VO.assert(value.hasType(VO.Type));
        VO.assert(value.hasType(VO.Value));
        VO.assert(value.hasType(VO.Data).not());
        VO.assert(value.hasType(VO.Void).not());
        VO.assert(value.hasType(VO.Unit).not());
        VO.assert(value.hasType(VO.Boolean).not());
        VO.assert(value.hasType(VO.Number).not());
        VO.assert(value.hasType(VO.String).not());
        VO.assert(value.hasType(VO.Array).not());
        VO.assert(value.hasType(VO.Object).not());

        // Data
        VO.assert(VO.Data.hasType(VO.Type));
        VO.assert(VO.Data.hasType(VO.Value));
        VO.assert(VO.Data.hasType(VO.Data).not());
        VO.assert(VO.Data.hasType(VO.Void).not());
        VO.assert(VO.Data.hasType(VO.Unit).not());
        VO.assert(VO.Data.hasType(VO.Boolean).not());
        VO.assert(VO.Data.hasType(VO.Number).not());
        VO.assert(VO.Data.hasType(VO.String).not());
        VO.assert(VO.Data.hasType(VO.Array).not());
        VO.assert(VO.Data.hasType(VO.Object).not());

        VO.assert(VO.Data.equals(VO.Type).not());
        VO.assert(VO.Data.equals(VO.Value).not());
        VO.assert(VO.Data.equals(VO.Data));
        VO.assert(VO.Data.equals(VO.Void).not());
        VO.assert(VO.Data.equals(VO.Unit).not());
        VO.assert(VO.Data.equals(VO.Boolean).not());
        VO.assert(VO.Data.equals(VO.Number).not());
        VO.assert(VO.Data.equals(VO.String).not());
        VO.assert(VO.Data.equals(VO.Array).not());
        VO.assert(VO.Data.equals(VO.Object).not());

        VO.assert(data.hasType(VO.Type));
        VO.assert(data.hasType(VO.Value));
        VO.assert(data.hasType(VO.Data));
        VO.assert(data.hasType(VO.Void).not());
        VO.assert(data.hasType(VO.Unit).not());
        VO.assert(data.hasType(VO.Boolean).not());
        VO.assert(data.hasType(VO.Number).not());
        VO.assert(data.hasType(VO.String).not());
        VO.assert(data.hasType(VO.Array).not());
        VO.assert(data.hasType(VO.Object).not());

        VO.assert(data.asJSON().equals(VO.emptyString));

        // Void
        VO.assert(VO.Void.hasType(VO.Type));
        VO.assert(VO.Void.hasType(VO.Value));
        VO.assert(VO.Void.hasType(VO.Data).not());
        VO.assert(VO.Void.hasType(VO.Void).not());
        VO.assert(VO.Void.hasType(VO.Unit).not());
        VO.assert(VO.Void.hasType(VO.Boolean).not());
        VO.assert(VO.Void.hasType(VO.Number).not());
        VO.assert(VO.Void.hasType(VO.String).not());
        VO.assert(VO.Void.hasType(VO.Array).not());
        VO.assert(VO.Void.hasType(VO.Object).not());

        VO.assert(VO.Void.equals(VO.Type).not());
        VO.assert(VO.Void.equals(VO.Value).not());
        VO.assert(VO.Void.equals(VO.Data).not());
        VO.assert(VO.Void.equals(VO.Void));
        VO.assert(VO.Void.equals(VO.Unit).not());
        VO.assert(VO.Void.equals(VO.Boolean).not());
        VO.assert(VO.Void.equals(VO.Number).not());
        VO.assert(VO.Void.equals(VO.String).not());
        VO.assert(VO.Void.equals(VO.Array).not());
        VO.assert(VO.Void.equals(VO.Object).not());

        VO.assert(VO.void.hasType(VO.Type));
        VO.assert(VO.void.hasType(VO.Value));
        VO.assert(VO.void.hasType(VO.Data).not());
        VO.assert(VO.void.hasType(VO.Void));
        VO.assert(VO.void.hasType(VO.Unit).not());
        VO.assert(VO.void.hasType(VO.Boolean).not());
        VO.assert(VO.void.hasType(VO.Number).not());
        VO.assert(VO.void.hasType(VO.String).not());
        VO.assert(VO.void.hasType(VO.Array).not());
        VO.assert(VO.void.hasType(VO.Object).not());

        VO.assert(VO.void.equals(VO.void));
        VO.assert(VO.void.equals(VO.Void()));
        VO.assert(VO.void.equals(new VO.Void()));
        VO.assert(VO.void.equals(VO.unit).not());
        VO.assert(VO.void.equals(VO.true).not());
        VO.assert(VO.void.equals(VO.false).not());
        VO.assert(VO.void.equals(VO.zero).not());
        VO.assert(VO.void.equals(VO.minusOne).not());
        VO.assert(VO.void.equals(VO.one).not());
        VO.assert(VO.void.equals(VO.two).not());
        VO.assert(VO.void.equals(VO.emptyString).not());
        VO.assert(VO.void.equals(VO.emptyArray).not());
        VO.assert(VO.void.equals(VO.emptyObject).not());
        VO.assert(VO.Boolean(VO.void === new VO.Void()));
        VO.assert(VO.Boolean(new VO.Void() === new VO.Void()));

        // Unit
        VO.assert(VO.Unit.hasType(VO.Type));
        VO.assert(VO.Unit.hasType(VO.Value));
        VO.assert(VO.Unit.hasType(VO.Data).not());
        VO.assert(VO.Unit.hasType(VO.Void).not());
        VO.assert(VO.Unit.hasType(VO.Unit).not());
        VO.assert(VO.Unit.hasType(VO.Boolean).not());
        VO.assert(VO.Unit.hasType(VO.Number).not());
        VO.assert(VO.Unit.hasType(VO.String).not());
        VO.assert(VO.Unit.hasType(VO.Array).not());
        VO.assert(VO.Unit.hasType(VO.Object).not());

        VO.assert(VO.Unit.equals(VO.Type).not());
        VO.assert(VO.Unit.equals(VO.Value).not());
        VO.assert(VO.Unit.equals(VO.Data).not());
        VO.assert(VO.Unit.equals(VO.Void).not());
        VO.assert(VO.Unit.equals(VO.Unit));
        VO.assert(VO.Unit.equals(VO.Boolean).not());
        VO.assert(VO.Unit.equals(VO.Number).not());
        VO.assert(VO.Unit.equals(VO.String).not());
        VO.assert(VO.Unit.equals(VO.Array).not());
        VO.assert(VO.Unit.equals(VO.Object).not());

        VO.assert(VO.unit.hasType(VO.Type));
        VO.assert(VO.unit.hasType(VO.Value));
        VO.assert(VO.unit.hasType(VO.Data));
        VO.assert(VO.unit.hasType(VO.Void).not());
        VO.assert(VO.unit.hasType(VO.Unit));
        VO.assert(VO.unit.hasType(VO.Boolean).not());
        VO.assert(VO.unit.hasType(VO.Number).not());
        VO.assert(VO.unit.hasType(VO.String).not());
        VO.assert(VO.unit.hasType(VO.Array).not());
        VO.assert(VO.unit.hasType(VO.Object).not());

        VO.assert(VO.unit.equals(VO.unit));
        VO.assert(VO.unit.equals(VO.Unit()));
        VO.assert(VO.unit.equals(new VO.Unit()));
        VO.assert(VO.unit.equals(VO.void).not());
        VO.assert(VO.unit.equals(VO.true).not());
        VO.assert(VO.unit.equals(VO.false).not());
        VO.assert(VO.unit.equals(VO.zero).not());
        VO.assert(VO.unit.equals(VO.minusOne).not());
        VO.assert(VO.unit.equals(VO.one).not());
        VO.assert(VO.unit.equals(VO.two).not());
        VO.assert(VO.unit.equals(VO.emptyString).not());
        VO.assert(VO.unit.equals(VO.emptyArray).not());
        VO.assert(VO.unit.equals(VO.emptyObject).not());
        VO.assert(VO.Boolean(VO.unit === new VO.Unit()));
        VO.assert(VO.Boolean(new VO.Unit() === new VO.Unit()));

        VO.assert(VO.unit.asJSON().equals(VO.String("null")));

        // Boolean
        VO.assert(VO.Boolean.hasType(VO.Type));
        VO.assert(VO.Boolean.hasType(VO.Value));
        VO.assert(VO.Boolean.hasType(VO.Data).not());
        VO.assert(VO.Boolean.hasType(VO.Void).not());
        VO.assert(VO.Boolean.hasType(VO.Unit).not());
        VO.assert(VO.Boolean.hasType(VO.Boolean).not());
        VO.assert(VO.Boolean.hasType(VO.Number).not());
        VO.assert(VO.Boolean.hasType(VO.String).not());
        VO.assert(VO.Boolean.hasType(VO.Array).not());
        VO.assert(VO.Boolean.hasType(VO.Object).not());

        VO.assert(VO.Boolean.equals(VO.Type).not());
        VO.assert(VO.Boolean.equals(VO.Value).not());
        VO.assert(VO.Boolean.equals(VO.Data).not());
        VO.assert(VO.Boolean.equals(VO.Void).not());
        VO.assert(VO.Boolean.equals(VO.Unit).not());
        VO.assert(VO.Boolean.equals(VO.Boolean));
        VO.assert(VO.Boolean.equals(VO.Number).not());
        VO.assert(VO.Boolean.equals(VO.String).not());
        VO.assert(VO.Boolean.equals(VO.Array).not());
        VO.assert(VO.Boolean.equals(VO.Object).not());

        VO.assert(VO.true.hasType(VO.Type));
        VO.assert(VO.true.hasType(VO.Value));
        VO.assert(VO.true.hasType(VO.Data));
        VO.assert(VO.true.hasType(VO.Void).not());
        VO.assert(VO.true.hasType(VO.Unit).not());
        VO.assert(VO.true.hasType(VO.Boolean));
        VO.assert(VO.true.hasType(VO.Number).not());
        VO.assert(VO.true.hasType(VO.String).not());
        VO.assert(VO.true.hasType(VO.Array).not());
        VO.assert(VO.true.hasType(VO.Object).not());

        VO.assert(VO.true.equals(VO.void).not());
        VO.assert(VO.true.equals(VO.unit).not());
        VO.assert(VO.true.equals(VO.true));
        VO.assert(VO.true.equals(VO.false).not());
        VO.assert(VO.true.equals(VO.zero).not());
        VO.assert(VO.true.equals(VO.minusOne).not());
        VO.assert(VO.true.equals(VO.one).not());
        VO.assert(VO.true.equals(VO.two).not());
        VO.assert(VO.true.equals(VO.emptyString).not());
        VO.assert(VO.true.equals(VO.emptyArray).not());
        VO.assert(VO.true.equals(VO.emptyObject).not());

        VO.assert(VO.true.asJSON().equals(VO.String("true")));

        VO.assert(VO.false.hasType(VO.Type));
        VO.assert(VO.false.hasType(VO.Value));
        VO.assert(VO.false.hasType(VO.Data));
        VO.assert(VO.false.hasType(VO.Void).not());
        VO.assert(VO.false.hasType(VO.Unit).not());
        VO.assert(VO.false.hasType(VO.Boolean));
        VO.assert(VO.false.hasType(VO.Number).not());
        VO.assert(VO.false.hasType(VO.String).not());
        VO.assert(VO.false.hasType(VO.Array).not());
        VO.assert(VO.false.hasType(VO.Object).not());

        VO.assert(VO.false.equals(VO.void).not());
        VO.assert(VO.false.equals(VO.unit).not());
        VO.assert(VO.false.equals(VO.true).not());
        VO.assert(VO.false.equals(VO.false));
        VO.assert(VO.false.equals(VO.zero).not());
        VO.assert(VO.false.equals(VO.minusOne).not());
        VO.assert(VO.false.equals(VO.one).not());
        VO.assert(VO.false.equals(VO.two).not());
        VO.assert(VO.false.equals(VO.emptyString).not());
        VO.assert(VO.false.equals(VO.emptyArray).not());
        VO.assert(VO.false.equals(VO.emptyObject).not());

        VO.assert(VO.false.asJSON().equals(VO.String("false")));

        VO.assert(VO.false.and(VO.false).not());
        VO.assert(VO.false.and(VO.true).not());
        VO.assert(VO.true.and(VO.false).not());
        VO.assert(VO.true.and(VO.true));
        VO.assert(VO.false.or(VO.false).not());
        VO.assert(VO.false.or(VO.true));
        VO.assert(VO.true.or(VO.false));
        VO.assert(VO.true.or(VO.true));
        VO.assert(VO.false.xor(VO.false).not());
        VO.assert(VO.false.xor(VO.true));
        VO.assert(VO.true.xor(VO.false));
        VO.assert(VO.true.xor(VO.true).not());

        // Number
        VO.assert(VO.Number.hasType(VO.Type));
        VO.assert(VO.Number.hasType(VO.Value));
        VO.assert(VO.Number.hasType(VO.Data).not());
        VO.assert(VO.Number.hasType(VO.Void).not());
        VO.assert(VO.Number.hasType(VO.Unit).not());
        VO.assert(VO.Number.hasType(VO.Boolean).not());
        VO.assert(VO.Number.hasType(VO.Number).not());
        VO.assert(VO.Number.hasType(VO.String).not());
        VO.assert(VO.Number.hasType(VO.Array).not());
        VO.assert(VO.Number.hasType(VO.Object).not());

        VO.assert(VO.Number.equals(VO.Type).not());
        VO.assert(VO.Number.equals(VO.Value).not());
        VO.assert(VO.Number.equals(VO.Data).not());
        VO.assert(VO.Number.equals(VO.Void).not());
        VO.assert(VO.Number.equals(VO.Unit).not());
        VO.assert(VO.Number.equals(VO.Boolean).not());
        VO.assert(VO.Number.equals(VO.Number));
        VO.assert(VO.Number.equals(VO.String).not());
        VO.assert(VO.Number.equals(VO.Array).not());
        VO.assert(VO.Number.equals(VO.Object).not());

        VO.assert(VO.zero.hasType(VO.Type));
        VO.assert(VO.zero.hasType(VO.Value));
        VO.assert(VO.zero.hasType(VO.Data));
        VO.assert(VO.zero.hasType(VO.Void).not());
        VO.assert(VO.zero.hasType(VO.Unit).not());
        VO.assert(VO.zero.hasType(VO.Boolean).not());
        VO.assert(VO.zero.hasType(VO.Number));
        VO.assert(VO.zero.hasType(VO.String).not());
        VO.assert(VO.zero.hasType(VO.Array).not());
        VO.assert(VO.zero.hasType(VO.Object).not());

        VO.assert(VO.zero.equals(VO.void).not());
        VO.assert(VO.zero.equals(VO.unit).not());
        VO.assert(VO.zero.equals(VO.true).not());
        VO.assert(VO.zero.equals(VO.false).not());
        VO.assert(VO.zero.equals(VO.zero));
        VO.assert(VO.zero.equals(VO.one).not());
        VO.assert(VO.zero.equals(VO.two).not());
        VO.assert(VO.zero.equals(VO.emptyString).not());
        VO.assert(VO.zero.equals(VO.emptyArray).not());
        VO.assert(VO.zero.equals(VO.emptyObject).not());

        VO.assert(VO.zero.lessThan(VO.minusOne).not());
        VO.assert(VO.zero.lessThan(VO.zero).not());
        VO.assert(VO.zero.lessThan(VO.one));
        VO.assert(VO.zero.lessEqual(VO.minusOne).not());
        VO.assert(VO.zero.lessEqual(VO.zero));
        VO.assert(VO.zero.lessEqual(VO.one));
        VO.assert(VO.zero.greaterEqual(VO.minusOne));
        VO.assert(VO.zero.greaterEqual(VO.zero));
        VO.assert(VO.zero.greaterEqual(VO.one).not());
        VO.assert(VO.zero.greaterThan(VO.minusOne));
        VO.assert(VO.zero.greaterThan(VO.zero).not());
        VO.assert(VO.zero.greaterThan(VO.one).not());
        VO.assert(VO.one.lessThan(VO.zero).not());
        VO.assert(VO.one.lessThan(VO.two));
        VO.assert(VO.zero.lessThan(VO.two));
        VO.assert(VO.zero.plus(VO.zero).equals(VO.zero));
        VO.assert(VO.zero.plus(VO.one).equals(VO.one));
        VO.assert(VO.one.plus(VO.zero).equals(VO.one));
        VO.assert(VO.one.plus(VO.one).equals(VO.two));
        VO.assert(VO.one.plus(VO.minusOne).equals(VO.zero));
        VO.assert(VO.zero.times(VO.zero).equals(VO.zero));
        VO.assert(VO.zero.times(VO.one).equals(VO.zero));
        VO.assert(VO.one.times(VO.zero).equals(VO.zero));
        VO.assert(VO.one.times(VO.one).equals(VO.one));
        VO.assert(VO.one.times(VO.minusOne).equals(VO.minusOne));
        VO.assert(VO.two.times(VO.minusOne).equals(new VO.Number(-2)));

        VO.assert(VO.zero.equals(VO.Number(0)));
        VO.assert(VO.zero.equals(new VO.Number(0)));
        VO.assert(VO.Boolean(VO.zero !== new VO.Number(0)));
        VO.assert(VO.one.equals(new VO.Number(1)));
        VO.assert(VO.Boolean(VO.one !== new VO.Number(1)));

        VO.assert(VO.zero.asJSON().equals(new VO.String("0")));
        VO.assert(VO.one.asJSON().equals(new VO.String("1")));
        VO.assert(VO.two.asJSON().equals(new VO.String("2")));
        VO.assert(VO.minusOne.asJSON().equals(new VO.String("-1")));
        VO.assert((new VO.Number(42)).asJSON().equals(new VO.String("42")));

        // String
        VO.assert(VO.String.hasType(VO.Type));
        VO.assert(VO.String.hasType(VO.Value));
        VO.assert(VO.String.hasType(VO.Data).not());
        VO.assert(VO.String.hasType(VO.Void).not());
        VO.assert(VO.String.hasType(VO.Unit).not());
        VO.assert(VO.String.hasType(VO.Boolean).not());
        VO.assert(VO.String.hasType(VO.Number).not());
        VO.assert(VO.String.hasType(VO.String).not());
        VO.assert(VO.String.hasType(VO.Array).not());
        VO.assert(VO.String.hasType(VO.Object).not());

        VO.assert(VO.String.equals(VO.Type).not());
        VO.assert(VO.String.equals(VO.Value).not());
        VO.assert(VO.String.equals(VO.Data).not());
        VO.assert(VO.String.equals(VO.Void).not());
        VO.assert(VO.String.equals(VO.Unit).not());
        VO.assert(VO.String.equals(VO.Boolean).not());
        VO.assert(VO.String.equals(VO.Number).not());
        VO.assert(VO.String.equals(VO.String));
        VO.assert(VO.String.equals(VO.Array).not());
        VO.assert(VO.String.equals(VO.Object).not());

        VO.assert(VO.emptyString.hasType(VO.Type));
        VO.assert(VO.emptyString.hasType(VO.Value));
        VO.assert(VO.emptyString.hasType(VO.Data));
        VO.assert(VO.emptyString.hasType(VO.Void).not());
        VO.assert(VO.emptyString.hasType(VO.Unit).not());
        VO.assert(VO.emptyString.hasType(VO.Boolean).not());
        VO.assert(VO.emptyString.hasType(VO.Number).not());
        VO.assert(VO.emptyString.hasType(VO.String));
        VO.assert(VO.emptyString.hasType(VO.Array).not());
        VO.assert(VO.emptyString.hasType(VO.Object).not());

        VO.assert(VO.emptyString.equals(VO.void).not());
        VO.assert(VO.emptyString.equals(VO.unit).not());
        VO.assert(VO.emptyString.equals(VO.true).not());
        VO.assert(VO.emptyString.equals(VO.false).not());
        VO.assert(VO.emptyString.equals(VO.zero).not());
        VO.assert(VO.emptyString.equals(VO.one).not());
        VO.assert(VO.emptyString.equals(VO.two).not());
        VO.assert(VO.emptyString.equals(VO.emptyString));
        VO.assert(VO.emptyString.equals(VO.emptyArray).not());
        VO.assert(VO.emptyString.equals(VO.emptyObject).not());

        VO.assert(VO.emptyString.length().equals(VO.zero));
        VO.assert(sampleString.length().equals(new VO.Number(13)));
        VO.assert(codePointString.length().equals(new VO.Number(6)));
        VO.assert(sampleString.value(VO.zero).equals(new VO.Number(72)));  // "H"
        VO.assert(codePointString.value(VO.zero).equals(new VO.Number(65))); // "A"
        VO.assert(sampleString.value(new VO.Number(6)).equals(new VO.Number(32)));  // " "
        VO.assert(codePointString.value(VO.Number(3)).equals(new VO.Number(119913))); // "𝑩"
        VO.assert(sampleString.value(sampleString.length().plus(VO.minusOne)).equals(new VO.Number(33)));  // "!"
        VO.assert(codePointString.value(codePointString.length().plus(VO.minusOne)).equals(new VO.Number(119914)));  // "𝑪"
        VO.assert(sampleString.extract(VO.fromNative({from:0, upto:0})).equals(VO.emptyString));
        VO.assert(sampleString.extract(VO.fromNative({from:0, upto:1})).length().equals(VO.one));
        VO.assert(sampleString.extract(VO.fromNative({from:1, upto:1})).length().equals(VO.zero));
        VO.assert(sampleString
                  .extract(VO.fromNative({from:0}).concatenate((new VO.String("upto")).bind(sampleString.length())))
                  .equals(sampleString));
        VO.assert(codePointString
                  .extract(VO.fromNative({from:0}).concatenate((new VO.String("upto")).bind(codePointString.length())))
                  .equals(codePointString));
        VO.assert(sampleString.extract(VO.fromNative({from:0, upto:5})).equals(new VO.String("Hello")));
        VO.assert(codePointString.extract(VO.fromNative({from:0, upto:3})).equals(new VO.String("A\uD835\uDC68B")));
        VO.assert(sampleString.skip(new VO.Number(7)).take(new VO.Number(5)).equals(new VO.String("World")));
        VO.assert(codePointString.skip(new VO.Number(2)).take(new VO.Number(4)).equals(new VO.String("B\uD835\uDC69C\uD835\uDC6A")));
        VO.assert(VO.emptyString.concatenate(VO.emptyString).equals(VO.emptyString));
        VO.assert(sampleString.concatenate(VO.emptyString).equals(sampleString));
        VO.assert(codePointString.concatenate(VO.emptyString).equals(codePointString));
        VO.assert(VO.emptyString.concatenate(sampleString).equals(sampleString));
        VO.assert(VO.emptyString.concatenate(codePointString).equals(codePointString));
        VO.assert(sampleString.take(new VO.Number(6))
                  .concatenate(sampleString.skip(new VO.Number(6)))
                  .equals(sampleString));
        VO.assert(codePointString.take(new VO.Number(3))
                  .concatenate(codePointString.skip(new VO.Number(3)))
                  .equals(codePointString));
        VO.assert(new VO.String("foo").bind(new VO.Number(42)).equals(VO.fromNative({ "foo": 42 })));

        VO.assert(VO.emptyString.append(new VO.Number(72)).append(new VO.Number(105))
                  .equals(new VO.String("Hi")));
        VO.assert(VO.emptyString.append(new VO.Number(119913)).append(new VO.Number(119914))
                  .equals(new VO.String("𝑩𝑪")));

        VO.assert(VO.emptyString.equals(VO.String("")));
        VO.assert(VO.emptyString.equals(new VO.String("")));
        VO.assert(VO.Boolean(VO.emptyString !== new VO.String("")));
        VO.assert(VO.Boolean(VO.emptyString === new VO.String()));

        VO.assert(VO.emptyString.asJSON().equals(new VO.String('""')));
        VO.assert(sampleString.asJSON().equals(new VO.String('"Hello, World!"')));
        VO.assert(codePointString.asJSON().equals(new VO.String('"A\uD835\uDC68B\uD835\uDC69C\uD835\uDC6A"')));
        VO.assert((new VO.String(" \r\n")).asJSON().equals(new VO.String('" \\r\\n"')));

        // Array
        VO.assert(VO.Array.hasType(VO.Type));
        VO.assert(VO.Array.hasType(VO.Value));
        VO.assert(VO.Array.hasType(VO.Data).not());
        VO.assert(VO.Array.hasType(VO.Void).not());
        VO.assert(VO.Array.hasType(VO.Unit).not());
        VO.assert(VO.Array.hasType(VO.Boolean).not());
        VO.assert(VO.Array.hasType(VO.Number).not());
        VO.assert(VO.Array.hasType(VO.String).not());
        VO.assert(VO.Array.hasType(VO.Array).not());
        VO.assert(VO.Array.hasType(VO.Object).not());

        VO.assert(VO.Array.equals(VO.Type).not());
        VO.assert(VO.Array.equals(VO.Value).not());
        VO.assert(VO.Array.equals(VO.Data).not());
        VO.assert(VO.Array.equals(VO.Void).not());
        VO.assert(VO.Array.equals(VO.Unit).not());
        VO.assert(VO.Array.equals(VO.Boolean).not());
        VO.assert(VO.Array.equals(VO.Number).not());
        VO.assert(VO.Array.equals(VO.String).not());
        VO.assert(VO.Array.equals(VO.Array));
        VO.assert(VO.Array.equals(VO.Object).not());

        VO.assert(VO.emptyArray.hasType(VO.Type));
        VO.assert(VO.emptyArray.hasType(VO.Value));
        VO.assert(VO.emptyArray.hasType(VO.Data));
        VO.assert(VO.emptyArray.hasType(VO.Void).not());
        VO.assert(VO.emptyArray.hasType(VO.Unit).not());
        VO.assert(VO.emptyArray.hasType(VO.Boolean).not());
        VO.assert(VO.emptyArray.hasType(VO.Number).not());
        VO.assert(VO.emptyArray.hasType(VO.String).not());
        VO.assert(VO.emptyArray.hasType(VO.Array));
        VO.assert(VO.emptyArray.hasType(VO.Object).not());

        VO.assert(VO.emptyArray.equals(VO.void).not());
        VO.assert(VO.emptyArray.equals(VO.unit).not());
        VO.assert(VO.emptyArray.equals(VO.true).not());
        VO.assert(VO.emptyArray.equals(VO.false).not());
        VO.assert(VO.emptyArray.equals(VO.zero).not());
        VO.assert(VO.emptyArray.equals(VO.one).not());
        VO.assert(VO.emptyArray.equals(VO.two).not());
        VO.assert(VO.emptyArray.equals(VO.emptyString).not());
        VO.assert(VO.emptyArray.equals(VO.emptyArray));
        VO.assert(VO.emptyArray.equals(VO.emptyObject).not());

        VO.assert(VO.emptyArray.length().equals(VO.zero));
        VO.assert(sampleArray.length().equals(new VO.Number(8)));
        VO.assert(sampleArray.value(VO.zero).equals(VO.unit));
        VO.assert(sampleArray.value(new VO.Number(4)).equals(new VO.Number(1)));
        VO.assert(sampleArray.value(sampleArray.length().plus(VO.minusOne)).equals(VO.emptyObject));
        VO.assert(sampleArray.extract(VO.fromNative({from:0, upto:0})).equals(VO.emptyArray));
        VO.assert(sampleArray.extract(VO.fromNative({from:0, upto:1})).length().equals(VO.one));
        VO.assert(sampleArray.extract(VO.fromNative({from:1, upto:1})).length().equals(VO.zero));
        VO.assert(sampleArray
                  .extract(VO.fromNative({from:0}).concatenate((new VO.String("upto")).bind(sampleArray.length())))
                  .equals(sampleArray));
        VO.assert(VO.emptyArray.concatenate(VO.emptyArray).equals(VO.emptyArray));
        VO.assert(sampleArray.concatenate(VO.emptyArray).equals(sampleArray));
        VO.assert(VO.emptyArray.concatenate(sampleArray).equals(sampleArray));
        VO.assert(sampleArray.take(new VO.Number(4))
                  .concatenate(sampleArray.skip(new VO.Number(4)))
                  .equals(sampleArray));

        VO.assert(sampleString.asArray().asString().equals(sampleString));
        VO.assert(codePointString.asArray().asString().equals(codePointString));

        VO.assert(VO.emptyArray.equals(VO.Array([])));
        VO.assert(VO.emptyArray.equals(new VO.Array([])));
        VO.assert(VO.Boolean(VO.emptyArray !== new VO.Array([])));
        VO.assert(VO.Boolean(VO.emptyArray === new VO.Array()));

        VO.assert(VO.emptyArray.asJSON().equals(new VO.String('[]')));
        VO.assert(sampleArray.asJSON().equals(new VO.String('[null,true,false,0,1,"",[],{}]')));

        // Object
        VO.assert(VO.Object.hasType(VO.Type));
        VO.assert(VO.Object.hasType(VO.Value));
        VO.assert(VO.Object.hasType(VO.Data).not());
        VO.assert(VO.Object.hasType(VO.Void).not());
        VO.assert(VO.Object.hasType(VO.Unit).not());
        VO.assert(VO.Object.hasType(VO.Boolean).not());
        VO.assert(VO.Object.hasType(VO.Number).not());
        VO.assert(VO.Object.hasType(VO.String).not());
        VO.assert(VO.Object.hasType(VO.Array).not());
        VO.assert(VO.Object.hasType(VO.Object).not());

        VO.assert(VO.Object.equals(VO.Type).not());
        VO.assert(VO.Object.equals(VO.Value).not());
        VO.assert(VO.Object.equals(VO.Data).not());
        VO.assert(VO.Object.equals(VO.Void).not());
        VO.assert(VO.Object.equals(VO.Unit).not());
        VO.assert(VO.Object.equals(VO.Boolean).not());
        VO.assert(VO.Object.equals(VO.Number).not());
        VO.assert(VO.Object.equals(VO.String).not());
        VO.assert(VO.Object.equals(VO.Array).not());
        VO.assert(VO.Object.equals(VO.Object));

        VO.assert(VO.emptyObject.hasType(VO.Type));
        VO.assert(VO.emptyObject.hasType(VO.Value));
        VO.assert(VO.emptyObject.hasType(VO.Data));
        VO.assert(VO.emptyObject.hasType(VO.Void).not());
        VO.assert(VO.emptyObject.hasType(VO.Unit).not());
        VO.assert(VO.emptyObject.hasType(VO.Boolean).not());
        VO.assert(VO.emptyObject.hasType(VO.Number).not());
        VO.assert(VO.emptyObject.hasType(VO.String).not());
        VO.assert(VO.emptyObject.hasType(VO.Array).not());
        VO.assert(VO.emptyObject.hasType(VO.Object));

        VO.assert(VO.emptyObject.equals(VO.void).not());
        VO.assert(VO.emptyObject.equals(VO.unit).not());
        VO.assert(VO.emptyObject.equals(VO.true).not());
        VO.assert(VO.emptyObject.equals(VO.false).not());
        VO.assert(VO.emptyObject.equals(VO.zero).not());
        VO.assert(VO.emptyObject.equals(VO.one).not());
        VO.assert(VO.emptyObject.equals(VO.two).not());
        VO.assert(VO.emptyObject.equals(VO.emptyString).not());
        VO.assert(VO.emptyObject.equals(VO.emptyArray).not());
        VO.assert(VO.emptyObject.equals(VO.emptyObject));

        VO.assert(VO.emptyObject.names().equals(VO.emptyArray));
        VO.assert(sampleObject.names().length().equals(new VO.Number(8)));
        VO.assert(VO.emptyObject.hasProperty(new VO.String("zero")).not());
        VO.assert(sampleObject.hasProperty(new VO.String("zero")));
        VO.assert(sampleObject.hasProperty(new VO.String("none")).not());
        VO.assert(sampleObject.value(new VO.String("zero")).equals(VO.zero));
        VO.assert(sampleObject.value(new VO.String("one")).equals(new VO.Number(1)));
        VO.assert(sampleObject.value(new VO.String("emptyObject")).equals(VO.emptyObject));
        VO.assert(sampleObject.extract(VO.emptyArray).equals(VO.emptyObject));
        VO.assert(sampleObject.extract(VO.emptyArray.append(new VO.String("zero")))
                  .names().length().equals(VO.one));
        VO.assert(sampleObject.extract(VO.fromNative(["zero","one"]))
                  .names().length().equals(VO.two));
        VO.assert(sampleObject.extract(VO.fromNative(["zero","one"]))
                  .value(new VO.String("zero")).equals(VO.zero));
        VO.assert(sampleObject.extract(VO.fromNative(["zero","one"]))
                  .value(new VO.String("one")).equals(VO.one));
        VO.assert(sampleObject.extract(sampleObject.names())
                  .equals(sampleObject));
        VO.assert(VO.emptyObject.concatenate(VO.emptyObject).equals(VO.emptyObject));
        VO.assert(sampleObject.concatenate(VO.emptyObject).equals(sampleObject));
        VO.assert(VO.emptyObject.concatenate(sampleObject).equals(sampleObject));
        VO.assert(sampleObject.extract(VO.fromNative(["zero"]))
                  .concatenate(sampleObject.extract(VO.fromNative(["one"])))
                  .equals(sampleObject.extract(VO.fromNative(["one","zero"]))));
        const tmp = new VO.Object(
            {
                a: VO.true,
                b: VO.false
            }
        ).concatenate(new VO.Object(
            {
                b: VO.true,
                c: VO.true
            }
        ));
        VO.assert(tmp.value(new VO.String("a"))
                  .and(tmp.value(new VO.String("b")))
                  .and(tmp.value(new VO.String("c"))));

        VO.assert(
            VO.emptyObject
                .concatenate((new VO.String("space")).bind(new VO.Number(33)))
                .concatenate((new VO.String("bang")).bind(new VO.Number(34)))
                .equals(VO.fromNative(
                    {
                        "space": 33,
                        "bang": 34
                    }
                ))
        );

        VO.assert(VO.emptyObject.equals(VO.Object({})));
        VO.assert(VO.emptyObject.equals(new VO.Object({})));
        VO.assert(VO.Boolean(VO.emptyObject !== new VO.Object({})));
        VO.assert(VO.Boolean(VO.emptyObject === new VO.Object()));

        VO.assert(VO.emptyObject.asJSON().equals(new VO.String('{}')));
        VO.assert(
            VO.fromNative(
                {
                    unit: null,
                    true: true,
                    false: false,
                    zero: 0,
                    one: 1,
                    emptyString: "",
                    emptyArray: [],
                    emptyObject: {}
                }
            )
            .equals(sampleObject)
        );
        VO.assert(
            VO.fromNative(
                JSON.parse(
                    '{"unit":null, "true":true, "false":false, "zero":0, "one":1, "emptyString":"", "emptyArray":[], "emptyObject":{}}'
                )
            )
            .equals(sampleObject)
        );
        VO.assert(sampleObject.asJSON().equals(new VO.String('{"unit":null,"true":true,"false":false,"zero":0,"one":1,"emptyString":"","emptyArray":[],"emptyObject":{}}')));
    };
})();

deepFreeze(VO);
