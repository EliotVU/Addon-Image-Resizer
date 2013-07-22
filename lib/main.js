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
var self = require("sdk/self");
var tabs = require("sdk/tabs");
var prefs = require("sdk/preferences/service");
var myPrefs = require("sdk/simple-prefs");
var pageMod = require("sdk/page-mod");

exports.main = function(){
    var contextMenuEventPreference = 'dom.event.contextmenu.enabled';
    switch( self.loadReason ){
        case "upgrade":
            if( prefs.get(contextMenuEventPreference) === false ){
                prefs.set(contextMenuEventPreference, true); 
            }
            tabs.open(self.data.url('upgrade.html'));
            break;

        case "install":
            // Ensure enableContextMenuEvent is enabled. This is necessary for Image Resizer to function properly.
            prefs.set(contextMenuEventPreference, true); 
            break;
    }

    pageMod.PageMod({
        include: ["*", "file://*", "resources://*", "chrome://*", "about:home"],
        contentScriptWhen: 'start',
        contentScriptFile: [self.data.url("jquery-2.0.0.min.js"), self.data.url("imageResizer.js")],
        // Emit our user's preferences
        onAttach: function onAttach(worker){
            worker.port.emit('prefs', {
                    mouseDragButton: myPrefs.prefs['mouseDragButton'],
                    showHoverMessage: myPrefs.prefs['showHoverMessage'],
                    freeScaling: myPrefs.prefs['freeScaling'],
                    controlEnables: myPrefs.prefs['controlEnables'],
                    stopResizingOnMouseLeave: myPrefs.prefs['stopResizingOnMouseLeave'],
                    enableImageSizeLimit: myPrefs.prefs['enableImageSizeLimit']
                }
            );
        }
    });
};