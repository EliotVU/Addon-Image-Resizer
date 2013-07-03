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
var myPrefs = require("sdk/simple-prefs");
var pageMod = require("sdk/page-mod");

exports.main = function(){
    if( self.loadReason == "upgrade" ){
        tabs.open(self.data.url('upgrade.html'));
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
                    controlEnables: myPrefs.prefs['controlEnables']
                }
            );
        }
    });
};