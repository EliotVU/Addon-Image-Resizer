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

//    Published: 15 February 2012
//    1.1 Update: 27 February 2012
//    1.2 Update: 24 July 2012

if( typeof(com) == "undefined" )
    var com = {};

if( !com.eliot )
    com.eliot = {};

com.eliot.imageResizer = {
    _clickPosX: 0.0,
    _clickPosY: 0.0,
    _orgScalingX: 0.0,
    _orgScalingY: 0.0,
    scaling: false,
    scalingImage: null,
    restoredImage: null,
    moved: false,
    suppressContextMenu: false,
    suppressClick: false,
    _mouseMoveContext: (function(e){com.eliot.imageResizer.mouseMove(e)}),
    _mouseOutContext: (function(){com.eliot.imageResizer.mouseLeave()}),

    // Options
    dragKey: 3,     // Right mouse button.
    restoreKey: 3,  // Right mouse button.
    addHint: true,
    freeScaling: false,
    controlEnables: false,

    isControl: function(e){
        return e.ctrlKey || (e.metaKey != null && e.metaKey);
    },

    isDisabled: function(e){
        return this.controlEnables ? !this.isControl(e) : this.isControl(e);
    },

    isDragKey: function(e){
        return e.which == this.dragKey;
    },

    isRestoreKey: function(e){
        return e.which == this.restoreKey;
    },

    cancelEvent: function(e){
        e.returnValue = false;
        //e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
    },

    size: function(x, y){
        return Math.sqrt(x*x + y*y);
    },

    localDistance: function(x1, y1, x2, y2){
        return this.size(x1, y1) - this.size(x2, y2);
    },

    // Simple cancel the contextMenu, either if we hover out of a image's bounds while draggin,
    // - or right click was performed as size restoration.
    contextMenu: function(e){
		if( this.isDisabled(e) || !this.suppressContextMenu ){
			return true;
		}
		this.suppressContextMenu = false;
		this.restoredImage = null;
		this.cancelEvent(e);
		return false;
	},

    // Whether the image supports rescaling.
    validImage: function(img){
        return img.width() > 32 && img.height() > 32 && !img.hasClass('no-resize');
    },

    // Start dragging if mouseDown is on a image bounds.
    mouseDown: function(e){
        var img = $(e.target);
        if( (!this.validImage(img)) || e.target.imageResizerAnimating
            || (this.isDisabled(e) && e.which != 2)
        ){return true;}

        // Begin scaling the image if: Mouse is dragging on the image.
        if( this.isDragKey(e) ){
            this.storeOriginal(img, e.target);
            this._clickPosX = e.clientX;
            this._clickPosY = e.clientY;
            this._orgScalingX = img.width();
            this._orgScalingY = img.height();
            this.startScaling(img);
            this.cancelEvent(e);

            img.on('mousemove', this._mouseMoveContext);
            img.on('mouseout', this._mouseOutContext);
            return false;
        }
        else if( e.which == 2 ){
            // Maximize the image if: Middle-Mouse while CTRL is down.
            if( this.isControl(e) ){
                this.storeOriginal(img, e.target);
                this._fixImage(img);

                // EXPERIMENTAL FEATURE
                //img.addClass( 'imageResizerBoxClass' );

                e.target.imageResizerAnimating = true;
                img.height('auto');
                img.animate({"width": $(window).width()-64}, "slow", this._animFinish);
                this.cancelEvent(e);
                return false;
            }
        }
        // If dragging is bound on LMB, then we'll still use RMB as restore functionality.
        else if( e.which == 3 && this.dragKey == 1 ){
            // @HACK: SIM scaling
            this.startScaling(img);
            this.scaling = false;
            this.cancelEvent(e);
            return false;
        }
        return true;
    },

    // Mouse has moved while within a image's bounds.
	mouseMove: function(e){
		var img = this.scalingImage;
		if( img == null || !this.scaling || e.target.imageResizerAnimating ){
			return true;
		}

        var newSizeX = 0.00;
        var newSizeY = 0.00;
        var clampX = 33;
        var clampY = 33;
        if( this.freeScaling ){
            newSizeX = e.clientX - this._clickPosX;
    		newSizeY = e.clientY - this._clickPosY;
        }
        else{
            newSizeX = this.localDistance(e.clientX, e.clientY, this._clickPosX, this._clickPosY);
            newSizeY = newSizeX;

            // Scale the image by the ratio of X and Y
            if( this._orgScalingX > this._orgScalingY ){
                var ratioX = (this._orgScalingX/this._orgScalingY);
                newSizeX *= ratioX;
                clampX *= ratioX;
            }
            else if( this._orgScalingY > this._orgScalingX ){
                var ratioY = (this._orgScalingY/this._orgScalingX);
                newSizeY *= ratioY;
                clampY *= ratioY;
            }
        }
		img.width(Math.max(this._orgScalingX + newSizeX, clampX));
		img.height(Math.max(this._orgScalingY + newSizeY, clampY));

        // Check if the user has dragged, but check only for the first time since he began.
        if( !this.moved && (e.clientX != this._clickPosX || e.clientY != this._clickPosY) ){
            img.addClass('imageResizerActiveClass');
            this._fixImage(img);
            this.moved = true;
        }
		return false;
	},

    // Stop scaling if we hover out an image.
    mouseLeave: function(e){
        if( this.scalingImage == null || !this.scaling ){
            return true;
        }
        this.stopScaling(this.scalingImage);
        if( this.dragKey == 3 ){
            this.suppressContextMenu = true;
        }
        return true;
    },

    // Mouse released. Stop scaling and try to cancel bleeding events.
    mouseUp: function(e){
        // The image that was being resized.
        var img = this.scalingImage;
        // Try select the hovered one then.
        if( !this.moved && img == null ){
            img = $(e.target);
        }

        if( img == null ){
            return true;
        }

        img.unbind('mousemove', this._mouseMoveContext);
        img.unbind('mouseout', this._mouseOutContext);

        if( this.isRestoreKey(e)
            && !this.moved
            && img.hasClass('imageResizerChangedClass')
            && this.restoreOriginal(img, e.target)
            ){
            this.suppressContextMenu = true;
        }

        // @HACK for LMB preference.
        if( this.scaling || this.dragKey == 1 ){
            this.stopScaling(img);
            if( this.moved ){
                if( this.dragKey == 3 ){
                    this.suppressContextMenu = true;
                }
                else{
                    this.suppressClick = true;
                }
                this.cancelEvent(e);
                return false;
            }
        }
        return true;
    },

    click: function(e){
        var img = $(e.target);
        if( img && img.is('img') ){
            if( this.isDragKey(e) ){
                // Suppress any click throughs if using LMB as drag button.
                if( this.dragKey == 1 && this.suppressClick ){
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
    storeOriginal: function(img,n){
        if( !n.originalWidth ){
            n.originalWidth = img.width();
            n.originalHeight = img.height();
        }
    },

    // Try to restore the image to its original size.
    restoreOriginal: function(img,n){
        if( n.originalWidth ){
			this.restoredImage = img;
            n.imageResizerAnimating = true;
            img.animate({"width": n.originalWidth, "height": n.originalHeight}, "slow", this._animFinish);
            n.originalWidth = null;
            n.originalHeight = null;
            return true;
        }
        return false;
    },

    // Dragging has started on said image.
    startScaling: function(img){
        this.scaling = true;
        this.moved = false;
        this.scalingImage = img;
    },

    // Dragging has stopped on said image.
    stopScaling: function(img){
        this.scaling = false;
        this.scalingImage = null;
		img.removeClass('imageResizerActiveClass');
    },

    // Executed as soon when an image is resized.
    _fixImage: function(img){
        if( img.css('position') == 'static'){
           img.css('position', 'relative');
        }
        img.addClass( 'imageResizerChangedClass' );
    },

    // When restoring the image's animation is finished.
    _animFinish: function(){
        // NOTE: this referes to the imageElement not this object!
        this.imageResizerAnimating = false;
        $(this).removeClass('imageResizerChangedClass');
    },

    // Apply a brief title(due mouse button swap) on dragging, but keep the old title.
    hover: function(e){
        var img = $(e.target);
        if( img == null || !img.is('img') || !this.validImage(img) ){
            return;
        }

        var orgTitle;
        if( e.target.imageResizerTitle ){
            orgTitle = e.target.imageResizerTitle;
        }
        else{
            orgTitle = img.attr('title');
            if( typeof(orgTitle) == "undefined" ){
                orgTitle = '';
            }
            else if( orgTitle != null && orgTitle != '' ){
                orgTitle = orgTitle + '\r\n\r\n';
            }
            e.target.imageResizerTitle = orgTitle;
        }

        if( img.hasClass('imageResizerChangedClass') ){
            img.attr('title', orgTitle + 'Restore by pressing the right mouse button.');
        }
        else{
            img.attr('title', orgTitle + 'Resize by dragging with the ' + (this.dragKey == 1 ? 'left' : 'right') + ' mouse button.');
        }
    },

    // Undo the title modification, in-case other js/mods read the title.
    unhover: function(e){
        var img = $(e.target);
        if( !img.is('img') || !this.validImage(img) ){
            return;
        }
        img.attr('title', e.target.imageResizerTitle);
    }
};

// Apply our user's preferences
self.port.on('prefs', function(options){
    com.eliot.imageResizer.addHint = options.showHoverMessage;
    if( options.mouseDragButton === false ){
        com.eliot.imageResizer.dragKey = 1;
    }
    com.eliot.imageResizer.freeScaling = options.freeScaling;
    com.eliot.imageResizer.controlEnables = options.controlEnables;
});

$(document).ready(function(){
    $('body').ready(function(){
        $("<style type='text/css'>\
            img.imageResizerActiveClass{cursor:nw-resize !important;outline:1px dashed black !important;}\
            img.imageResizerChangedClass{z-index:300 !important;max-width:none !important;max-height:none !important;}\
            img.imageResizerBoxClass{margin:auto; z-index:99999 !important; position:fixed; top:0; left:0; right:0; bottom:0; border:1px solid white; outline:1px solid black; cursor:pointer;}\
        </style>").appendTo('head');
        // ContextMenu has to bind at all times, e.g. when mouse leaves an image while the user is holding RMB.
        $('body').on('contextmenu',        (function(e){com.eliot.imageResizer.contextMenu(e);}));
        $('body').on('mousedown',   'img', (function(e){com.eliot.imageResizer.mouseDown(e);}));
        // Don't add 'img' as the selector because we want mouseup to be triggered if the user drags out of image bounds.
        $('body').on('mouseup', (function(e){com.eliot.imageResizer.mouseUp(e);}));
        // optional, bind hover(rather than selector) on every image because we have to verify if the image resizable.
        if( com.eliot.imageResizer.addHint ){
            // ignore google maps
            $('img:not(#map.panel-with-start)').hover(
                (function(e){com.eliot.imageResizer.hover(e);}),
                (function(e){com.eliot.imageResizer.unhover(e);})
            );
        }
        $('body').on('click', 'img', (function(e){com.eliot.imageResizer.click(e);}));
    });
});