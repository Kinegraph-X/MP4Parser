/**
 * @module videoFileModel 
 */
const {App} = require('formantjs');
const timecodeManager = App.componentUtilities.TCManager;


const videoFileModel = function() {
	App.EventEmitter.call(this);
	this.objectType = 'VideoFileModel';
	this.data = {};
	this.createEvent('fileread');
}

videoFileModel.prototype = Object.create(App.EventEmitter.prototype);
videoFileModel.prototype.objectType = 'videoFileModel';

videoFileModel.prototype.populateFromFileObj = function(e) {
	const blob = e.data;
	this.data.blob = blob;
	this.data.filename = blob.name;
	this.data.extension = blob.name.slice(-3);
	this.data.title = blob.name.slice(0, -4);
	this.data.originalFilesize = blob.size;
}

videoFileModel.prototype.setMediaInfo = function(parseResult) {
	const self = this;
	let decPart, duration;
	
	if (typeof parseResult.fileDesc === 'undefined')
		return;
	for (let i = 0, l = parseResult.fileDesc.audioTracks.length; i < l; i++) {
		duration = parseResult.fileDesc.audioTracks[i].duration;
		decPart = duration.toString().match(/\.\d{1,2}/);
		parseResult.fileDesc.audioTracks[i].duration = (decPart 
						? parseInt(duration, 10).toString() + decPart[0] 
							: duration) + ' s';
	}
	parseResult.fileDesc.movieDurationHR = timecodeManager.convertTC(parseResult.fileDesc.movieDuration, 'decToSex', parseResult.fileDesc.frameRate, true)
	this.fileDesc = Object.prototype.sortObjectByPropName(parseResult.fileDesc);
	this.moov = parseResult.moov; 	// TODO remove
//	this.sidx = typeof parseResult.sidx !== 'undefined' ? parseResult.sidx : ""; 	// TODO remove
		
//	fileReader(context).getInstance()(this.data.blob).then(function(result) { 	// temp : should get slice from slicer
//		self.data.arrayBuffer = result;
//		self.trigger('fileread')
//	})
	console.log(this.data, this.fileDesc, parseResult);
//	for(var block in parseResult) {
//		console.log(block)
//		if (block.slice(0, 4) === 'moof')
//			console.log(block, parseResult[block])
//	}
}
	

module.exports = new videoFileModel();
