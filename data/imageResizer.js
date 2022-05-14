//==============================================================================
//    This file is part of Image Resizer/Scaler.
//
//    Image Resizer/Scaler is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Lesser General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    Image Resizer/Scaler is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Lesser General Public License for more details.
//
//    You should have received a copy of the GNU Lesser General Public License
//    along with Image Resizer/Scaler.  If not, see <http://www.gnu.org/licenses/>.
//==============================================================================
//    Author: Eliot van Uytfanghe
//    Site: EliotVU.com
//==============================================================================

var preferences = {
    // Use RMB? (Note: old naming convention).
    mouseDragButton: true,
    showHoverMessage: true,
    freeScaling: false,
    stopResizingOnMouseLeave: true,
    enableImageSizeLimit: true,
    controlEnables: false
};

var imageResizer = {
    _clickPosX: 0.0,
    _clickPosY: 0.0,
    _initSizeX: 0.0,
    _initSizeY: 0.0,
    scrollScaler: 0.0,
    scaling: false,
    scalingImage: null,
    restoredImage: null,
    moved: false,
    suppressContextMenu: false,
    suppressClick: false,
    _mouseMoveContext: (function (e) { imageResizer.mouseMove(e) }),
    _mouseOutContext: (function () { imageResizer.mouseLeave() }),
    _mouseScrollContext: (function (e) { imageResizer.mouseScroll(e) }),

    // Options
    dragKey: 3,     // Right mouse button.
    restoreKey: 3,  // Right mouse button.

    isControl: function (e) {
        return e.ctrlKey || (e.metaKey != null && e.metaKey);
    },

    isDisabled: function (e) {
        return preferences.controlEnables ? !this.isControl(e) : this.isControl(e);
    },

    isDragKey: function (e) {
        return e.which == this.dragKey;
    },

    isRestoreKey: function (e) {
        return e.which == this.restoreKey;
    },

    cancelEvent: function (e) {
        e.returnValue = false;
        e.stopPropagation();
        e.preventDefault();
    },

    size: function (x, y) {
        return Math.sqrt(x * x + y * y);
    },

    localDistance: function (x1, y1, x2, y2) {
        return this.size(x1, y1) - this.size(x2, y2);
    },

    // Simple cancel the contextMenu, either if we hover out of an image's bounds while draggin,
    // - or right click was performed as size restoration.
    contextMenu: function (e) {
        if (this.isDisabled(e) || !this.suppressContextMenu) {
            return true;
        }
        this.suppressContextMenu = false;
        this.restoredImage = null;
        this.cancelEvent(e);
        return false;
    },

    // Whether the image supports rescaling.
    validImage: function (img) {
        return (preferences.enableImageSizeLimit || (img.width() > 32 && img.height() > 32)) && !img.hasClass('no-resize');
    },

    // Start dragging if mouseDown is on an image bounds.
    mouseDown: function (e) {
        var img = $(e.target);
        if ((!this.validImage(img)) || e.target.imageResizerAnimating
            || (this.isDisabled(e) && e.which != 2)
        ) { return true; }

        // Begin scaling the image if: Mouse is dragging on the image.
        if (this.isDragKey(e)) {
            this.storeOriginal(img, e.target);
            this._clickPosX = e.clientX;
            this._clickPosY = e.clientY;
            this._initSizeX = img.width();
            this._initSizeY = img.height();
            this.startScaling(img);
            this.cancelEvent(e);

            if (preferences.stopResizingOnMouseLeave) {
                $(window).on('mousemove', this._mouseMoveContext);
            } else {
                img.on('mousemove', this._mouseMoveContext)
            };
            $(document).on('DOMMouseScroll', this._mouseScrollContext);
            return false;
        }
        else if (e.which == 2) {
            // Maximize the image if: Middle-Mouse while CTRL is down.
            if (this.isControl(e)) {
                this.storeOriginal(img, e.target);
                this._fixImage(img);

                // EXPERIMENTAL FEATURE
                //img.addClass( 'imageResizerBoxClass' );

                e.target.imageResizerAnimating = true;
                img.height('auto');
                img.animate({ "width": $(window).width() - 64 }, "slow", this._animFinish);
                this.cancelEvent(e);
                return false;
            }
        }
        // If dragging is bound on LMB, then we'll still use RMB as restore functionality.
        else if (e.which == 3 && this.dragKey == 1) {
            // @HACK: SIM scaling
            this.startScaling(img);
            this.scaling = false;
            this.cancelEvent(e);
            return false;
        }
        return true;
    },

    applyImageEffects: function (img) {
        if (img.hasClass('imageResizerActiveClass'))
            return;

        img.addClass('imageResizerActiveClass');
        this._fixImage(img);
    },

    mouseScroll: function (e) {
        var img = this.scalingImage;
        if (img == null || !this.scaling || img.get().imageResizerAnimating) {
            return true;
        }

        // Although annoying, we have to avoid glitchy situations.
        if (!this.moved) {
            img.on('mouseout', this._mouseOutContext);
            this.applyImageEffects(img);
            this.moved = true;
        }

        // Retain size that was set through dragging.
        if (this.scrollScaler == 0.0 && this.moved) {
            this._initSizeX = img.width();
            this._initSizeY = img.height();

            // To ensure a smooth transition.
            this._clickPosX = e.originalEvent.clientX;
            this._clickPosY = e.originalEvent.clientY;
        }

        var isUp = e.originalEvent.detail < 0;
        if (isUp) {
            this.scrollScaler -= 1.0;
        }
        else {
            this.scrollScaler += 1.0;
        }

        var newSizeX = this._initSizeX * this.percentScale * this.scrollScaler;
        var newSizeY = newSizeX;

        var size = this.fixSize(newSizeX, newSizeY);
        img.width(Math.max(this._initSizeX + size.x, size.cx));
        img.height(Math.max(this._initSizeY + size.y, size.cy));

        // Don't increment scrollScaler if we reached the minimum size.
        if (img.width() == size.cx || img.height() == size.cy) {
            this.scrollScaler += 1.0;
        }

        this.cancelEvent(e);
        return false;
    },

    minSize: 33.0,
    percentScale: 0.25,

    // Returns the new size scaled and clamped based on the initial size of an image.
    fixSize: function (sizeX, sizeY) {
        var clampX = preferences.enableImageSizeLimit ? this.minSize : 5;
        var clampY = clampX;
        var ratioX = 1.0;
        var ratioY = 1.0;

        if (this._initSizeX > this._initSizeY) {
            ratioX = (this._initSizeX / this._initSizeY);
            sizeX *= ratioX;
            clampX *= ratioX;
        }
        else if (this._initSizeY > this._initSizeX) {
            ratioY = (this._initSizeY / this._initSizeX);
            sizeY *= ratioY;
            clampY *= ratioY;
        }
        return { x: sizeX, y: sizeY, cx: clampX, cy: clampY, rx: ratioX, ry: ratioY };
    },

    // Mouse has moved while within an image's bounds.
    mouseMove: function (e) {
        var img = this.scalingImage;
        if (img == null || !this.scaling || e.target.imageResizerAnimating) {
            return true;
        }

        var sizeXDifference = 0.00;
        var sizeYDifference = 0.00;

        // Retain the size that was set through scrolling.
        if (this.scrollScaler != 0.0) {
            this._initSizeX = img.width();
            this._initSizeY = img.height();
            this.scrollScaler = 0.0;
        }

        if ((preferences.freeScaling) || e.altKey) {
            sizeXDifference = e.clientX - this._clickPosX;
            sizeYDifference = e.clientY - this._clickPosY;
        }
        else {
            sizeXDifference = this.localDistance(e.clientX, e.clientY, this._clickPosX, this._clickPosY);
            sizeYDifference = sizeXDifference;
        }

        var size = this.fixSize(sizeXDifference, sizeYDifference);
        img.width(Math.max(this._initSizeX + size.x, size.cx));
        img.height(Math.max(this._initSizeY + size.y, size.cy));

        // Check if the user has dragged, but check only for the first time since he began.
        if (!this.moved && (e.clientX != this._clickPosX || e.clientY != this._clickPosY)) {
            this.applyImageEffects(img);
            this.moved = true;

            // Start tracking mouse movement for out of bounds,
            // so we can suppress the context menu and as well cancel resizing.
            img.on('mouseout', this._mouseOutContext);
        }
        return false;
    },

    // Stop scaling if we hover out an image.
    mouseLeave: function () {
        if (preferences.stopResizingOnMouseLeave || this.scalingImage == null || !this.scaling) {
            return true;
        }
        this.stopScaling(this.scalingImage);
        if (this.dragKey == 3) {
            this.suppressContextMenu = true;
        }
        return true;
    },

    // Mouse released. Stop scaling and try to cancel bleeding events.
    mouseUp: function (e) {
        // The image that was being resized.
        var img = this.scalingImage;
        // Try select the hovered one then.
        if (!this.moved && img == null) {
            img = $(e.target);
        }

        if (img == null) {
            return true;
        }

        if (this.isRestoreKey(e)
            && !this.moved
            && img.hasClass('imageResizerChangedClass')
            && this.restoreOriginal(img, e.target)
        ) {
            this.suppressContextMenu = true;
        }

        // @HACK for LMB preference.
        if (this.scaling || this.dragKey == 1) {
            this.stopScaling(img);
            if (this.moved) {
                if (this.dragKey == 3) {
                    this.suppressContextMenu = true;
                }
                else {
                    this.suppressClick = true;
                }
                this.cancelEvent(e);
                return false;
            }
        }
        return true;
    },

    click: function (e) {
        var img = $(e.target);
        if (img && img.is('img')) {
            if (this.isDragKey(e)) {
                // Suppress any click throughs if using LMB as drag button.
                if (this.dragKey == 1 && this.suppressClick) {
                    this.cancelEvent(e);
                    this.suppressClick = false;
                    return false;
                }
            }
            // else if( ... other stuff?
        }
        return true;
    },

    // Store the original image size, before we start resizing.
    storeOriginal: function (img, n) {
        if (!n.originalWidth) {
            n.originalWidth = img.width();
            n.originalHeight = img.height();
        }
    },

    // Try to restore the image to its original size.
    restoreOriginal: function (img, n) {
        if (n.originalWidth) {
            this.restoredImage = img;
            n.imageResizerAnimating = true;
            img.animate({ "width": n.originalWidth, "height": n.originalHeight }, "slow", this._animFinish);
            n.originalWidth = null;
            n.originalHeight = null;
            return true;
        }
        return false;
    },

    // Dragging has started on said image.
    startScaling: function (img) {
        this.scrollScaler = 0.0;
        this.scaling = true;
        this.moved = false;
        this.scalingImage = img;

        // Bypasses CSS:Width:... !important;
        if (!img.attr('width'))
            img.attr('width', 'inherit');

        if (!img.attr('height'))
            img.attr('height', 'inherit');
    },

    // Dragging has stopped on said image.
    stopScaling: function (img) {
        this.scaling = false;
        this.scalingImage = null;
        img.removeClass('imageResizerActiveClass');

        if (preferences.stopResizingOnMouseLeave) {
            $(window).unbind('mousemove', this._mouseMoveContext);
        } else {
            img.unbind('mousemove', this._mouseMoveContext)
        };
        img.unbind('mouseout', this._mouseOutContext);
        $(document).unbind('DOMMouseScroll', this._mouseScrollContext);
    },

    // Executed as soon when an image is resized.
    _fixImage: function (img) {
        if (img.css('position') == 'static') {
            img.css('position', 'relative');
        }
        img.addClass('imageResizerChangedClass');
    },

    // When restoring the image's animation is finished.
    _animFinish: function () {
        // NOTE: this referes to the imageElement not this object!
        this.imageResizerAnimating = false;
        $(this).removeClass('imageResizerChangedClass');
    },

    // Apply a brief title(due mouse button swap) on dragging, but keep the old title.
    hover: function (e) {
        var img = $(e.target);
        if (img == null || !img.is('img') || !this.validImage(img)) {
            return;
        }

        // Deprecated, placeholder for later
    },

    // Undo the title modification, in-case other js/mods read the title.
    unhover: function (e) {
        var img = $(e.target);
        if (!img.is('img') || !this.validImage(img)) {
            return;
        }

        // Deprecated, placeholder for later
    }
};

