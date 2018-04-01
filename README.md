# hsvpicker

Canvas-based color picker, based on Paint Tool Sai's Color Picker

![HSV Picker Image](https://i.imgur.com/skEdJS7.png)

# Usage
Creates a hsv picker and appends it to the element #parentId
```js
var radius = 200
var onChange = function(r, g, b) {
    console.log('r: ' + r + ' b: ' + b + ' g: ' + g);
}
var picker = new hsvPicker('id', 'parentId', radius, onChange);
```

Resizes and replaces the picker
```js
picker.resize(100);
```

Get/Set RGB
```js
var rbg = picker.getColor();
console.log(rgb.r); //255
console.log(rgb.g); //0
console.log(rgb.b); //0

var newColor = {'r': 0, 'g': 255, 'b': 0}
picker.setColor(newColor);

// Can also use hex
picker.setColorHex('#ff00ff');
picker.getHex(); // #ff00ff
```