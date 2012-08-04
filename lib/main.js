// main.js - Netliot's module
// author:          Eliot van Uytfanghe
// site:            EliotVU.com
// published:       15 February 2012
// 1.1 update:      27 February 2012
// 1.2 update:      24 July 2012

var self = require("self");
var data = self.data;
exports.main = function(options, callbacks){
    var pageMod = require("page-mod");
    pageMod.PageMod({
        include: "*",
        contentScriptWhen: 'start',
        contentScriptFile: [data.url("jquery-1.7.1.min.js"), data.url("imageResizer.js")],  
    });
    
    var tabs = require("tabs");
    if( self.loadReason == "upgrade" ){
        tabs.open(data.url('upgrade.html'));   
    }
};

