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

var preferences = {
    // Use RMB? (Note: old naming convention).
    mouseDragButton: true,
    freeScaling: false,
    stopResizingOnMouseLeave: true,
    enableImageSizeLimit: true,
    controlEnables: false,
};

/**
 * Returns the media width of an element
 * @param {HTMLElement} mediaElement 
 * @returns {number}
 */
function getMediaWidth(mediaElement) {
    return mediaElement.width;
}

/**
 * Sets the media width of an element
 * @param {HTMLElement} mediaElement 
 * @param {number} width 
 * @returns {void}
 */
function setMediaWidth(mediaElement, width) {
    mediaElement.style.width = `${width}px`;
}

/**
 * Returns the media height of an element
 * @param {HTMLElement} mediaElement 
 * @returns {number}
 */
function getMediaHeight(mediaElement) {
    return mediaElement.height;
}

/**
 * Sets the media height of an element
 * @param {HTMLElement} mediaElement 
 * @param {number} height 
 * @returns {void}
 */
function setMediaHeight(mediaElement, height) {
    mediaElement.style.height = `${height}px`;
}

/**
 * Determines whether an element is suited for re-sizing.
 *
 * @param {HTMLElement} mediaElement
 * @returns {boolean}
 */
function isMediaResizable(mediaElement) {
    return preferences.enableImageSizeLimit || (mediaElement.clientWidth > 32 && mediaElement.clientHeight > 32);
}

/**
 * @param {HTMLElement} mediaElement 
 * @returns {boolean}
 */
function isMediaResized(mediaElement) {
    return mediaElement.classList.contains('imageResizerChangedClass');
}

/**
 * @param {HTMLElement} mediaElement 
 * @returns {boolean}
 */
function isMediaResizingActive(mediaElement) {
    return mediaElement.classList.contains('imageResizerActiveClass');
}

/**
 * @param {HTMLElement} mediaElement 
 * @returns {boolean}
 */
function isMediaAnimating(mediaElement) {
    return mediaElement.classList.contains('imageResizerAnimating');
}