window.addEventListener('mousedown', (e) => {
    if (e.target.nodeName === 'IMG') {
        imageResizer.mouseDown.call(imageResizer, e);
    }
});

// Don't add 'img' as the selector because we want mouseup to be triggered if the user drags out of image bounds.
window.addEventListener('mouseup', (e) => {
    imageResizer.mouseUp.call(imageResizer, e);
});

// ContextMenu has to bind at all times, e.g. when mouse leaves an image while the user is holding RMB.
window.addEventListener('contextmenu', (e) => {
    imageResizer.contextMenu.call(imageResizer, e);
});

window.addEventListener('click', (e) => {
    if (e.target.nodeName === 'IMG') {
        imageResizer.click.call(imageResizer, e);
    }
});

if (typeof browser !== 'undefined') {
    function updatePrefs(res) {
        preferences = Object.assign(preferences, res.preferences);
        imageResizer.dragKey = preferences.mouseDragButton ? 3 : 1;
    }
    browser.storage.sync.get('preferences').then(updatePrefs);

    // FIXME: Web-extension context error!
    // browser.storage.onChanged.addListener((changes) => {
    //     var changedPrefs = {};
    //     for (let key in changes) {
    //         changedPrefs[key] = changes[key].newValue;
    //     }
    //     updatePrefs({ preferences: changedPrefs });
    // });
}