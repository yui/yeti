function color (code, string) {
    return "\033[" + code + "m" + string + "\033[0m";
}

function factory (code) {
    return function (string) {
        return color(code, string);
    }
}

exports.codes = {
    bold : factory(1),
    red : factory(31),
    green : factory(32),
    blue : factory(34)
};
