'use strict';

/** HSL Color Picker */
class HSLPicker {
    /**
     * Constructs a HSLPicker and appends it to #parentId
     * @param {String} id The id of the HSLPicker canvas
     * @param {String} parentId The id of the parent element
     * @param {Number} radius The radius of the picker
     * @param {Function} onColorChange Function to call on color change
     */
    constructor(id, parentId, radius, onColorChange, hue = 0) {
        /** Init variables */
        this.id = id;
        this.parentId = parentId;
        this.radius = radius;

        /** Diameter of hue ring */
        this.ringsize = radius / 5;

        /** Function to be called on color change */
        this.onColorChange = onColorChange;

        /** Hue (0 - 360) */
        this.hue = hue;

        this.color = '';

        /** Length of one side of the square. sin(45) = o/h */
        this.squareLength = Math.sqrt(2) * (this.radius - this.ringsize);

        /** Track if we're currently selecting the hue ring or inner square */
        this.outerActive = false;
        this.innerActive = false;

        /** Outer ring pos */
        this.ox = 0;
        this.oy = 0;

        /** Inside ring pos */
        this.ix = this.radius;
        this.iy = this.radius;

        /** Create canvas */
        this.can = document.createElement('canvas');
        this.can.width = radius * 2;
        this.can.height = radius * 2;
        this.can.id = id;
        this.ctx = this.can.getContext('2d');

        /** Setup */
        this.drawHueWheel();
        this.setHue(hue * (Math.PI / 180));

        /** Event functions */
        var mDown = evt => {
            evt.preventDefault();
            var pos = this.normalizePos(evt);

            /** Distance from center */
            var dist = Math.sqrt(Math.pow(this.radius - pos.x, 2) + Math.pow(this.radius - pos.y, 2));

            /** If we clicked somewhere in the hue ring */
            if (dist < this.radius && dist > this.radius - this.ringsize) {
                this.outerActive = true;
                this.updateOuter(evt);
                this.onChange();
            }

            /** If clicked somewhere in the inner square */
            if (dist < this.squareLength / 2) {
                this.innerActive = true;
                this.updateInner(evt);
                this.onChange();
            }
        }

        var mMove = evt => {
            if (this.outerActive) {
                this.updateOuter(evt);
                this.onChange();
            } else if (this.innerActive) {
                this.updateInner(evt);
                this.onChange();
            }
        }

        var mUp = evt => {
            this.innerActive = false;
            this.outerActive = false;
        }

        /** Event listeners */
        this.can.addEventListener('mousedown', mDown);
        document.addEventListener('mouseup', mUp);
        document.addEventListener('mousemove', mMove);

        this.can.addEventListener('touchstart', mDown);
        document.addEventListener('touchend', mUp);
        document.addEventListener('touchmove', mMove);

        /** Add the canvas to the parent element */
        document.getElementById(parentId).appendChild(this.can);
    }

    /** Core functions */

    /**
     * Returns a HSLPicker with all the same properties with the new size
     * @param {Number} radius The radius of the picker
     */
    resize(radius) {
        document.getElementById(this.id).remove();
        var newWheel = new HSLPicker(this.id, this.parentId, radius, this.onColorChange, this.hue);
        var rgb = this.getColor();
        newWheel.setColor(rgb.r, rgb.g, rgb.b);
        return newWheel;
    }

    /**
     * Sets the hue and redraws
     * @param {Number} hue
     */
    setHue(hue) {
        /** Convert hue from radians */
        this.hue = hue * (180 / Math.PI);
        if(this.hue < 0) {
            this.hue += 360;
        }

        /** Update the outer picker */
        var ringMiddle = this.radius - (this.ringsize / 2);
        this.ox = Math.cos(hue) * ringMiddle  + this.radius;
        this.oy = Math.sin(hue) * ringMiddle  + this.radius;

        this.redraw();
    }

    /**
     * Gets the current color in RGB
     */
    getColor() {
        var c = this.ctx.getImageData(this.ix, this.iy, 1, 1).data;
        return { 'r': c[0], 'g': c[1], 'b': c[2] };
    }

    /**
     * Sets the color of the picker
     * @param {Number} r Red (0 - 255)
     * @param {Number} g Green (0 - 255)
     * @param {Number} b Blue (0 - 255)
     */
    setColor(r, g, b) {
        var hsl = ColorConvert.RGBtoHSL(r, g, b);
        var hsv = ColorConvert.HSLToHSB(hsl.h / 60, hsl.s / 100, hsl.l / 100);

        this.setHue(hsv.h * (Math.PI) / 180);

        /** Update ix and iy
         * x -> saturation; start at left and move right to increase
         * y -> brightness, start at bottom and move upwards to increase
         */
        var x = this.radius - (this.squareLength / 2) + ((this.squareLength) * (hsv.s / 100));
        var y = this.radius + (this.squareLength / 2) - ((this.squareLength) * (hsv.b / 100));
        this._setIXY(x, y);
        this.redraw();
    }

