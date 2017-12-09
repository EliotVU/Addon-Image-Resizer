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

browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update' && details.previousVersion !== '1.7.1') {
        return;
    }

    if (details.reason !== 'install') {
        return;
    }

    var defaults = {
        mouseDragButton: true,
        showHoverMessage: true,
        freeScaling: false,
        stopResizingOnMouseLeave: true,
        enableImageSizeLimit: true,
        controlEnables: false
    };
    browser.storage.sync.set({ preferences: defaults });
});