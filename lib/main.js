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
var self = require("self");
var tabs = require("tabs");
var myPrefs = require("simple-prefs");
var pageMod = require("page-mod");

exports.main = function(){
    if( self.loadReason == "upgrade" ){
        tabs.open(self.data.url('upgrade.html'));
    }

    pageMod.PageMod({
        include: "*",
        contentScriptWhen: 'start',
        contentScriptFile: [self.data.url("jquery-1.7.1.min.js"), self.data.url("imageResizer.js")],
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