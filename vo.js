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

VO.Value = (function (self = {})
{
    self = Object.assign(self,
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
        }
    );
    self.constructor.prototype = self;
    return self.constructor;
})();

VO.Data = (function (self = {})
{
    self = Object.assign(self,
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
    );
    self.constructor.prototype = self;
    return self.constructor;
})();

VO.Void = (function (self = {})
{
    self = Object.assign(self,
        VO.Data.prototype,
        {
            distinguished: ordinal(),
            constructor: function Void()
            {
                if (VO.void === undefined)
                {
                    this._value = undefined;
                    VO.void = deepFreeze(this);
                }
                return VO.void;
            }
        }
    );
    self.constructor.prototype = self;
    VO.void = new self.constructor();
    return self.constructor;
})();

VO.Unit = (function (self = {})
{
    self = Object.assign(self,
        VO.Data.prototype,
        {
            distinguished: ordinal(),
            constructor: function Unit()
            {
                if (VO.unit === undefined)
                {
                    this._value = null;
                    VO.unit = deepFreeze(this);
                }
                return VO.unit;
            }
        }
    );
    self.constructor.prototype = self;
    VO.unit = new self.constructor();
    return self.constructor;
})();

VO.Boolean = (function (self = {})
{
    self = Object.assign(self,
        VO.Data.prototype,
        {
            constructor: function Boolean(value)
            {
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
    );
    self.constructor.prototype = self;
    VO.true = new self.constructor(true);
    VO.false = new self.constructor(false);
    return self.constructor;
})();

VO.Number = (function (self = {})
{
    self = Object.assign(self,
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
    );
    self.constructor.prototype = self;
    VO.minusOne = new self.constructor(-1);
    VO.zero = new self.constructor(0);
    VO.one = new self.constructor(1);
    VO.two = new self.constructor(2);
    return self.constructor;
})();

VO.String = (function (self = {})
{
    self = Object.assign(self,
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
                return new VO.Number(this._value.length);
            },
            value(offset)
            {
                VO.assert(VO.zero.lessEqual(offset));
                VO.assert(offset.lessEqual(this.length()));
                return new VO.Number(this._value.codePointAt(offset._value));
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
                return new VO.String(this._value.slice(count._value, this.length()._value));
            },
            take(count)
            {
                VO.assert(count.hasType(VO.Number));
                VO.assert(count.greaterEqual(VO.zero));
                VO.assert(count.lessEqual(this.length()));
                return new VO.String(this._value.slice(0, count._value));
            },
            extract(interval)
            {
                // TODO: need VO.Object
            },
            append(value)
            {
                VO.assert(value.hasType(VO.Number));
                return new VO.String(this._value + String.fromCodePoint(value._value));
            },
            bind(value)
            {
                // TODO: need VO.Object
            },
            asArray()
            {
                // TODO: need VO.Array
            }
        }
    );
    self.constructor.prototype = self;
    VO.emptyString = new self.constructor("");
    return self.constructor;
})();

