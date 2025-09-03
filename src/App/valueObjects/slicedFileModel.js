/**
 * @module slicedFileModel 
 */

var Factory = require('src/core/Factory');

	var slicedFileModel = function() {
		this.objectType = 'SlicedFileModel';
		this.currentTrack = 0;
		this.representations = [];
	}
	slicedFileModel.prototype.objectType = 'slicedFileModel';
	slicedFileModel.prototype = {};
	
	Object.defineProperty(slicedFileModel.prototype, 'audioTrack', {
		enumerable : false,
		configurable : false,
		get : function() {
			return this.currentTrack;
		},
		set : function(trackIdx) {
					this.currentTrack = trackIdx;
				}
	});
	
	slicedFileModel.prototype.setModel = function(model) {
//		console.log(model);
		this.audio = model.audio;
//		console.log(new Uint8Array(model.video.initSlice.buffer.append(model.video.slice0.header)));
//		model.video.initSlice = new DataView();
//		fileBuffer = [model.video.buffer];
		this.video = model.video;
	}
	
	slicedFileModel.prototype.getTestFile = function(file) {
//		fileBuffer = [file.buffer];
//		fileBuffer = [_base64ToArrayBuffer('RmlsZSBub3QgZm91bmQuIg==')];
//		console.log(this.video);
		
		bufferManagerSuspended = true;
		fileBuffer = [this.video.sliceInit.buffer];
		getNextBuffer('video', 12);
		
//		console.log(fileBuffer);
	}
	
	slicedFileModel.prototype.getSlicePack = function(type) {
		return type === 'audio' ? this[type][this.currentTrack] : this[type];
	}
	
	slicedFileModel.prototype.getLastSliceIndex = function(type) {
		var slicePack = this.getSlicePack(type);
		return slicePack['slice' + (slicePack.length - 1)].sliceIndex;
	}
	
	slicedFileModel.prototype.getLastSliceStart = function(type) {
		var slicePack = this.getSlicePack(type);
		return slicePack['slice' + (slicePack.length - 1)].startTime;
	}
	
	slicedFileModel.prototype.getTrackEndTime = function(type) {
		var slicePack = this.getSlicePack(type);
		return slicePack['slice' + (slicePack.length - 1)].startTime + slicePack['slice' + (slicePack.length - 1)].duration;
	}

//	saveByteArray = (function () {
//	    var a = document.createElement("a");
//	    document.body.appendChild(a);
//	    a.style = "display: none";
//	    return function (data, name) {
//	        var blob = new Blob(data, {type: "application/octet-stream"}),
//	            url = window.URL.createObjectURL(blob);
//	        a.href = url;
//	        a.download = name;
//	        a.click();
//	        window.URL.revokeObjectURL(url);
//	    };
//	}());
	
	function _base64ToArrayBuffer(base64) {
	    var binary_string =  window.atob(base64);
	    var len = binary_string.length;
	    var bytes = new Uint8Array( len );
	    for (var i = 0; i < len; i++)        {
	        bytes[i] = binary_string.charCodeAt(i);
	    }
	    return bytes.buffer;
	}
	
var classConstructor = function() {
	var context = this.context;
	return new slicedFileModel();
}
	
classConstructor.__factory_name = 'slicedFileModel';
var factory = Factory.Maker.getSingletonFactory(classConstructor);
module.exports = factory;