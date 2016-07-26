# tinyajax
A tiny ajax library for work with json.

Tinyajax is a tiny javascript library for ajax queries, and get responses in json format.

It use a single callback function with one parameter.
On success it is the json object, else is false.

Possible errors are because:
 - timeout
 - server
 - invalid json format reply

Works in IE6+ for request in the same page.
For cross domain requests works on IE8+.

The URL can be relative or absolute. In the case of absolute, you specify the protocol.
The protocol can be relative.
Only supported protocols are:

 1. http://
 2. https://
 3. //

Prototypes:
```javascript
tinyajax.get(url, call_back, [max_seconds]);
tinyajax.post(url, arr_data, callback, [max_seconds]);
```

max_seconds is optional must be greater than 0. The default value is 3 seconds.
If you want to use max_seconds in post without data, pass null as arr_data.


Example of usage:

```javascript
function read() {
  tinyajax.post('http://someurl/ws/test', {
    comment: 'Hello'
  }, function(json_obj) {
    if (!json_obj) {
      alert('error getting response');
    } else {
      alert(json_obj.message);
    }
  });
}
```