VO.selfTest = (function ()
{
    const value = new VO.Value();
    const data = new VO.Data();
    const sampleString = new VO.String("Hello, World!");
    return function selfTest()
    {
        // Value
        VO.assert(value.hasType(VO.Value));
        VO.assert(value.hasType(VO.Data).not());
        VO.assert(value.hasType(VO.Void).not());
        VO.assert(value.hasType(VO.Unit).not());
        VO.assert(value.hasType(VO.Boolean).not());
        VO.assert(value.hasType(VO.Number).not());
        VO.assert(value.hasType(VO.String).not());

        // Data
        VO.assert(data.hasType(VO.Value));
        VO.assert(data.hasType(VO.Data));
        VO.assert(data.hasType(VO.Void).not());
        VO.assert(data.hasType(VO.Unit).not());
        VO.assert(data.hasType(VO.Boolean).not());
        VO.assert(data.hasType(VO.Number).not());
        VO.assert(data.hasType(VO.String).not());

        // Void
        VO.assert(VO.void.hasType(VO.Value));
        VO.assert(VO.void.hasType(VO.Data));
        VO.assert(VO.void.hasType(VO.Void));
        VO.assert(VO.void.hasType(VO.Unit).not());
        VO.assert(VO.void.hasType(VO.Boolean).not());
        VO.assert(VO.void.hasType(VO.Number).not());
        VO.assert(VO.void.hasType(VO.String).not());

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
        VO.assert(VO.Boolean(VO.void === new VO.Void()));
        VO.assert(VO.Boolean(new VO.Void() === new VO.Void()));

        // Unit
        VO.assert(VO.unit.hasType(VO.Value));
        VO.assert(VO.unit.hasType(VO.Data));
        VO.assert(VO.unit.hasType(VO.Void).not());
        VO.assert(VO.unit.hasType(VO.Unit));
        VO.assert(VO.unit.hasType(VO.Boolean).not());
        VO.assert(VO.unit.hasType(VO.Number).not());
        VO.assert(VO.unit.hasType(VO.String).not());

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
        VO.assert(VO.Boolean(VO.unit === new VO.Unit()));
        VO.assert(VO.Boolean(new VO.Unit() === new VO.Unit()));

        // Boolean
        VO.assert(VO.true.hasType(VO.Value));
        VO.assert(VO.true.hasType(VO.Data));
        VO.assert(VO.true.hasType(VO.Void).not());
        VO.assert(VO.true.hasType(VO.Unit).not());
        VO.assert(VO.true.hasType(VO.Boolean));
        VO.assert(VO.true.hasType(VO.Number).not());
        VO.assert(VO.true.hasType(VO.String).not());

        VO.assert(VO.true.equals(VO.void).not());
        VO.assert(VO.true.equals(VO.unit).not());
        VO.assert(VO.true.equals(VO.true));
        VO.assert(VO.true.equals(VO.false).not());
        VO.assert(VO.true.equals(VO.zero).not());
        VO.assert(VO.true.equals(VO.minusOne).not());
        VO.assert(VO.true.equals(VO.one).not());
        VO.assert(VO.true.equals(VO.two).not());
        VO.assert(VO.true.equals(VO.emptyString).not());

        VO.assert(VO.false.hasType(VO.Value));
        VO.assert(VO.false.hasType(VO.Data));
        VO.assert(VO.false.hasType(VO.Void).not());
        VO.assert(VO.false.hasType(VO.Unit).not());
        VO.assert(VO.false.hasType(VO.Boolean));
        VO.assert(VO.false.hasType(VO.Number).not());
        VO.assert(VO.false.hasType(VO.String).not());

        VO.assert(VO.false.equals(VO.void).not());
        VO.assert(VO.false.equals(VO.unit).not());
        VO.assert(VO.false.equals(VO.true).not());
        VO.assert(VO.false.equals(VO.false));
        VO.assert(VO.false.equals(VO.zero).not());
        VO.assert(VO.false.equals(VO.minusOne).not());
        VO.assert(VO.false.equals(VO.one).not());
        VO.assert(VO.false.equals(VO.two).not());
        VO.assert(VO.false.equals(VO.emptyString).not());

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
        VO.assert(VO.zero.hasType(VO.Value));
        VO.assert(VO.zero.hasType(VO.Data));
        VO.assert(VO.zero.hasType(VO.Void).not());
        VO.assert(VO.zero.hasType(VO.Unit).not());
        VO.assert(VO.zero.hasType(VO.Boolean).not());
        VO.assert(VO.zero.hasType(VO.Number));
        VO.assert(VO.zero.hasType(VO.String).not());

        VO.assert(VO.zero.equals(VO.void).not());
        VO.assert(VO.zero.equals(VO.unit).not());
        VO.assert(VO.zero.equals(VO.true).not());
        VO.assert(VO.zero.equals(VO.false).not());
        VO.assert(VO.zero.equals(VO.zero));
        VO.assert(VO.zero.equals(VO.one).not());
        VO.assert(VO.zero.equals(VO.two).not());
        VO.assert(VO.zero.equals(VO.emptyString).not());

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
        VO.assert(VO.emptyString.hasType(VO.Value));
        VO.assert(VO.emptyString.hasType(VO.Data));
        VO.assert(VO.emptyString.hasType(VO.Void).not());
        VO.assert(VO.emptyString.hasType(VO.Unit).not());
        VO.assert(VO.emptyString.hasType(VO.Boolean).not());
        VO.assert(VO.emptyString.hasType(VO.Number).not());
        VO.assert(VO.emptyString.hasType(VO.String));

        VO.assert(VO.emptyString.equals(VO.void).not());
        VO.assert(VO.emptyString.equals(VO.unit).not());
        VO.assert(VO.emptyString.equals(VO.true).not());
        VO.assert(VO.emptyString.equals(VO.false).not());
        VO.assert(VO.emptyString.equals(VO.zero).not());
        VO.assert(VO.emptyString.equals(VO.one).not());
        VO.assert(VO.emptyString.equals(VO.two).not());
        VO.assert(VO.emptyString.equals(VO.emptyString));

        VO.assert(VO.emptyString.length().equals(VO.zero));
        VO.assert(sampleString.length().equals(new VO.Number(13)));
        VO.assert(sampleString.value(VO.zero).equals(new VO.Number(72)));  // "H"
        VO.assert(sampleString.value(new VO.Number(6)).equals(new VO.Number(32)));  // " "
        VO.assert(sampleString.value(sampleString.length().plus(VO.minusOne)).equals(new VO.Number(33)));  // "!"
        // VO.assert(sampleString.extract(VO.fromNative({from:0, upto:0})).equals(VO.emptyString));
        // VO.assert(sampleString.extract(VO.fromNative({from:0, upto:1})).length().equals(VO.one));
        // VO.assert(sampleString.extract(VO.fromNative({from:1, upto:1})).length().equals(VO.zero));
        // VO.assert(sampleString
        //           .extract(VO.fromNative({from:0}).concatenate((new VO.String("upto")).bind(sampleString.length)))
        //           .equals(sampleString));
        // VO.assert(sampleString.extract(VO.fromNative({from:0, upto:5})).equals(new VO.String("Hello")));
        VO.assert(sampleString.skip(new VO.Number(7)).take(new VO.Number(5)).equals(new VO.String("World")));
        VO.assert(VO.emptyString.concatenate(VO.emptyString).equals(VO.emptyString));
        VO.assert(sampleString.concatenate(VO.emptyString).equals(sampleString));
        VO.assert(VO.emptyString.concatenate(sampleString).equals(sampleString));
        VO.assert(sampleString.take(new VO.Number(6))
                  .concatenate(sampleString.skip(new VO.Number(6)))
                  .equals(sampleString));
        // VO.assert(new VO.String("foo").bind(new VO.Number(42)).equals(VO.fromNative({ "foo": 42 })));

        VO.assert(VO.emptyString.append(new VO.Number(72)).append(new VO.Number(105))
                  .equals(new VO.String("Hi")));
        // VO.assert(sampleString.reduce(
        //               function (c, x) {
        //                   return x.plus(VO.one);
        //               }, VO.zero)
        //           .equals(sampleString.length));

        VO.assert(VO.emptyString.equals(VO.String("")));
        VO.assert(VO.emptyString.equals(new VO.String("")));
        VO.assert(VO.Boolean(VO.emptyString !== new VO.String("")));
        VO.assert(VO.Boolean(VO.emptyString === new VO.String()));

        VO.assert(VO.emptyString.asJSON().equals(new VO.String('""')));
        VO.assert(sampleString.asJSON().equals(new VO.String('"Hello, World!"')));
        VO.assert((new VO.String(" \r\n")).asJSON().equals(new VO.String('" \\r\\n"')));
    };
})();

VO.selfTest();
