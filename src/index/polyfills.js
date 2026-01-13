let JavalikeEquals = function (value) {
    if (value == null)
        return false;
    if (value.valueOf)
        return this.valueOf() === value.valueOf();
    return this === value;
};

let JavalikeGetClass = function () {
    return this.constructor;
};

/* String */
if (!String.prototype.equals) {
    String.prototype.equals = JavalikeEquals;
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (start, from) {
        let f = from != null ? from : 0;
        return this.substring(f, f + start.length) == start;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (end) {
        if (end == null)
            return false;
        if (this.length < end.length)
            return false;
        return this.substring(this.length - end.length, this.length) == end;
    };
}
if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+/, "").replace(/\s+$/, "");
    };
}
if (!String.prototype.matches) {
    String.prototype.matches = function (regexp) {
        return this.match("^" + regexp + "$") != null;
    };
}
if (!String.prototype.compareTo) {
    String.prototype.compareTo = function (other) {
        if (other == null)
            return 1;
        if (this < other)
            return -1;
        if (this == other)
            return 0;
        return 1;
    };
}

if (!String.prototype.compareToIgnoreCase) {
    String.prototype.compareToIgnoreCase = function (other) {
        if (other == null)
            return 1;
        return this.toLowerCase().compareTo(other.toLowerCase());
    };
}

if (!String.prototype.equalsIgnoreCase) {
    String.prototype.equalsIgnoreCase = function (other) {
        if (other == null)
            return false;
        return this.toLowerCase() === other.toLowerCase();
    };
}

if (!String.prototype.codePointAt) {
    String.prototype.codePointAt = String.prototype.charCodeAt;
}

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (regexp, replace) {
        return this.replace(new RegExp(regexp, "g"), replace);
    };
}

if (!String.prototype.replaceFirst) {
    String.prototype.replaceFirst = function (regexp, replace) {
        return this.replace(new RegExp(regexp), replace);
    };
}

if (!String.prototype.regionMatches) {
    String.prototype.regionMatches = function (ignoreCase, toffset, other, ooffset, len) {
        if (arguments.length == 4) {
            len = arguments[3];
            ooffset = arguments[2];
            other = arguments[1];
            toffset = arguments[0];
            ignoreCase = false;
        }
        if (toffset < 0 || ooffset < 0 || other == null || toffset + len > this.length || ooffset + len > other.length)
            return false;
        let s1 = this.substring(toffset, toffset + len);
        let s2 = other.substring(ooffset, ooffset + len);
        return ignoreCase ? s1.equalsIgnoreCase(s2) : s1 === s2;
    };
}

if (!String.prototype.contains) {
    String.prototype.contains = function (it) {
        return this.indexOf(it) >= 0;
    };
}

if (!String.prototype.getClass) {
    String.prototype.getClass = JavalikeGetClass;
}


// force valueof to match the Java's behavior
String.valueOf = function (value) {
    return new String(value);
};

/* Number */
let Byte = Number;
let Double = Number;
let Float = Number;
let Integer = Number;
let Long = Number;
let Short = Number;

/* type conversion - approximative as Javascript only has integers and doubles */
if (!Number.prototype.intValue) {
    Number.prototype.intValue = function () {
        return parseInt(this);
    };
}
if (!Number.prototype.shortValue) {
    Number.prototype.shortValue = function () {
        return parseInt(this);
    };
}
if (!Number.prototype.longValue) {
    Number.prototype.longValue = function () {
        return parseInt(this);
    };
}
if (!Number.prototype.byteValue) {
    Number.prototype.byteValue = function () {
        return parseInt(this);
    };
}

if (!Number.prototype.floatValue) {
    Number.prototype.floatValue = function () {
        return parseFloat(this);
    };
}

if (!Number.prototype.doubleValue) {
    Number.prototype.doubleValue = function () {
        return parseFloat(this);
    };
}

if (!Number.parseInt) {
    Number.parseInt = parseInt;
}
if (!Number.parseShort) {
    Number.parseShort = parseInt;
}
if (!Number.parseLong) {
    Number.parseLong = parseInt;
}
if (!Number.parseByte) {
    Number.parseByte = parseInt;
}

if (!Number.parseDouble) {
    Number.parseDouble = parseFloat;
}

if (!Number.parseFloat) {
    Number.parseFloat = parseFloat;
}

if (!Number.isNaN) {
    Number.isNaN = isNaN;
}

if (!Number.prototype.isNaN) {
    Number.prototype.isNaN = function () {
        return isNaN(this);
    };
}
if (!Number.prototype.equals) {
    Number.prototype.equals = JavalikeEquals;
}
if (!Number.prototype.getClass) {
    Number.prototype.getClass = JavalikeGetClass;
}

// force valueof to match approximately the Java's behavior (for Integer.valueOf it returns in fact a double)
Number.valueOf = function (value) {
    return new Number(value).valueOf();
};

/* Boolean */
if (!Boolean.prototype.equals) {
    Boolean.prototype.equals = JavalikeEquals;
}
if (!Boolean.prototype.getClass) {
    Boolean.prototype.getClass = JavalikeGetClass;
}

// force valueof to match the Java's behavior
Boolean.valueOf = function (value) {
    return new Boolean(value).valueOf();
};
