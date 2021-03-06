//
// tinyajax v1.0
// Author: Carlos Montiers Aguilera.
// Date: 2016-july-26.
//
//tinyajax.get(url, call_back, [max_seconds]);
//tinyajax.post(url, arr_data, callback, [max_seconds]);
//
var tinyajax = (function () {

    function Request(method, page, content, callback, max_seconds) {
        var loc, protocol, port, origin1, origin2, using_cors;
        if (typeof method !== "string") {
            throw "method is not string.";
        }
        if (typeof page !== "string") {
            throw "page is not string.";
        }
        if (typeof callback !== "function") {
            throw "callback is not function.";
        }
        if (content && (typeof content !== "object")) {
            throw "content is not object.";
        }
        this.time_limit = 3000;//default 3 seconds
        if (typeof max_seconds !== "undefined") {
            max_seconds = parseInt(max_seconds, 10) || 0;
            if (max_seconds <= 0) {
                throw "max_seconds must be greather than 0";
            } else {
                this.time_limit = max_seconds * 1000;
            }
        }
        loc = document.location;
        protocol = (function () {
            if ("https:" === loc.protocol) {
                return "https:";
            } else {
                return "http:";
            }
        }());
        port = loc.port;
        if (!port) {
            if (protocol === "https:") {
                port = "443";
            }
            else if (protocol === "http:") {
                port = "80";
            }
        }
        page = page.replace(/^\s+|\s+$/gm, "");//trim
        if (page.substr(0, 2) === "//") {//relative protocol
            page = protocol + page;
        }
        else if (!(/^[a-z]+:\/\//).test(page)) {//page without protocol
            if (page.substr(0, 1) === "/") {
                page = loc.protocol + "//" + loc.host + page;
            } else {
                var parts_pathname, pathname;
                parts_pathname = loc.pathname.split("/");
                parts_pathname.pop();
                pathname = parts_pathname.join("/");
                page = loc.protocol + "//" + loc.host + pathname + "/" + page;
            }
        }
        if (!(/^(http|https):\/\//).test(page)) {
            throw "protocol of page must be http: or https: .";
        }
        origin1 = loc.protocol + "//" + loc.hostname + "/";
        origin2 = loc.protocol + "//" + loc.hostname + ":" + port + "/";
        using_cors = (page.indexOf(origin1) !== 0) && (page.indexOf(origin2) !== 0);
        //Prevent cache
        page += ((/\?/).test(page) ? "&" : "?") + "_=" + Request.anticache++;
        var my = this;
        this.method = method;
        this.page = page;
        this.callback = callback;
        this.is_get = "GET" === this.method;
        this.is_post = "POST" === this.method;
        if (!this.is_get && !this.is_post) {
            throw "not valid method.";
        }
        try {
            this.post_data = "";
            if (this.is_post) {
                if (content) {
                    var par = [], k, v, arr_id;
                    for (arr_id in content) {
                        k = this.encode_for_post(arr_id);
                        v = this.encode_for_post(content[arr_id]);
                        par.push(k + "=" + v);
                    }
                    this.post_data = par.join("&");
                    par = [];
                }
            }
            this.req = (function (is_cors) {
                var x = null, is_xdr = false;

                try {
                    x = new window.XMLHttpRequest();
                } catch (a) {
                    try {
                        x = new window.ActiveXObject('Msxml2.XMLHTTP');
                    } catch (b) {
                        try {
                            x = new window.ActiveXObject('Microsoft.XMLHTTP');
                        } catch (c) {
                            x = null;
                        }
                    }
                }

                if (!x || (is_cors && !("withCredentials" in x))) {
                    try {
                        x = new window.XDomainRequest();
                        is_xdr = true;
                    } catch (d) {
                        x = null;
                    }
                }

                return {
                    x: x,
                    is_xdr: is_xdr
                };
            }(using_cors));
            this.general_error = false;
            this.time_error = false;
            this.error_called = false;
            this.success_called = false;
            this.timer = 0;
            if (!this.req.x) {
                this.generate_error();
            } else {
                if (typeof this.req.x.onerror !== "undefined") {
                    this.req.x.onerror = function () {
                        my.generate_error();
                    };
                }
                if (this.req.is_xdr) {
                    this.req.x.open(this.method, this.page);
                    this.config_xdr(this.req.x);
                } else {
                    this.req.x.open(this.method, this.page, true);
                    this.config_xhr(this.req.x);
                }
                if (this.is_post) {
                    if (!this.req.is_xdr) {
                        this.req.x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    }
                    this.req.x.send(this.post_data);
                } else {
                    this.req.x.send();
                }
                this.start_timing(this.req.x);
                this.req.x = null;
                this.req = null;
            }
        } catch (e) {
            this.generate_error();
        }
    }

    Request.anticache = ((new Date()).getTime());

    Request.prototype = {
        config_xdr: function (x) {
            var my = this;
            x.onload = function () {
                my.generate_success(x.responseText);
                x = null;
            };
        },
        config_xhr: function (x) {
            var my = this;
            x.onreadystatechange = function () {
                if (x.readyState === 4) {
                    if (my.is_status_success(x.status)) {
                        my.generate_success(x.responseText);
                    } else {
                        my.generate_error();
                    }
                    x = null;
                }
            };
        },
        start_timing: function (x) {
            var my = this;
            this.timer = setTimeout(function () {
                my.cancel_timing();
                my.time_error = true;
                x.abort();
                x = null;
                my.reply_error();
            }, this.time_limit);
        },
        cancel_timing: function () {
            clearTimeout(this.timer);
        },
        generate_success: function (text) {
            this.cancel_timing();
            this.reply_success(text);
        },
        generate_error: function () {
            this.cancel_timing();
            this.general_error = true;
            this.reply_error();
        },
        error_ocurred: function () {
            return (this.general_error || this.time_error);
        },
        reply_success: function (text) {
            if (!this.error_ocurred() && !this.success_called) {
                this.success_called = true;
                if (!this.error_called) {
                    this.req = null;
                    this.callback(this.text_to_json(text));
                }
            }
        },
        reply_error: function () {
            if (this.error_ocurred() && !this.error_called) {
                this.error_called = true;
                if (!this.success_called) {
                    this.req = null;
                    this.callback(false);
                }
            }
        },
        is_status_success: function (status_code) {
            if (status_code === 1223) { //ie fix
                status_code = 204;
            }
            return (((status_code >= 200) && (status_code < 300)) || (status_code === 304));
        },
        text_to_json: function (text) {
            try {
                return this.json_parse(text);
            } catch (e) {
                return false;
            }
        },
        encode_for_post: function (text) {
            return encodeURIComponent(text).replace(/%20/g, "+");
        },
        json_parse: (function () {
            // This function creates a JSON parse function that uses a state machine rather
            // than the dangerous eval function to parse a JSON text.
            var state, // The state of the parser, one of
            // "go"         The starting state
            // "ok"         The final, accepting state
            // "firstokey"  Ready for the first key of the object or
            //              the closing of an empty object
            // "okey"       Ready for the next key of the object
            // "colon"      Ready for the colon
            // "ovalue"     Ready for the value half of a key/value pair
            // "ocomma"     Ready for a comma or closing }
            // "firstavalue" Ready for the first value of an array or
            //              an empty array
            // "avalue"     Ready for the next value of an array
            // "acomma"     Ready for a comma or closing ]
                stack, // The stack, for controlling nesting.
                container, // The current container object or array
                key, // The current key
                value, // The current value
                escapes = {// Escapement translation table
                    "\\": "\\",
                    "\"": "\"",
                    "/": "/",
                    "t": "\t",
                    "n": "\n",
                    "r": "\r",
                    "f": "\f",
                    "b": "\b"
                },
                string = {// The actions for string tokens
                    go: function () {
                        state = "ok";
                    },
                    firstokey: function () {
                        key = value;
                        state = "colon";
                    },
                    okey: function () {
                        key = value;
                        state = "colon";
                    },
                    ovalue: function () {
                        state = "ocomma";
                    },
                    firstavalue: function () {
                        state = "acomma";
                    },
                    avalue: function () {
                        state = "acomma";
                    }
                },
                number = {// The actions for number tokens
                    go: function () {
                        state = "ok";
                    },
                    ovalue: function () {
                        state = "ocomma";
                    },
                    firstavalue: function () {
                        state = "acomma";
                    },
                    avalue: function () {
                        state = "acomma";
                    }
                },
                action = {
                    // The action table describes the behavior of the machine. It contains an
                    // object for each token. Each object contains a method that is called when
                    // a token is matched in a state. An object will lack a method for illegal
                    // states.
                    "{": {
                        go: function () {
                            stack.push({
                                state: "ok"
                            });
                            container = {};
                            state = "firstokey";
                        },
                        ovalue: function () {
                            stack.push({
                                container: container,
                                state: "ocomma",
                                key: key
                            });
                            container = {};
                            state = "firstokey";
                        },
                        firstavalue: function () {
                            stack.push({
                                container: container,
                                state: "acomma"
                            });
                            container = {};
                            state = "firstokey";
                        },
                        avalue: function () {
                            stack.push({
                                container: container,
                                state: "acomma"
                            });
                            container = {};
                            state = "firstokey";
                        }
                    },
                    "}": {
                        firstokey: function () {
                            var pop = stack.pop();
                            value = container;
                            container = pop.container;
                            key = pop.key;
                            state = pop.state;
                        },
                        ocomma: function () {
                            var pop = stack.pop();
                            container[key] = value;
                            value = container;
                            container = pop.container;
                            key = pop.key;
                            state = pop.state;
                        }
                    },
                    "[": {
                        go: function () {
                            stack.push({
                                state: "ok"
                            });
                            container = [];
                            state = "firstavalue";
                        },
                        ovalue: function () {
                            stack.push({
                                container: container,
                                state: "ocomma",
                                key: key
                            });
                            container = [];
                            state = "firstavalue";
                        },
                        firstavalue: function () {
                            stack.push({
                                container: container,
                                state: "acomma"
                            });
                            container = [];
                            state = "firstavalue";
                        },
                        avalue: function () {
                            stack.push({
                                container: container,
                                state: "acomma"
                            });
                            container = [];
                            state = "firstavalue";
                        }
                    },
                    "]": {
                        firstavalue: function () {
                            var pop = stack.pop();
                            value = container;
                            container = pop.container;
                            key = pop.key;
                            state = pop.state;
                        },
                        acomma: function () {
                            var pop = stack.pop();
                            container.push(value);
                            value = container;
                            container = pop.container;
                            key = pop.key;
                            state = pop.state;
                        }
                    },
                    ":": {
                        colon: function () {
                            if (Object.hasOwnProperty.call(container, key)) {
                                throw new SyntaxError("Duplicate key \"" + key + "\"");
                            }
                            state = "ovalue";
                        }
                    },
                    ",": {
                        ocomma: function () {
                            container[key] = value;
                            state = "okey";
                        },
                        acomma: function () {
                            container.push(value);
                            state = "avalue";
                        }
                    },
                    "true": {
                        go: function () {
                            value = true;
                            state = "ok";
                        },
                        ovalue: function () {
                            value = true;
                            state = "ocomma";
                        },
                        firstavalue: function () {
                            value = true;
                            state = "acomma";
                        },
                        avalue: function () {
                            value = true;
                            state = "acomma";
                        }
                    },
                    "false": {
                        go: function () {
                            value = false;
                            state = "ok";
                        },
                        ovalue: function () {
                            value = false;
                            state = "ocomma";
                        },
                        firstavalue: function () {
                            value = false;
                            state = "acomma";
                        },
                        avalue: function () {
                            value = false;
                            state = "acomma";
                        }
                    },
                    "null": {
                        go: function () {
                            value = null;
                            state = "ok";
                        },
                        ovalue: function () {
                            value = null;
                            state = "ocomma";
                        },
                        firstavalue: function () {
                            value = null;
                            state = "acomma";
                        },
                        avalue: function () {
                            value = null;
                            state = "acomma";
                        }
                    }
                };

            function debackslashify(text) {
                // Remove and replace any backslash escapement.
                return text.replace(/\\(?:u(.{4})|([^u]))/g, function (ignore, b, c) {
                    return b ? String.fromCharCode(parseInt(b, 16)) : escapes[c];
                });
            }

            return function (source) {
                // A regular expression is used to extract tokens from the JSON text.
                // The extraction process is cautious.
                var result,
                    tx = /^[\u0020\t\n\r]*(?:([,:\[\]{}]|true|false|null)|(-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|"((?:[^\r\n\t\\"]|\\(?:["\\\/trnfb]|u[0-9a-fA-F]{4}))*)")/;
                // Set the starting state.
                state = "go";
                // The stack records the container, key, and state for each object or array
                // that contains another object or array while processing nested structures.
                stack = [];
                // If any error occurs, we will catch it and ultimately throw a syntax error.
                try {
                    // For each token...
                    for (; ;) {
                        result = tx.exec(source);
                        if (!result) {
                            break;
                        }
                        // result is the result array from matching the tokenizing regular expression.
                        //  result[0] contains everything that matched, including any initial whitespace.
                        //  result[1] contains any punctuation that was matched, or true, false, or null.
                        //  result[2] contains a matched number, still in string form.
                        //  result[3] contains a matched string, without quotes but with escapement.
                        if (result[1]) {
                            // Token: Execute the action for this state and token.
                            action[result[1]][state]();
                        } else if (result[2]) {
                            // Number token: Convert the number string into a number value and execute
                            // the action for this state and number.
                            value = +result[2];
                            number[state]();
                        } else {
                            // String token: Replace the escapement sequences and execute the action for
                            // this state and string.
                            value = debackslashify(result[3]);
                            string[state]();
                        }
                        // Remove the token from the string. The loop will continue as long as there
                        // are tokens. This is a slow process, but it allows the use of ^ matching,
                        // which assures that no illegal tokens slip through.
                        source = source.slice(result[0].length);
                    }
                    // If we find a state/token combination that is illegal, then the action will
                    // cause an error. We handle the error by simply changing the state.
                } catch (e) {
                    state = e;
                }
                // The parsing is finished. If we are not in the final "ok" state, or if the
                // remaining source contains anything except whitespace, then we did not have
                //a well-formed JSON text.
                if (state !== "ok" || (/[^\u0020\t\n\r]/.test(source))) {
                    throw state instanceof SyntaxError ? state : new SyntaxError("JSON");
                }
                return value;
            };
        }())
    };

    return {
        "get": function (page, callback, max_seconds) {
            var obj = new Request("GET", page, null, callback, max_seconds);
            obj = null;
        },
        "post": function (page, content, callback, max_seconds) {
            var obj = new Request("POST", page, content, callback, max_seconds);
            obj = null;
        },
        "about": function () {
            return "Tinyajax v1.0 programmed by Carlos Montiers Aguilera.";
        }
    };
}());