var imageResizer = {
    _clickPosX: 0.0,
    _clickPosY: 0.0,
    _initSizeX: 0.0,
    _initSizeY: 0.0,
    scrollScaler: 0.0,

    isResizingActive: false,

    /** @type {HTMLElement | null} */
    activeMediaElement: null,

    hasMouseMoved: false,

    shouldSuppressContextMenu: false,
    shouldSuppressClick: false,

    _mouseMoveContext: function (e) {
        imageResizer.mouseMove(e);
    },
    _mouseOutContext: function () {
        imageResizer.mouseLeave();
    },
    _mouseScrollContext: function (e) {
        imageResizer.mouseScroll(e);
    },

    // Options
    dragKey: 3, // Right mouse button.
    restoreKey: 3, // Right mouse button.

    isControl(e) {
        return e.ctrlKey || (e.metaKey != null && e.metaKey);
    },

    isDisabled(e) {
        return preferences.controlEnables
            ? !this.isControl(e)
            : this.isControl(e);
    },

    isDragKey(e) {
        return e.which == this.dragKey;
    },

    isRestoreKey(e) {
        return e.which == this.restoreKey;
    },

    cancelEvent(e) {
        e.returnValue = false;
        e.stopPropagation();
        e.preventDefault();
    },

    size(x, y) {
        return Math.sqrt(x * x + y * y);
    },

    localDistance(x1, y1, x2, y2) {
        return this.size(x1, y1) - this.size(x2, y2);
    },

    // Simple cancel the contextMenu, either if we hover out of an image's bounds while draggin,
    // - or right click was performed as size restoration.
    handleContextMenuEvent(e) {
        if (this.isDisabled(e) || !this.shouldSuppressContextMenu) {
            return true;
        }

        this.shouldSuppressContextMenu = false;
        this.cancelEvent(e);
        return false;
    },

    // Start dragging if mouseDown is on an image bounds.
    mouseDown(e) {
        /** @type {HTMLElement} */
        var mediaElement = e.target;
        if (this.isDisabled(e) && e.which != 2
            || !isMediaResizable(mediaElement)
            || isMediaAnimating(mediaElement)
        ) {
            return true;
        }

        // Begin scaling the image if: Mouse is dragging on the image.
        if (this.isDragKey(e)) {
            this._clickPosX = e.clientX;
            this._clickPosY = e.clientY;
            this._initSizeX = getMediaWidth(mediaElement);
            this._initSizeY = getMediaHeight(mediaElement);
            if (isMediaResized(mediaElement) === false) {
                mediaElement.dataset.originalWidth = this._initSizeX;
                mediaElement.dataset.originalHeight = this._initSizeY;
                mediaElement.dataset.originalStyleWidth = mediaElement.style.width;
                mediaElement.dataset.originalStyleHeight = mediaElement.style.height;
            }
            this.startScaling(mediaElement);
            this.cancelEvent(e);

            if (preferences.stopResizingOnMouseLeave) {
                window.addEventListener('mousemove', this._mouseMoveContext);
            } else {
                mediaElement.addEventListener('mousemove', this._mouseMoveContext);
            }
            document.addEventListener('DOMMouseScroll', this._mouseScrollContext);
            return false;
        } else if (e.which == 3 && this.dragKey == 1) {
            // If dragging is bound on LMB, then we'll still use RMB as restore functionality.
            // @HACK: SIM scaling
            this.startScaling(mediaElement);
            this.isResizingActive = false;
            this.cancelEvent(e);
            return false;
        }

        return true;
    },

    /**
     * @param {HTMLElement} mediaElement
     */
    applyImageEffects(mediaElement) {
        if (isMediaResizingActive(mediaElement)) {
            return;
        }

        if (mediaElement.style.position === 'static') {
            mediaElement.style.position = 'relative';
        }
        mediaElement.classList.add('imageResizerActiveClass', 'imageResizerChangedClass');
    },

    mouseScroll(e) {
        var mediaElement = this.activeMediaElement;
        if (mediaElement == null
            || !this.isResizingActive
            || isMediaAnimating(mediaElement)
        ) {
            return true;
        }

        // Although annoying, we have to avoid glitchy situations.
        if (!this.hasMouseMoved) {
            mediaElement.addEventListener('mouseout', this._mouseOutContext);
            this.applyImageEffects(mediaElement);
            this.hasMouseMoved = true;
        }

        // Retain size that was set through dragging.
        if (this.scrollScaler == 0.0 && this.hasMouseMoved) {
            this._initSizeX = getMediaWidth(mediaElement);
            this._initSizeY = getMediaHeight(mediaElement);

            // To ensure a smooth transition.
            this._clickPosX = e.originalEvent.clientX;
            this._clickPosY = e.originalEvent.clientY;
        }

        var isUp = e.originalEvent.detail < 0;
        if (isUp) {
            this.scrollScaler -= 1.0;
        } else {
            this.scrollScaler += 1.0;
        }

        var newSizeX = this._initSizeX * this.percentScale * this.scrollScaler;
        var newSizeY = newSizeX;

        var size = this.fixSize(newSizeX, newSizeY);
        setMediaWidth(mediaElement, Math.max(this._initSizeX + size.x, size.cx));
        setMediaHeight(mediaElement, Math.max(this._initSizeY + size.y, size.cy));

        // Don't increment scrollScaler if we reached the minimum size.
        if (
            getMediaWidth(mediaElement) == size.cx ||
            getMediaHeight(mediaElement) == size.cy
        ) {
            this.scrollScaler += 1.0;
        }

        this.cancelEvent(e);
        return false;
    },

    minSize: 33.0,
    percentScale: 0.25,

    // Returns the new size scaled and clamped based on the initial size of an image.
    fixSize(sizeX, sizeY) {
        var clampX = preferences.enableImageSizeLimit ? this.minSize : 5;
        var clampY = clampX;
        var ratioX = 1.0;
        var ratioY = 1.0;

        if (this._initSizeX > this._initSizeY) {
            ratioX = this._initSizeX / this._initSizeY;
            sizeX *= ratioX;
            clampX *= ratioX;
        } else if (this._initSizeY > this._initSizeX) {
            ratioY = this._initSizeY / this._initSizeX;
            sizeY *= ratioY;
            clampY *= ratioY;
        }
        return {
            x: sizeX,
            y: sizeY,
            cx: clampX,
            cy: clampY,
            rx: ratioX,
            ry: ratioY,
        };
    },

    // Mouse has moved while within an image's bounds.
    mouseMove(e) {
        var mediaElement = this.activeMediaElement;
        if (mediaElement == null
            || !this.isResizingActive
            || isMediaAnimating(mediaElement)
        ) {
            return true;
        }

        var sizeXDifference = 0.0;
        var sizeYDifference = 0.0;

        // Retain the size that was set through scrolling.
        if (this.scrollScaler != 0.0) {
            this._initSizeX = getMediaWidth(mediaElement);
            this._initSizeY = getMediaHeight(mediaElement);
            this.scrollScaler = 0.0;
        }

        if (preferences.freeScaling || e.altKey) {
            sizeXDifference = e.clientX - this._clickPosX;
            sizeYDifference = e.clientY - this._clickPosY;
        } else {
            sizeXDifference = this.localDistance(
                e.clientX,
                e.clientY,
                this._clickPosX,
                this._clickPosY
            );
            sizeYDifference = sizeXDifference;
        }

        var size = this.fixSize(sizeXDifference, sizeYDifference);
        setMediaWidth(mediaElement, Math.max(this._initSizeX + size.x, size.cx));
        setMediaHeight(mediaElement, Math.max(this._initSizeY + size.y, size.cy));

        // Check if the user has dragged
        if (!this.hasMouseMoved && (e.clientX != this._clickPosX || e.clientY != this._clickPosY)) {
            this.applyImageEffects(mediaElement);
            this.hasMouseMoved = true;

            // Start tracking mouse movements for out of bounds,
            // so we can suppress the context menu and as well cancel resizing.
            mediaElement.addEventListener('mouseout', this._mouseOutContext);
        }

        return false;
    },

    // Stop scaling if we leave an image's boundary.
    mouseLeave() {
        if (preferences.stopResizingOnMouseLeave
            || this.activeMediaElement == null
            || !this.isResizingActive
        ) {
            return true;
        }

        this.stopScaling(this.activeMediaElement);
        if (this.dragKey == 3) {
            this.shouldSuppressContextMenu = true;
        }

        return true;
    },

    // Mouse released. Stop scaling and try to cancel bleeding events.
    mouseUp(e) {
        var mediaElement = this.activeMediaElement;
        if (!this.hasMouseMoved && mediaElement == null) {
            mediaElement = e.target;
        }

        if (mediaElement == null) {
            return true;
        }

        if (this.isRestoreKey(e)
            && !this.hasMouseMoved
            && isMediaResized(mediaElement)
        ) {
            this.shouldSuppressContextMenu = true;
            this.restore(mediaElement).then();
        }

        // @HACK for LMB preference.
        if (this.isResizingActive || this.dragKey == 1) {
            this.stopScaling(mediaElement);
            if (this.hasMouseMoved) {
                if (this.dragKey == 3) {
                    this.shouldSuppressContextMenu = true;
                } else {
                    this.shouldSuppressClick = true;
                }
                this.cancelEvent(e);
                return false;
            }
        }

        return true;
    },

    click(e) {
        if (this.isDragKey(e)) {
            // Suppress any click throughs if using LMB as drag button.
            if (this.dragKey == 1 && this.shouldSuppressClick) {
                this.cancelEvent(e);
                this.shouldSuppressClick = false;
                return false;
            }
        }

        return true;
    },

    /**
     * Begin restoring the media element to its original state.
     *
     * @param {HTMLElement} mediaElement
     */
    async restore(mediaElement) {
        var currentWidth = `${getMediaWidth(mediaElement)}px`;
        var currentHeight = `${getMediaHeight(mediaElement)}px`;
        var originalWidth = `${mediaElement.dataset.originalWidth}px`;
        var originalHeight = `${mediaElement.dataset.originalHeight}px`;
        delete mediaElement.dataset.originalWidth;
        delete mediaElement.dataset.originalHeight;

        mediaElement.classList.add('imageResizerAnimating');
        await mediaElement.animate({
            width: [currentWidth, originalWidth],
            height: [currentHeight, originalHeight]
        }, { duration: 500, easing: 'ease-out', iterations: 1 }).finished;

        mediaElement.classList.remove('imageResizerAnimating');
        mediaElement.classList.remove('imageResizerChangedClass');

        mediaElement.style.width = originalWidth;
        mediaElement.style.height = originalHeight;

        delete mediaElement.dataset.originalStyleWidth;
        delete mediaElement.dataset.originalStyleHeight;
    },

    /**
     * @param {HTMLElement} mediaElement
     */
    startScaling(mediaElement) {
        this.isResizingActive = true;
        this.activeMediaElement = mediaElement;
        this.scrollScaler = 0.0;
        this.hasMouseMoved = false;

        // Bypasses CSS:Width:... !important;
        if (!mediaElement.hasAttribute('width')) {
            mediaElement.setAttribute('width', 'inherit');
        }

        if (!mediaElement.hasAttribute('height')) {
            mediaElement.setAttribute('height', 'inherit');
        }
    },

    /**
     * @param {HTMLElement} mediaElement
     */
    stopScaling(mediaElement) {
        this.isResizingActive = false;
        this.activeMediaElement = null;

        mediaElement.classList.remove('imageResizerActiveClass');

        if (preferences.stopResizingOnMouseLeave) {
            window.removeEventListener('mousemove', this._mouseMoveContext);
        } else {
            mediaElement.removeEventListener('mousemove', this._mouseMoveContext);
        }
        mediaElement.removeEventListener('mouseout', this._mouseOutContext);
        document.removeEventListener('DOMMouseScroll', this._mouseScrollContext);
    },
};