    /**
     * Sets the color using a hex value
     * @param {String} hex Hex String
     */
    setColorHex(hex) {
        var rgb = ColorConvert.HexToRGB(hex);
        this.setColor(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Gets the current value in hex
     */
    getHex() {
        var rgb = this.getColor();
        var toHex = function(val) {
            var hex = val.toString(16);
            return hex.length == 1 ? '0' + hex : hex;
        }
        return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
    }

    /**
     * Updates the picker for the hue ring
     * @param {Event} evt The event that triggered this
     */
    updateOuter(evt) {
        /** Gets the angle of the click in the hue ring, and sets the hue to that value */
        var pos = this.normalizePos(evt);
        var angle = Math.atan2(pos.y - this.radius, pos.x - this.radius);
        this.setHue(angle);
    }

    /**
     * Updates the inner picker
     * @param {Event} evt The event that triggered this
     */
    updateInner(evt) {
        var pos = this.normalizePos(evt);
        this._setIXY(pos.x, pos.y);
        this.redraw();
    }

    /**
     * Calls onColorChange() with r, g, b
     */
    onChange() {
        var rgb = this.getColor();
        this.onColorChange(rgb.r, rgb.g, rgb.b);
    }

    /** Drawing functions */

    /**
     * Redraws all the parts of the picker
     */
    redraw() {
        this.ctx.clearRect(0, 0, this.radius * 2, this.radius * 2);
        this.drawHueWheel();
        this.drawColorSquare();
        this.drawCircle(this.ix, this.iy, 3);
        this.drawCircle(this.ox, this.oy, (this.ringsize / 2));
    }

    /**
     * Draw a circle at (x, y) with a given radius
     * @param {Number} x
     * @param {Number} y
     * @param {Number} size
     */
    drawCircle(x, y, radius) {
        this.ctx.save();

        /** Draw a circle at (x, y) */
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Draws the outer hue wheel
     */
    drawHueWheel() {
        this.ctx.save();

        /** Render the hue circle */
        for (var i = 0; i < 360; i++) {
            this.ctx.beginPath();
            this.ctx.fillStyle = 'hsl(' + i + ', 100%, 50%)';
            this.ctx.moveTo(this.radius, this.radius);
            this.ctx.arc(this.radius, this.radius, this.radius, (i - 4) * (Math.PI / 180), (i * (Math.PI / 180)), false);
            this.ctx.fill();
        }

        /** Hide the middle of it with white */
        this.ctx.beginPath();
        this.ctx.fillStyle = 'white';
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.moveTo(this.radius, this.radius);
        this.ctx.arc(this.radius, this.radius, this.radius - this.ringsize, 0, 2 * Math.PI, false);
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.restore();
    }

    /**
     * Draws the inner square
     */
    drawColorSquare() {
        /** Start and end x values of the square */
        var startX = Math.round(this.radius - (this.squareLength / 2));
        var endX = Math.round(this.radius + (this.squareLength / 2));

        /** Loop from 0 to 100 lightness */
        for(var i = 0; i < 100; i++) {
            /** Start y of this value, create linear gradient line */
            var startY = Math.round(this.radius - (this.squareLength / 2) + (i * (this.squareLength / 100)));
            var line = this.ctx.createLinearGradient(startX, startY, endX, startY);

            /** Stops on the gradient of varying saturation */
            var stops = 15;

            /** Go through all the stops; vary saturation */
            for(var j = 0; j < stops; j++) {
                /** Set the saturation; at the end we want pure color (1) */
                var s = (j == stops - 1 ? 1 : 0) + j;

                /** Set the lightness; at the end we want pure black (0) */
                var l = 100 - i - (i == 99 ? 1 : 0) ;

                /** We want the square to look like HSV/B rather than hsl, but there is no CSS HSV function */
                var hsl = ColorConvert.HSBToHSL(this.hue / 60, s / stops, l / 100);
                line.addColorStop(j / stops, 'hsl(' + hsl.h + ',' + hsl.s + '%,' + hsl.l + '%)');
            }

            /** Draw the line we built, going down an extra 4 except at the end to give clean transition*/
            this.ctx.fillStyle = line;
            this.ctx.fillRect(startX, startY, Math.round(this.squareLength), Math.round((this.squareLength / 100) ) + (i < 96 ? 4 : 100-i)
            );
        }
    }

    /** Util functions */

    /**
     * Takes an event and returns the (x, y) relative to the canvas
     * @param {Event} evt Event to extract position from
     */
    normalizePos(evt) {
        var offset = {'left': this.can.offsetLeft, 'top': this.can.offsetTop};
        var x, y;
        if(evt.type == "touchstart") {
            x = evt.originalEvent.changedTouches[0].pageX;
            y = evt.originalEvent.changedTouches[0].pageY;
        } else if (evt.type == "touchmove") {
            x = evt.originalEvent.touches[0].pageX;
            y = evt.originalEvent.touches[0].pageY;
        } else {
            x = evt.pageX;
            y = evt.pageY;
        }
        var eX = x - offset.left;
        var eY = y - offset.top;
        return { x: eX, y: eY };
    }

    /**
     * Updates ix and iy, but bounded
     */
    _setIXY(x, y) {
        var half = this.squareLength / 2;
        /** Bounds ix at left/right of square */
        if(x - this.radius > 0) {
            this.ix = Math.min(x, this.radius + half) - 1;
        } else {
            this.ix = Math.max(x, this.radius - half) + 1;
        }

        /** Bounds iy at top/bottom of square */
        if(y - this.radius > 0) {
            this.iy = Math.min(y, this.radius + half) - 1;
        } else {
            this.iy = Math.max(y, this.radius - half) + 1;
        }

        this.ix = Math.round(this.ix);
        this.iy = Math.round(this.iy);
    }
}

/** Static helpers for converting between color formats */
class ColorConvert {
    /**
     * Converts RGB to HSL
     * @param {Number} R Red
     * @param {Number} G Green
     * @param {Number} B Blue
     */
    static RGBtoHSL(R, G, B) {
        var H,S,L;

        var r = R / 255;
        var g = G / 255;
        var b = B / 255;

        var cMax = Math.max(r, g, b);
        var cMin = Math.min(r, g, b);

        var dC = cMax - cMin;

        L = (cMax + cMin) / 2;

        if(cMax == cMin) {
            S = 0;
            H = 0;
        } else {
            S = L < .5 ? (cMax - cMin)/(cMax + cMin) : (cMax - cMin)/(2 - cMax - cMin);
            switch(cMax){
                case r: H = (g-b) / dC; break;
                case g: H = 2 + (b-r)/ dC; break;
                case b: H = 4 + (r - g) / dC; break;
            }
        }

        return {
            'h': Math.round(H * 60),
            's': Math.round(S * 100),
            'l': Math.round(L * 100)
        };
    }

    /**
     * Converts HSL to HSB
     * @param {Number} H Hue
     * @param {Number} S Saturation
     * @param {Number} L Lightness
     */
    static HSLToHSB (H,S,L) {
        var h, s, b;
        h = H;
        b = (2 * L + S*(1 - Math.abs(2*L - 1))) / 2;

        if(b == 0) {
            return {
                'h': 0,
                's': 0,
                'b': 0
            };
        }

        s = (2 * (b - L))/b;

        return {
            'h': Math.round(h * 60),
            's': Math.round(s * 100),
            'b': Math.round(b * 100)
        };
    }

    /**
     * Converts HSB to HSL
     * @param {Number} H Hue
     * @param {Number} S Saturation
     * @param {Number} B Brightness
     */
    static HSBToHSL(H,S,B) {
        var h, s, l;
        h = H;

        l = .5 * B * (2 - S);

        s = (B * S) / (1 - Math.abs(2 * l - 1));
        if((S == 0 || isNaN(s)) && B == 1) {
            return {
                'h': H * 60,
                's': 0,
                'l': 100
            };
        } else if((S == 0 || isNaN(s)) && B == 0) {
            return {
                'h': H * 60,
                's': 0,
                'l': 0
            };
        }

        return {
            'h': Math.round(h * 60),
            's': Math.round(s * 100),
            'l': Math.round(l * 100)
        };
    }

    /**
     * Converts a hex code to RBG
     * @param {String} hex Hex value to convert
     */
    static HexToRGB(hex) {
        hex = hex.replace('#','');
        var R = parseInt(hex.substring(0,2), 16);
        var G = parseInt(hex.substring(2,4), 16);
        var B = parseInt(hex.substring(4,6), 16);

        return { 'r': R, 'g': G, 'b': B };
    }
}