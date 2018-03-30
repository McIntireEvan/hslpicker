'use strict';

/** HSL Color Picker */
class HSLPicker {
    /**
     *
     * @param {*} id
     * @param {*} parentId
     * @param {*} radius
     * @param {*} onColorChange
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
        //this.setHue(this.color);
        //this.drawCircle(this.radius + this.squareLength / 2, this.radius + this.squareLength / 2, 2);

        //this.renderOuter();
        //this.renderInner();

        /** Event listeners */
        this.can.addEventListener('mousedown', evt => {
            evt.preventDefault();
            var pos = this.normalizePos(evt);

            /** Distance from center */
            var dist = Math.sqrt(Math.pow(this.radius - pos.x, 2) + Math.pow(this.radius - pos.y, 2));

            /** If we clicked somewhere in the hue ring */
            if (dist < this.radius && dist > this.radius - this.ringsize) {
                this.outerActive = true;
                this.updateOuter(evt);
                this.onColorChange();
            }

            /** If clicked somewhere in the inner square */
            if (dist < this.squareLength / 2) {
                this.innerActive = true;
                this.updateInner(evt);
                this.onColorChange();
            }
        });

        document.addEventListener('mouseup', evt => {
            this.innerActive = false;
            this.outerActive = false;
        });

        document.addEventListener('mousemove', evt => {
            if (this.outerActive) {
                this.updateOuter(evt);
                this.onColorChange();
            } else if (this.innerActive) {
                this.updateInner(evt);
                this.onColorChange();
            }
        });

        /** Add the canvas to the parent element */
        document.getElementById(parentId).appendChild(this.can);
    }

    /** Core functions */
    resize() {
        var size = this.can.width;
        document.getElementById(this.id).remove();
        var newWheel = new HSLPicker(this.id, this.parentId, size / 2, this.onColorChange, this.hue);
        return newWheel;
    }

    /**
     *
     * @param {Number} hue
     */
    setHue(hue) {
        this.hue = hue * (180 / Math.PI);
        if(this.hue < 0) {
            this.hue += 360;
        }

        var ringMiddle = this.radius - (this.ringsize / 2);
        this.ox = Math.cos(hue) * ringMiddle  + this.radius;
        this.oy = Math.sin(hue) * ringMiddle  + this.radius;

        this.redraw();
    }

    setColor(color) {

    }

    /**
     *
     * @param {*} evt
     */
    updateOuter(evt) {
        var pos = this.normalizePos(evt);
        var angle = Math.atan2(pos.y - this.radius, pos.x - this.radius);
        this.setHue(angle);
    }

    updateInner(evt) {
        var pos = this.normalizePos(evt);
        var half = this.squareLength / 2;

        if(pos.x - this.radius > 0) {
            this.ix = Math.min(pos.x, this.radius + half);
        } else {
            this.ix = Math.max(pos.x, this.radius - half);
        }

        if(pos.y - this.radius > 0) {
            this.iy = Math.min(pos.y, this.radius + half);
        } else {
            this.iy = Math.max(pos.y, this.radius - half);
        }
        this.ix = this._clean(this.ix);
        this.iy = this._clean(this.iy);

        this.redraw();
    }

    /** Drawing functions */

    /**
     *
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

    /** Draws the outer hue wheel */
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

    drawColorSquare() {
        var startX = this._clean(this.radius - (this.squareLength / 2));
        var endX = this._clean(this.radius + (this.squareLength / 2));

        for(var i = 0; i < 100; i++) {
            var startY = this._clean(this.radius - (this.squareLength / 2) + (i * (this.squareLength / 100)));
            var line = this.ctx.createLinearGradient(startX, startY, endX, startY);

            var stops = 15;

            for(var j = 0; j < stops; j++) {
                var s = (j == stops - 1 ? 1 : 0) + j;
                var l = 100 - i - (i == 99 ? 1 : 0) ;
                var hsl = this._HSBToHSL(this.hue / 60, s / stops, l / 100);
                line.addColorStop(j / stops, 'hsl(' + hsl.h + ',' + hsl.s + '%,' + hsl.l + '%)');
            }

            this.ctx.fillStyle = line;
            this.ctx.fillRect(
                startX,
                startY,
                this._clean(this.squareLength),
                this._clean((this.squareLength / 100) ) + (i < 96 ? 4 : 100-i)
            );
        }
    }

    /** Util functions */

    _HSBToHSL(H,S,B) {
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
     * Takes an event and returns the (x, y) relative to the canvas
     * @param {*} evt
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
     * Makes a value even, for better canvas rendering
     * @param {Number} val
     */
    _clean(val) {
        val = Math.round(val);
        /*if(val % 2 != 0) {
            val -= 1;
        }*/
        return val;
    }
}