window.addEventListener('mousedown', (e) => {
    if (e.target instanceof HTMLImageElement) {
        imageResizer.mouseDown.call(imageResizer, e);
    } else if (e.target.style.position === 'absolute') {
        // let's try find one underneath of an overlay element
        var elements = window.document.elementsFromPoint(e.clientX, e.clientY);
        for (let element of elements) {
            if (
                element instanceof HTMLImageElement &&
                isMediaResizable(element)
            ) {
                // console.debug('dispatching the mousedown event to the underlying img element');
                // imageResizer.mouseDown.call(imageResizer, e);
                element.dispatchEvent(
                    new MouseEvent('mousedown', {
                        relatedTarget: element,
                        clientX: e.clientX,
                        clientY: e.clientY,
                        screenX: e.screenX,
                        screenY: e.screenY,
                        movementX: e.movementX,
                        movementY: e.movementY,
                        bubbles: true,
                        button: e.button,
                        buttons: e.buttons,
                        which: e.which,
                        ctrlKey: e.ctrlKey,
                        altKey: e.altKey,
                        detail: e.detail,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                    })
                );

                break;
            }
        }
    }
});

// Don't add 'img' as the selector because we want mouseup to be triggered if the user drags out of image bounds.
window.addEventListener('mouseup', (e) => {
    imageResizer.mouseUp.call(imageResizer, e);
});

// ContextMenu has to bind at all times, e.g. when mouse leaves an image while the user is holding RMB.
window.addEventListener('contextmenu', (e) => {
    imageResizer.handleContextMenuEvent.call(imageResizer, e);
});

window.addEventListener('click', (e) => {
    if (e.target instanceof HTMLImageElement) {
        imageResizer.click.call(imageResizer, e);
    }
});

if (typeof browser !== 'undefined') {
    const updatePrefs = res => {
        preferences = Object.assign(preferences, res.preferences);
        imageResizer.dragKey = preferences.mouseDragButton ? 3 : 1;
    };

    // eslint-disable-next-line no-undef
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
