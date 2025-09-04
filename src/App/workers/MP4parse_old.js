/**
 * @worker MP4parse
 */


if (!Array.prototype.average){
	Object.defineProperty(Array.prototype, 'populateNewObj', {
		writable : true,
		value : function() {
			this.members = 0;
			this.sum = 0;
			this.sumSquares = 0;
			this.md = 0;
			this.avg = 0;
			this.rms = 0;
		}
	});

	Object.defineProperty(Array.prototype, 'average', {
		writable : false,
		value : function (newValue) {
			if (typeof this.sum === 'undefined')
				this.populateNewObj();
			if (typeof newValue !== 'undefined') {
				this.push(newValue);
				this.sum += newValue;
			}
			this.avg = this.sum / (this.members || this.length);
		}
	});
}



onmessage = function(event) {
	try {
		if (event.data.constructor === Array) {
			var result = parser.apply(parser, event.data);
			if (result instanceof Promise) {
				result.then(function(res) {
					postMessage(res);
				});
			}
			else if (result)
				postMessage(result);
			else
				postMessage({type : 'warning', cause : 'The MP4 parser didn\'t return anything.'});
		}
		else {
			postMessage({type : 'error', cause : 'The MP4 parser expects an array as payload. ' + typeof event.data + ' received'});
		}
	}
	catch (e) {
		postMessage({type : 'error', cause : e.message});
	}
}
var parser = function(action, params) {
	this.initialized = false;
	if (typeof action !== 'undefined') {
		return this[action].call(this, params);
	}
}

var newFileReader = function(blob, callback, params) {
	var self = this, reader = new FileReader();
	var promise = new Promise(function (resolve, reject) {

		reader.onload = function(evt) {
			if (typeof callback === 'function')
				var result = callback.call(self, evt, params);
			else
				var result = evt.target.result;
			if (result)
				resolve(result);
		}
		reader.onprogress = function (loadEvent) {
			var progress = loadEvent.loaded / loadEvent.total;
		}
		
		reader.readAsArrayBuffer(blob);
	});
	
	return promise;
}

if(!DataView.prototype.getUint64){
	  DataView.prototype.getUint64 = function(byteOffset, littleEndian) {
	    // on décompose la valeur 64 sur bits en deux nombres 32 bits
	    const gauche = this.getUint32(byteOffset, littleEndian);
	    const droite = this.getUint32(byteOffset + 4, littleEndian);

	    // on combine les deux valeurs 32 bits
	    const combinaison = littleEndian ? gauche + 2**32*droite : 2**32*gauche + droite;
	    if(!Number.isSafeInteger(combinaison)){
	      console.warn(combinaison, " dépasse MAX_SAFE_INTEGER : perte de précision !");
	    }
	    return combinaison;
	  } 
	}

var bufferIndexOf = function(buf,search,offset){
	offset = offset||0
	var m = 0;
	var s = -1;
	for(var i=offset; i<buf.length; ++i){
		if(buf[i] != search[m]){
			s = -1;
			m = 0;
		}
		if(buf[i] == search[m]) {
			if(s == -1) s = i;
			++m;
			if(m == search.length) break;
		}
	}
	if (s > -1 && buf.length - s < search.length) return -1;
	return s;
}

var int8ArrayFromString = function(string) {
	var len = string.length, intArray = new Uint8Array(string.length);
	for (var i = 0; i < len; i++) {
		intArray[i] = string[i].charCodeAt();
	}
	return intArray;
}

var stringFromUint32 = function(buffer) {
	
//	console.log(String.fromCharCode(buffer.getUint8(0)) + String.fromCharCode(buffer.getUint8(1)) + String.fromCharCode(buffer.getUint8(2)) + String.fromCharCode(buffer.getUint8(3)));
//	console.log(nbr.toString(16));
//	console.log((nbr ^ 0xFF000000) >>> 6, (nbr ^ 0x00FF0000) >>> 4, (nbr ^ 0x0000FF00) >>> 2, nbr ^ 0x000000FF);
//	return String.fromCharCode(nbr >> 6, nbr << 2 >> 6, nbr << 4 >> 6, nbr << 6 >> 6);
//	console.log(String.fromCharCode(buffer.getUint8(0)))
	var str = '';
	for (var  i = 0; i < 4; i++) {
		if (buffer.getUint8(i) >= 32 && buffer.getUint8(i) <= 126)
			str +=  String.fromCharCode(buffer.getUint8(i));
		else
			str +=  ' ';
	}
	return str;
}

var int32LEfromString = function(string) {
	var str = new String(string), result = '0x';
	for (var i = str.length - 1; i >= 0; i--) {
		result += String.prototype.slice.call('0' + str.charCodeAt(i).toString(16), -2);
	}
	return parseInt(result);
}

var appendBuffer = function (buffer1, buffer2, position, filesize) {
	var tmp, a, b, ret;
	a = new Uint8Array(buffer1);
	b = new Uint8Array(buffer2);
	try {
	  if (typeof position !== 'undefined') {
		  tmp = new Uint8Array(new ArrayBuffer(filesize));
		  tmp.set(a, 0);
		  tmp.set(b, position);
	  }
	  else {
		  tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
		  tmp.set(a, 0);
		  tmp.set(b, buffer1.byteLength);
	  }
	}
	catch (e) {
		console.error(e);
	}
	
	ret = tmp.buffer.slice(0, tmp.buffer.byteLength);
	
	a = b = tmp = undefined;
	
//	delete a;
//	delete b;
//	delete tmp;
	
	return ret;
}

var swap32 = function(nbr){
	return ((nbr & 0xFF) << 24)
	    | ((nbr & 0xFF00) << 8)
	    | ((nbr >> 8) & 0xFF00)
	    | ((nbr >> 24) & 0xFF);
}

var buffer8getUint32 = function(pos, tArray, littleEndian){
	if (typeof littleEndian === 'undefined')
		return tArray[pos + 3] | tArray[pos + 2] << 8 | tArray[pos + 1] << 16 | tArray[pos] << 24;
	else
		return tArray[pos] | tArray[pos + 1] << 8 | tArray[pos + 2] << 16 | tArray[pos + 3] << 24;
}

function zeroFill(number, size) {
	if (typeof number === 'number')
		number = number.toString();
	else if (typeof number !== 'string')
		return;
	  while (number.length < size) number = "0" + number;
	  return number;
	}











parser.init = function(videoBlob) {
	var self = this;
	
	this.fileStructure = {
			timeTables : [],
			languageCodes : []
	};
	this.fileStructure.fileDesc = {
			audioTracks : []
	};
	this.pos = 0;
	this.trakNbr = 0;
	this.trexNbr = 0;
	this.segmentNbr = 0;
	
	if (videoBlob instanceof File) {
		return new Promise(function(resolve, reject) {
			this.videoBlob = videoBlob;
			newFileReader.call(this, this.getRoughHeader(videoBlob), this.getHeaderBoundaries).then(function(headerView) {
				this.headerBuffer = headerView;
				this.initialized = true;
				resolve({type : 'event', id : 'initSuccess'});
			}.bind(this));
		}.bind(this));
	}
	return {type : 'error', cause : 'The MP4Parser worker expects to receive a File instance'};
}

parser.parseMp4 = function() {
	this.parseRecursive(this.headerLength, this.fileStructure);
	if (typeof this.fileStructure['moov'] === 'undefined' && typeof this.fileStructure['moof1'] === 'undefined')
		return ['error', 'Unable to parse header'];
	this.checkMandatoryAtoms();
	
	return {type : 'event', id : 'parseSuccess', payload : this.fileStructure};
}

parser.clear = function() {
	this.videoBlob = null;
	delete this.videoBlob;
	
	this.fileStructure = null;
	delete this.fileStructure;
}

parser.getRoughHeader = function(blob) {
	if (this.videoBlob.size > 20000001)
		return new Blob(
				[blob.slice(0,10000000), // 10 Mo
				 blob.slice(-10000000)] // last 10 Mo	
			);
	else
		return blob;
}


parser.mandatoryAtoms = [
                         'stco',
                         'stsc',
                         'stsd',
                         'stss',
                         'stsz',
                         'stts'
                         ]


/**
 * Retrieve from hint tracks the tables missing in the standard tracks 
 * (seems unuseful : when atom is missing in standard track, also missing in hint trak)
 */
parser.checkMandatoryAtoms = function() {
	var self = this, toFind = {}, hintTracks = [], atoms, trackIDs = [], trackID, found = false;
	
	for (var t in this.fileStructure.moov) {
		if (t.slice(0, 4) !== 'trak')
			continue;
		trackIDs[this.fileStructure.moov[t].tkhd.content.trackId] = t;
		
		if (this.fileStructure.moov[t].mdia.hdlr.content.componentSubtype === 'hint' && typeof this.fileStructure.moov[t].tref !== 'undefined')
			hintTracks.push(this.fileStructure.moov[t]);
		else if (!this.trackTypeFromSubType(this.fileStructure.moov[t].mdia.hdlr.content.componentSubtype))
			continue;
		 
		this.mandatoryAtoms.forEach(function(b) {
			if (typeof self.fileStructure.moov[t].mdia.minf.stbl[b] === 'undefined' || !self.fileStructure.moov[t].mdia.minf.stbl[b].content.numberOfEntries) {
				if (typeof toFind[self.fileStructure.moov[t].tkhd.content.trackId] === 'undefined')
					toFind[self.fileStructure.moov[t].tkhd.content.trackId] = [];
				toFind[self.fileStructure.moov[t].tkhd.content.trackId].push(b)
			}
		});
	}
	if (Object.keys(toFind).length) {
		for (var i = 0, L = hintTracks.length; i < L; i++) {
			found = false;
			hintTracks[i].tref.hint.content.trackIDs.forEach(function(id) {
				if (typeof toFind[id] !== 'undefined') {
					if (!found)
						found = [];
					found.push(id);
				}
			})
			
			if (!found)
				continue;

			for (var j = 0, l = found.length; j < l; j++) {
				trackID = found[j];
				if (typeof toFind[trackID] !== 'undefined') {
					atoms = Object.keys(hintTracks[i].mdia.minf.stbl);
					for (var k = 0, m = toFind[trackID].length; k < m; k++) {
						if (atoms.indexOf(toFind[trackID][k]) !== -1)
							this.fileStructure.moov[trackIDs[trackID]].mdia.minf.stbl[toFind[trackID][k]] = hintTracks[i].mdia.minf.stbl[toFind[trackID][k]];
					}
				}
			}
		}
	}
}

parser.getHeaderBoundaries = function(evt) {
	var tmpView, moovPos = 0, moofPos, brandPos, brandLength, lastAtomOffset, sidxPos = 0, startOfHeader;
	
	//  Get buffer readers
	var headerBuffer = evt.target.result;
	var headerView = new DataView(headerBuffer);

	// Isolate Brand (ftyp atom)
	brandPos = bufferIndexOf(new Uint8Array(headerBuffer), int8ArrayFromString('ftyp')) - 4;
	if (brandPos < 0) {
		brandPos = bufferIndexOf(new Uint8Array(headerBuffer), int8ArrayFromString('styp')) - 4;
		if (brandPos < 0)
			postMessage(['warning', 'Mp4 Brand not found.']);
	}
	else {
		brandLength = headerView.getUint32(brandPos);
		this.getMP4Brand(headerBuffer, brandPos, brandLength)
	}
	
	
	// Isolate Header : moov atom (and optionnally sidx atom, and other in-between siblings)
	tmpView = new Uint8Array(headerBuffer);
	moovPos = bufferIndexOf(tmpView, int8ArrayFromString('moov')) - 4;
	if (moovPos < 0) {
		moofPos = bufferIndexOf(tmpView, int8ArrayFromString('moof')) - 4;
		moovPos = moofPos;
		sidxPos = bufferIndexOf(tmpView, int8ArrayFromString('sidx')) - 4;
		this.fileStructure.moovIsMoof = true;
		lastAtomOffset = this.traverseHeaderSiblingAtoms(headerBuffer, brandPos);
	}
	else {
		lastAtomOffset = this.traverseHeaderSiblingAtoms(headerBuffer, moovPos);
	}
	
	if (sidxPos > 0 && sidxPos < moovPos)
		startOfHeader = sidxPos;
	else
		startOfHeader = moovPos;

	// log error but don't fail
	if (typeof lastAtomOffset === 'object') {
		postMessage(['warning', 'unknown atom found (' + lastAtomOffset[lastAtomOffset.length - 1].type + ') of size ' + lastAtomOffset[lastAtomOffset.length - 1].size + ' at pos ' + lastAtomOffset[lastAtomOffset.length - 1].pos]);
		lastAtomOffset = lastAtomOffset[0];
	}
	// exit case
	else if (!lastAtomOffset) {
		postMessage(['error', 'Unable to identify boundaries of the video file header : lastAtomOffset not found']);
		return;
	}

	this.headerLength = lastAtomOffset + headerView.getUint32(lastAtomOffset) - startOfHeader;
	header = headerBuffer.slice(startOfHeader, startOfHeader + this.headerLength);

	if (!header.byteLength) {
		postMessage(['error', 'Unable to identify boundaries of the video file header.']);
		return;
	}
	
	return new DataView(header);
}

parser.siblingInterestingAtoms = [
                                  'sidx',
                                  'moof'
                                  ];

parser.traverseHeaderSiblingAtoms = function(headerBuffer, offset) {
	var offset = offset || 0, pos = Number(offset), size;
	var view = new DataView(headerBuffer), result = [];

	var type = String.fromCharCode(view.getUint8(pos+4), view.getUint8(pos+5), view.getUint8(pos+6), view.getUint8(pos+7));
	
	while (pos < headerBuffer.byteLength && MP4.isValidAtom(type)) {
		size = view.getUint32(pos);
		type = String.fromCharCode(view.getUint8(pos+4), view.getUint8(pos+5), view.getUint8(pos+6), view.getUint8(pos+7));
		result.push({size : size, type : type, pos : pos});
//		console.log(pos, result)
		for (var i = 0, l = this.siblingInterestingAtoms.length; i < l; i++) {
			if (type === this.siblingInterestingAtoms[i])
				offset = pos;
		}
		pos += size;
	}

	if (!MP4.isValidAtom(result[result.length - 1].type)) {
		result.splice(0, 0, offset);
		return result;
	}
	else if (result.length)
		return offset;
}


parser.setFileDescription = function(type, currentIndex, track) {
	var codecBox = [], objectType, frequencyIndex, channelConfiguration, frameLengthFlag;
//	console.log(type, currentIndex);
	if (type === 'video') {
		if (typeof track.mdia.minf.stbl.stsd.content['avc1'] === 'undefined') {
			postMessage['error', 'unsupported file format : \n the video stream descriptor is not avc1'];
			return;
		}
		this.fileStructure.fileDesc['fileFormat'] = 'Mp4 ' + track.mdia.minf.stbl.stsd.content.subAtomType;
		this.fileStructure.fileDesc['frameRate'] = this.getFrameRate(track);
		this.fileStructure.fileDesc.w = track.mdia.minf.stbl.stsd.content.stsdTable.getUint16(24);
		this.fileStructure.fileDesc.h = track.mdia.minf.stbl.stsd.content.stsdTable.getUint16(26);
		this.fileStructure.fileDesc['videoSize'] = this.fileStructure.fileDesc.w.toString() + ' x ' + this.fileStructure.fileDesc.h.toString()
		codecBox[0] = track.mdia.minf.stbl.stsd.content['avc1'].content['avcC'].content;
		this.fileStructure.fileDesc['videoCodec'] = track.mdia.minf.stbl.stsd.content.subAtomType + '.' +  codecBox[0]['profile'] + codecBox[0]['compatible_profiles'] + codecBox[0]['level'].toString(16);
		this.fileStructure.fileDesc['videoCodecHR'] = 'MPEG4 AVC ' +  codecBox[0]['profile_HR'] + ' @ L' + codecBox[0]['level'];
	}
	else if (type === 'audio') {
		
		if (typeof track.mdia.minf.stbl.stsd.content['mp4a'] === 'undefined') {
			postMessage['error', 'track ' + this.trakNbr + ' : unsupported file format : \n the audio stream descriptor is not mp4a'];
			return;
		}
		
		codecBox[0] = track.mdia.minf.stbl.stsd.content['mp4a'].content['esds'].content['ES_descriptor'].content['decoder_config'];
		codecBox[1] = track.mdia.minf.stbl.stsd.content['mp4a'].content['esds'].content['ES_descriptor'].content['decoder_specific'];
		
		objectType = codecBox[1]['ES_header_start_codes'] >>> 11; 	// 5 bits
		frequencyIndex = (codecBox[1]['ES_header_start_codes'] << 21) >>> 28; 	// 4 bits
		channelConfiguration = (codecBox[1]['ES_header_start_codes'] << 25) >>> 28; 	// 4 bits
		frameLengthFlag = (codecBox[1]['ES_header_start_codes'] << 30) >>> 31; 	// 1 bit
//		console.log(objectType, frequencyIndex, channelConfiguration, frameLengthFlag);
		
		if (typeof track.mdia.minf.stbl.stsd.content['mp4a'] === 'undefined' || objectType !== 2) {
			postMessage['error', 'track ' + this.trakNbr + ' : unsupported file format : \n the audio stream descriptor is not mp4a or not AAL LC'];
			return;
		}
		else if (typeof this.fileStructure.fileDesc.audioTracks[currentIndex] === 'undefined') {
			this.fileStructure.fileDesc.audioTracks[currentIndex] = {};
//			console.log(this.fileStructure.fileDesc.audioTracks[currentIndex]);
		}
		// TypedArray for timeTables : arrayBuffer.byteLength = 8 * Math.ceil(float nbrOfSlices)
		this.fileStructure.timeTables[currentIndex] = new Float64Array(new ArrayBuffer(8 * Math.ceil(track.mdia.minf.stbl.stco.content.numberOfEntries / this.trackSliceFactor)));
		this.fileStructure.languageCodes[currentIndex] = track.mdia.mdhd.content.language;
		this.fileStructure.fileDesc.audioTracks[currentIndex]['duration'] = track.tkhd.content.duration / this.fileStructure.moov.mvhd.content.timeScale;
		this.fileStructure.fileDesc.audioTracks[currentIndex]['languageCode'] = track.mdia.mdhd.content.language;
		this.fileStructure.fileDesc.audioTracks[currentIndex]['channelConfiguration'] = channelConfiguration;
		this.fileStructure.fileDesc.audioTracks[currentIndex]['averageBitrate'] = codecBox[0]['average_bit_rate'];
		this.fileStructure.fileDesc.audioTracks[currentIndex]['samplingFrequency'] = track.mdia.mdhd.content['timeScale'];
		this.fileStructure.fileDesc.audioTracks[currentIndex]['audioCodec'] = track.mdia.minf.stbl.stsd.content.subAtomType + '.' + codecBox[0]['object_type_ID'].slice(2) + '.' + objectType;
		this.fileStructure.fileDesc.audioTracks[currentIndex]['audioCodec_HR'] = codecBox[0]['object_type_ID_HR'] + ' AAC LC';
	}
}

parser.trackTypeFromSubType = function(subType) {
	var type;
	switch (subType) {
		case 'vide' :
			return 'video';
		case 'soun' :
			return 'audio';
	}
}


// TODO (done ?): allow moof : Within	the	movie	fragment	there	is	a	set	of	track	fragments,	zero	or	more	per	track.	The	track	fragments	
// in	turn	contain	zero	or	more	track	runs,	each	of	which	document	a	contiguous	run	of	samples	for	that track
// TODO : allow co64 (ChunkLargeOffsetBox) to support files larger than 4GB
parser.interestingAtoms = [
                 	'moov',
                 	'moof',
                 	'mvex', 	// The Movie Extends Header (mehd) is optional (provides the overall duration)
                 	'trak',
                 	'edts',
                 	'traf',
                 	'mdia',
                 	'minf',
                 	'stbl',
                 	'tref'
                 ];

parser.parseRecursive = function(blockSize, currentBlock) {
	var originalPos = Number(this.pos) - 8, subBlockSize, subBlockType, block, pos, trackType, buffer = this.headerBuffer;
//	console.log(blockSize)
	while ((blockSize + originalPos) > this.pos) {
//		console.log(this.pos);
		subBlockSize = buffer.getUint32(this.pos);
//		console.log(subBlockSize);
		if (!subBlockSize)
			return;
		this.pos += 4;
		subBlockType = String.fromCharCode(buffer.getUint8(this.pos++)) + String.fromCharCode(buffer.getUint8(this.pos++)) + String.fromCharCode(buffer.getUint8(this.pos++)) + String.fromCharCode(buffer.getUint8(this.pos++));
//		console.log(subBlockType);
		
		if (this.interestingAtoms.indexOf(subBlockType) !== -1) {
			if (subBlockType === 'trak') {
				
				currentBlock[subBlockType + this.trakNbr] = {size : subBlockSize};
				currentBlock[subBlockType + this.trakNbr][subBlockType + 'Pos'] = this.pos - 8;
				
				this.parseRecursive(subBlockSize, currentBlock[subBlockType + this.trakNbr], subBlockType);
//				console.log(subBlockType, currentBlock[subBlockType + this.trakNbr]);
//				if (typeof currentBlock[subBlockType + this.trakNbr].mdia !== 'undefined') {
					trackType = this.trackTypeFromSubType(currentBlock[subBlockType + this.trakNbr].mdia.hdlr.content.componentSubtype);
					
					if (trackType === 'video') {
						currentBlock.trakVideo = currentBlock[subBlockType + this.trakNbr];
						delete currentBlock[subBlockType + this.trakNbr];
	//					currentBlock.trakVideo.frameRate = this.getFrameRate();
						this.trakNbr--;
						
						this.setFileDescription(trackType, this.trakNbr, currentBlock.trakVideo);
					}
					else if (trackType === 'audio') {
						this.setFileDescription(trackType, this.trakNbr, currentBlock[subBlockType + this.trakNbr]);
					}
//				}
				
				this.trakNbr++;
			}
			else if (subBlockType === 'moof' || subBlockType === 'mdat') {
//				console.log(subBlockType);
				if (subBlockType === 'moof')
					this.segmentNbr++;
				currentBlock[subBlockType + this.segmentNbr] = {size : subBlockSize};
				currentBlock[subBlockType + this.segmentNbr][subBlockType + 'Pos'] = this.pos - 8;
				this.parseRecursive(subBlockSize, currentBlock[subBlockType + this.segmentNbr], subBlockType);
			}
			else {
				currentBlock[subBlockType] = {size : subBlockSize};
				currentBlock[subBlockType][subBlockType + 'Pos'] = this.pos - 8;
				
				this.parseRecursive(subBlockSize, currentBlock[subBlockType], subBlockType);
			}
		}
		else if (typeof this['parse_' + subBlockType + '_atom'] === 'function') {
			if (subBlockType === 'trex') {
				currentBlock[subBlockType + this.trexNbr] = this['parse_' + subBlockType + '_atom'](subBlockSize);
				currentBlock[subBlockType + this.trexNbr][subBlockType + 'Pos'] = this.pos - subBlockSize;
				this.trexNbr++;
			}
			else {
				currentBlock[subBlockType] = this['parse_' + subBlockType + '_atom'](subBlockSize);
				currentBlock[subBlockType][subBlockType + 'Pos'] = this.pos - subBlockSize;
			}
		}
		else {
			currentBlock[subBlockType] = {};
			currentBlock[subBlockType].size = subBlockSize;
			this.pos = this.pos + subBlockSize - 8;
		}
	}
	
	return currentBlock;
}


/** HELPER :
 *  logic borrowed to MP4 class from https://github.com/dailymotion/hls.js
 *  
*/
var MP4 = {};

MP4.types = {
	      avc1: [], // codingname
	      avcC: [],
	      btrt: [],
	      dinf: [],
	      dref: [],
	      edts: [],
	      elst: [],
	      esds: [],
	      ftyp: [],
	      hdlr: [],
	      mdat: [],
	      mdhd: [],
	      mdia: [],
	      mfhd: [],
	      minf: [],
	      moof: [],
	      moov: [],
	      mp4a: [],
	      mehd: [],
	      mvex: [],
	      mvhd: [],
	      sidx: [],
	      sdtp: [],
	      stbl: [],
	      stco: [],
	      stsc: [],
	      stsd: [],
	      stsz: [],
	      stts: [],
	      styp: [],
	      tfdt: [],
	      tfhd: [],
	      traf: [],
	      trak: [],
	      trun: [],
	      trex: [],
	      tkhd: [],
	      vmhd: [],
	      smhd: [],
	      free: []
	};

MP4.init = function() {
	var i;
	for (i in MP4.types) {
	  if (MP4.types.hasOwnProperty(i)) {
	    MP4.types[i] = [
	      i.charCodeAt(0),
	      i.charCodeAt(1),
	      i.charCodeAt(2),
	      i.charCodeAt(3)
	    ];
	  }
	}
}

MP4.versionFlags = new Uint8Array([
									0x00, // version 0
									0x00, 0x00, 0x00, // flags
									]);

MP4.sampleTables = {};
MP4.sampleTables.entrySize = {
		stts : 8,
		ctts : 8,
		stsc : 12,
		stss : 4,
		stco : 4,
		stsz : 4,
		stsd : 0,
		elst : 12,
		stdp : 2
}

MP4.isValidAtom = function(atomType) {
	if (Object.prototype.toString.call(atomType) === '[object ArrayBuffer]') {
		atomType = new Uint8Array(atomType);
		atomType = String.fromCharCode(atomType[0], atomType[1], atomType[2], atomType[3]);
	}

	for (var i in MP4.types) {
		if (i === atomType) {
			return true;
		}
	}
}

MP4.init();


/**
* Atoms definitions
*/



parser.parse_hint_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'trackIDs': this.parse_id_table((size - 8) / 4, 4)};
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_sidx_atom = function(size) {
	var originalPos = Number(this.pos);
	this.pos += 4; 	// "sidx" box extends full box (incl. version and flags) 
	
//	unsigned int(32) reference_ID;
	var blockContent = {'reference_ID' : this.headerBuffer.getUint32(this.pos)};
	this.pos += 4; 
//	unsigned int(32) timescale;
	blockContent['timescale'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4; 
//	if (version==0) {
//	unsigned int(32) earliest_presentation_time;
	blockContent['earliest_presentation_time'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4; 
//	unsigned int(32) first_offset;
	blockContent['first_offset'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4; 
//	
//	unsigned int(16) reserved = 0;
	this.pos += 2; 
//	unsigned int(16) reference_count;
	blockContent['nbr_of_entries'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2; 

	blockContent['sidxTable'] = this.parse_sidx_table(blockContent['nbr_of_entries']);
	
	// debug
	blockContent['sidxTable_HR'] = [];
	for(var i = 0; i < blockContent['nbr_of_entries']; i++) {
		blockContent['sidxTable_HR'][i] = this.access_sidx_table(i, blockContent['timescale']);
	}
	// debug
	
	this.pos = originalPos + size - 8; 
	return {'size' : size, 'content' : blockContent};
}

// Segment Index
parser.parse_sidx_table = function(numberOfEntries) {
	var view = new DataView(this.headerBuffer.buffer, this.pos, numberOfEntries * 8);
	return view;
}

parser.access_sidx_table = function(index, timescale) {
	var entry = {};
	entry['reference_type'] = this.headerBuffer.getUint32(this.pos + index * 12) >>> 31;
	entry['referenced_size'] = this.headerBuffer.getUint32(this.pos + index * 12) & 0x7FFFFFFF;
	entry['subsegment_duration'] = this.headerBuffer.getUint32(this.pos + index * 12 + 4) / timescale;
	entry['starts_with_SAP'] = this.headerBuffer.getUint32(this.pos + index * 12 + 8) >>> 31;
	entry['SAP_type'] = (this.headerBuffer.getUint32(this.pos + index * 12 + 8) >>> 28) & 0x07;
	entry['SAP_delta_time'] = (this.headerBuffer.getUint32(this.pos + index * 12 + 8) & 0x0FFFFFFF) / timescale;
	return entry;
}

// Sample Description
parser.parse_stsd_atom = function(size) {
	return this.parse_st_atom(size, 'stsd');
};

// Decoding Time to sample
parser.parse_stts_atom = function(size) {
	return this.parse_st_atom(size, 'stts');
};

// Composition Time to sample
parser.parse_ctts_atom = function(size) {
	return this.parse_st_atom(size, 'ctts');
};

// Sample to chunk
parser.parse_stsc_atom = function(size) {
	return this.parse_st_atom(size, 'stsc');
};

// Sync Sample
parser.parse_stss_atom = function(size) {
	return this.parse_st_atom(size, 'stss');
};

// Sample size
parser.parse_stsz_atom = function(size) {
	return this.parse_st_atom(size, 'stsz');
};

// Chunk offset
parser.parse_stco_atom = function(size) {
	return this.parse_st_atom(size, 'stco');
};

/** get st tables as a buffer
 * 
 * @param numberOfEntries
 * @param entrySize
 * @returns {DataView}
 */

// st table
parser.parse_st_table = function(numberOfEntries, entrySize) {
//	console.log(numberOfEntries, entrySize);
	if (numberOfEntries)
		var view = new DataView(this.headerBuffer.buffer, this.pos, numberOfEntries * entrySize);
	else
		var view = new DataView(new ArrayBuffer());
	return view;
}

parser.parse_st_table_full = function(numberOfEntries, entrySize) {
//	console.log(numberOfEntries, entrySize);
	var result = [], entry;
	for (var i = 0; i < numberOfEntries; i++) {
		entry = [];
		for (var j = 0; j < entrySize / 4; j++) {
			entry.push(this.headerBuffer.getUint32(this.pos))
			this.pos += 4;
		}
		result.push(entry.slice(0))
	}
	return result;
}

/** get id tables as an Array
 * 
 * @param numberOfEntries
 * @param entrySize
 * @returns {Array}
 */
parser.parse_id_table = function(numberOfEntries, entrySize) {
	var result = [];
	for (var i = 0; i < numberOfEntries; i++) {
		result.push(this.headerBuffer.getUint32(this.pos))
		this.pos += 4;
	}
	return result;
}

parser.parse_st_atom = function(size, table) {
	var blockContent = {}, numberOfEntries = 0, originalPos = Number(this.pos), subBlockSize, subBlockType;
	blockContent.version = this.headerBuffer.getUint8(this.pos++);
	blockContent.flags = this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString(); 

	blockContent.numberOfEntries = numberOfEntries = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;

	if (typeof table !== 'undefined') {
		if (table === 'stsz') {
			this.pos -= 4;
			blockContent.defaultSampleSize = this.headerBuffer.getUint32(this.pos);
			this.pos += 4;
			blockContent.numberOfEntries = numberOfEntries = this.headerBuffer.getUint32(this.pos);
			this.pos += 4;
			blockContent[table + 'Table'] = this.parse_st_table(numberOfEntries, MP4.sampleTables.entrySize[table]);
		}
		else if (table === 'stsd') {
			// should be ONE entry long : we choose here not to support the case of multiple "sample desc"
			if (numberOfEntries > 1) {
				postMessage(['error', 'the file format is not supported : too many sample descriptions : ' + numberOfEntries]);
				return {'size' : size, 'content' : blockContent};
			}

			var view;
			subBlockSize = this.headerBuffer.getUint32(this.pos);
//				console.log(subBlockSize);
			this.pos += 4;
			subBlockType = String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++));
//				console.log(subBlockType);
			
			view = new DataView(this.headerBuffer.buffer.slice(this.pos, this.pos + subBlockSize - 8));
			if (typeof this['parse_' + subBlockType + '_atom'] === 'function') {
				blockContent[subBlockType] = this['parse_' + subBlockType + '_atom'](subBlockSize);
			}

			blockContent[table + 'Table'] = view;
			blockContent['subAtomSize'] = subBlockSize;
			blockContent['subAtomType'] = subBlockType;
		}
		else {
			blockContent[table + 'Table'] = this.parse_st_table(numberOfEntries, MP4.sampleTables.entrySize[table]);
		}
	}
//	console.log(this.pos, originalPos + size - 8, blockContent);
	if (this.pos !== originalPos + size - 8) {
		this.pos = originalPos + size - 8;
	}
//	console.log(this.fileStructure);
	return {'size' : size, 'content' : blockContent};
};

parser.parse_mp4a_atom = function(size) {
	var originalPos = Number(this.pos), subBlockSize, subBlockType;

	var blockContent = {'Reserved' : 0};
	this.pos += 6;
	blockContent['data_reference_index'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Version'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Revision_level'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Vendor'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['Number_of_channels'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Sample_size'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Compression_ID'] = this.headerBuffer.getUint16(this.pos); // must be set to 0 for version 0 sound descriptions, set to –2, the sound track uses redefined sample tables optimized for compressed audio : sample-to-chunk and chunk offset atoms point to compressed frames
	this.pos += 2;
	// a version 1 sound description is used and the compression ID field is set to –2. The samplesPerPacket field and the bytesPerSample field are not necessarily meaningful for variable bit rate audio
	blockContent['Packet_size'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['Sample_rate'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 4;
	
	// to esds atom
	subBlockSize = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	subBlockType = String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++));
	
	if (typeof this['parse_' + subBlockType + '_atom'] === 'function') {
		blockContent[subBlockType] = this['parse_' + subBlockType + '_atom'](subBlockSize);
	}
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_esds_atom = function(size) {
	var blockContent = {}, originalPos = Number(this.pos);
	
	blockContent.version = this.headerBuffer.getUint8(this.pos++);
	blockContent.flags = this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString();
	
	blockContent['ES_descriptor_type'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); // 0x03
	this.pos += 1;

	//3 bytes optional extended descriptor type tag string
	if ([0x80, 0x81, 0xFE].indexOf(this.headerBuffer.getUint8(this.pos)) !== -1) {
		blockContent['tag_string'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 3;
	}
	
	// length remaining after length_byte :  as found on real cases : length includes 0x04, 0x05 and 0x06 ES_Descriptor (should exclude trailing descriptors)
	blockContent['descriptor_length'] = this.headerBuffer.getUint8(this.pos);
	this.pos += 1;
	
	blockContent['ES_ID'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent['tags'] = this.headerBuffer.getUint8(this.pos);
	blockContent['stream_dependance_flag'] = blockContent['tags'] & 0x80;
	blockContent['url_flag'] = blockContent['tags'] & 0x40;
	blockContent['stream_priority'] = (blockContent['tags'] << 3) >>> 3;
	delete blockContent['tags'];
	this.pos += 1;
	
	// ISO_IEC_14496-1_1998 p24 (pdf p47)
	// if (URL_Flag)
	// 		bit(8) URLstring[length-3-(streamDependencFlag*2)];
	if (blockContent['url_flag']) {
		this.pos += blockContent['descriptor_length'] - 3 - blockContent['stream_dependance_flag'] * 2;
	}
	
	blockContent['ES_descriptor'] = this.parse_ES_descriptor(blockContent['descriptor_length']) 	// -3 -5
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

/*
 * 1 	AAC Main 	1999 	contains AAC LC
2 	AAC LC (Low Complexity) 	1999 	Used in the "AAC Profile". MPEG-4 AAC LC Audio Object Type is based on the MPEG-2 Part 7 Low Complexity profile (LC) combined with Perceptual Noise Substitution (PNS) (defined in MPEG-4 Part 3 Subpart 4).[4][21]
3 	AAC SSR (Scalable Sample Rate) 	1999 	MPEG-4 AAC SSR Audio Object Type is based on the MPEG-2 Part 7 Scalable Sampling Rate profile (SSR) combined with Perceptual Noise Substitution (PNS) (defined in MPEG-4 Part 3 Subpart 4).[4][21]
4 	AAC LTP (Long Term Prediction) 	1999 	contains AAC LC
5 	SBR (Spectral Band Replication) 	2003[22] 	used with AAC LC in the "High Efficiency AAC Profile" (HE-AAC v1)
6 	AAC Scalable 	1999 	
7 	TwinVQ 	1999 	audio coding at very low bitrates
8 	CELP (Code Excited Linear Prediction) 	1999 	speech coding
9 	HVXC (Harmonic Vector eXcitation Coding) 	1999 	speech coding
10 	(Reserved) 		
11 	(Reserved) 		
12 	TTSI (Text-To-Speech Interface) 	1999 	
13 	Main synthesis 	1999 	contains 'wavetable' sample-based synthesis[23] and Algorithmic Synthesis and Audio Effects
14 	'wavetable' sample-based synthesis 	1999 	based on SoundFont and DownLoadable Sounds,[23] contains General MIDI
15 	General MIDI 	1999 	
16 	Algorithmic Synthesis and Audio Effects 	1999 	
17 	ER AAC LC 	2000 	Error Resilient
18 	(Reserved ) 		
19 	ER AAC LTP 	2000 	Error Resilient
20 	ER AAC Scalable 	2000 	Error Resilient
21 	ER TwinVQ 	2000 	Error Resilient
22 	ER BSAC (Bit-Sliced Arithmetic Coding) 	2000 	It is also known as "Fine Granule Audio" or fine grain scalability tool. It is used in combination with the AAC coding tools and replaces the noiseless coding and the bitstream formatting of MPEG-4 Version 1 GA coder. Error Resilient
23 	ER AAC LD (Low Delay) 	2000 	Error Resilient, used with CELP, ER CELP, HVXC, ER HVXC and TTSI in the "Low Delay Profile", (commonly used for real-time conversation applications)
24 	ER CELP 	2000 	Error Resilient
25 	ER HVXC 	2000 	Error Resilient
26 	ER HILN (Harmonic and Individual Lines plus Noise) 	2000 	Error Resilient
27 	ER Parametric 	2000 	Error Resilient
28 	SSC (SinuSoidal Coding) 	2004[24][25] 	
29 	PS (Parametric Stereo) 	2004[26] and 2006[27][28] 	used with AAC LC and SBR in the "HE-AAC v2 Profile". PS coding tool was defined in 2004 and Object Type defined in 2006.
30 	MPEG Surround 	2007[29] 	also known as MPEG Spatial Audio Coding (SAC), it is a type of spatial audio coding[30][31] (MPEG Surround was also defined in ISO/IEC 23003-1 in 2007[32])
31 	(Reserved) 		
32 	MPEG-1/2 Layer-1 	2005[33] 	
33 	MPEG-1/2 Layer-2 	2005[33] 	
34 	MPEG-1/2 Layer-3 	2005[33] 	also known as "MP3onMP4"
35 	DST (Direct Stream Transfer) 	2005[34] 	lossless audio coding, used on Super Audio CD
36 	ALS (Audio Lossless Coding) 	2006[28] 	lossless audio coding
37 	SLS (Scalable Lossless Coding) 	2006[35] 	two-layer audio coding with lossless layer and lossy General Audio core/layer (e.g. AAC)
38 	SLS non-core 	2006 	lossless audio coding without lossy General Audio core/layer (e.g. AAC)
39 	ER AAC ELD (Enhanced Low Delay) 	2008[36] 	Error Resilient
40 	SMR (Symbolic Music Representation) Simple 	2008 	note: Symbolic Music Representation is also the MPEG-4 Part 23 standard (ISO/IEC 14496-23:2008)[37][38]
41 	SMR Main 	2008 	
42 	USAC (Unified Speech and Audio Coding) (no SBR) 		2012[39]
43 	SAOC (Spatial Audio Object Coding) 	2010[40][41] 	note: Spatial Audio Object Coding is also the MPEG-D Part 2 standard (ISO/IEC 23003-2:2010)[42]
44 	LD MPEG Surround 	2010[40][43] 	This object type conveys Low Delay MPEG Surround Coding side information (that was defined in MPEG-D Part 2 – ISO/IEC 23003-2[42]) in the MPEG-4 Audio framework.[44]
45 	USAC[45] 		2012[46] (it will be also defined in MPEG-D Part 3 – ISO/IEC 23003-3[47]) 
 */


// http://xhelmboyx.tripod.com/formats/mp4-layout.txt
MP4.object_type_ID = {
	1 : 'system v1',
	2 : 'system v2',
	32 : 'MPEG-4 video',
	33 : 'MPEG-4 AVC SPS',
	34 : 'MPEG-4 AVC',
	64 : 'MPEG-4 audio',
	96 : 'MPEG-2 simple video',
	97 : 'MPEG-2 main video',
	98 : 'MPEG-2 SNR video',
	99 : 'MPEG-2 spatial video',
	100 : 'MPEG-2 high video',
	101 : 'MPEG-2 4:2:2 video',
	102 : 'MPEG-4 ADTS main',
	103 : 'MPEG-4 ADTS Low Complexity',
	104 : 'MPEG-4 ADTS Scalable Sampling Rate',
	105 : 'MPEG-2 ADTS',
	106 : 'MPEG-1 video',
	107 : 'MPEG-1 ADTS',
	108 : 'JPEG video',
	192 : 'private audio',
	208 : 'private video',
	224 : '16-bit PCM LE audio',
	225 : 'vorbis audio',
	226 : 'dolby v3 (AC3) audio',
	227 : 'alaw audio',
	228 : 'mulaw audio',
	229 : 'G723 ADPCM',
	230 : '16-bit PCM Big Endian audio',
	204 : 'YCbCr 4:2:0 (YV12) video',
	241	: 'H264 video',
	242 : 'H263 video',
	243 : 'H261 video',
	}

parser.parse_ES_descriptor = function(size) {
	var blockContent = {}, specificBlockContent = {}, SLconfigBlockContent = {}, originalPos = Number(this.pos);
	
	blockContent['ES_decoder_config_descriptor_type'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); // 0x04
	this.pos += 1;
	//3 bytes optional extended descriptor type tag string
	if ([0x80, 0x81, 0xFE].indexOf(this.headerBuffer.getUint8(this.pos)) !== -1) {
		blockContent['tag_string'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 3;
	}
	// length remaining after length_byte : as found on real cases : length includes 0x05 ES_Descriptor but not 0x06 (should exclude trailing descriptors)
	blockContent['tag_length'] = this.headerBuffer.getUint8(this.pos);
	this.pos += 1;
	blockContent['object_type_ID'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); 	// MPEG-4 audio = 64 (0x40); MPEG-4 video = 32 (0x20); H264 video = 241
	blockContent['object_type_ID_HR'] =  MP4.object_type_ID[parseInt(blockContent['object_type_ID'])];
	this.pos += 1;
	blockContent['stream_type'] = this.headerBuffer.getUint8(this.pos) >>> 2; 	// 6 bits stream type = 3/4 byte hex value
	/*
	 * 	- type IDs are object descript. = 1 ; clock ref. = 2
	    - type IDs are scene descript. = 4 ; visual = 4
	    - type IDs are audio = 5 ; MPEG-7 = 6 ; IPMP = 7
	    - type IDs are OCI = 8 ; MPEG Java = 9
	    - type IDs are user private = 32
	 */
	this.pos += 1;
	blockContent['buffer_size'] = this.headerBuffer.getUint32(this.pos) >>> 8;
	this.pos += 3;
	blockContent['maximum_bit_rate'] = this.headerBuffer.getUint32(this.pos); 
	this.pos += 4;
	blockContent['average_bit_rate'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	
	specificBlockContent['ES_decoder_specific_descriptor_type'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); // 0x05
	this.pos += 1;
	//3 bytes optional extended descriptor type tag string
	if ([0x80, 0x81, 0xFE].indexOf(this.headerBuffer.getUint8(this.pos)) !== -1) {
		specificBlockContent['tag_string'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 3;
	}
	// length remaining after length_byte : as found on real cases : length includes only 0x05 ES_Descriptor
	specificBlockContent['tag_length'] = this.headerBuffer.getUint8(this.pos); // 1 byte : descriptor type length
	this.pos += 1;
	specificBlockContent['ES_header_start_codes'] = '0x';
	var currentPos = Number(this.pos);
	while (this.pos < currentPos + specificBlockContent['tag_length']) { // Every stream or table begins with a 32-bit start code : 0x01 - 0xAF means "slice"
		specificBlockContent['ES_header_start_codes'] += this.headerBuffer.getUint8(this.pos).toString(16); 	// ES header start codes = hex dump
		this.pos += 1;
	}
	specificBlockContent['ES_header_start_codes'] = parseInt(specificBlockContent['ES_header_start_codes']);
	
	// Sync Layer
	SLconfigBlockContent['ES_SL_config_descriptor_type'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); // 0x06
	this.pos += 1;
	//3 bytes optional extended descriptor type tag string
	if ([0x80, 0x81, 0xFE].indexOf(this.headerBuffer.getUint8(this.pos)) !== -1) {
		SLconfigBlockContent['tag_string'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 3;
	}
	// length remaining after length_byte : as found on real cases : always === 1
	SLconfigBlockContent['tag_length'] = this.headerBuffer.getUint8(this.pos);
	this.pos += 1;
	// ISO_IEC_14496-1_1998 10.2.3.1 : if (predefined==0) { [...] }
	SLconfigBlockContent['SL_value'] = '0x' + this.headerBuffer.getUint8(this.pos).toString(16); 	// bit(8) predefined : 0x02 - 0xFF : Reserved for ISO use 

	
	this.pos = originalPos + size - 8;
	return {size : size, content : {
		'decoder_config' : blockContent,
		'decoder_specific' : specificBlockContent,
		'SL_config' : SLconfigBlockContent
		}};
}

parser.parse_avc1_atom = function(size) {
	var blockContent = {}, originalPos = Number(this.pos), subBlockSize, subBlockType;
	//6 bytes reserved = 48-bit value set to zero
	this.pos += 6;
	
//    -> 2 bytes data reference index
//        = short unsigned index from 'dref' box
//      - there are other sample descriptions
//         available in the Apple QT format dev docs
	blockContent['data_reference_index'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
//    -> 2 bytes QUICKTIME video encoding version = short hex version
//      - default = 0 ; audio data size before decompression = 1
	blockContent['QUICKTIME_video_encoding_version'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
//    -> 2 bytes QUICKTIME video encoding revision level = byte hex version
//      - default = 0 ; video can revise this value
	blockContent['QUICKTIME_video_encoding_revision_level'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
//    -> 4 bytes QUICKTIME video encoding vendor = long ASCII text string
//      - default = 0
	blockContent['QUICKTIME_video_encoding_revision_vendor'] = String.fromCharCode.call(this.headerBuffer.getUint32(this.pos));
	this.pos += 4;
//    -> 4 bytes QUICKTIME video temporal quality = long unsigned value (0 to 1024)
	blockContent['QUICKTIME_video_temporal_quality'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
//    -> 4 bytes QUICKTIME video spatial quality = long unsigned value (0 to 1024)
//      - some quality values are lossless = 1024 ; maximum = 1023 ; high = 768
//      - some quality values are normal = 512 ; low = 256 ; minimum = 0
	blockContent['QUICKTIME_video_spatial_quality'] = this.headerBuffer.getUint32(this.pos); // >= 768 ? 'high' : 'normal';
	this.pos += 4;
//    -> 4 bytes video frame pixel size
//        = short unsigned width + short unsigned height
	blockContent['video_frame_pixel_size'] = this.headerBuffer.getUint16(this.pos).toString() + '/' + this.headerBuffer.getUint16(this.pos).toString();
	this.pos += 4;
	
//    -> 8 bytes video resolution
//        = long fixed point horizontal + long fixed point vertical
//      - defaults to 72.0 dpi
	blockContent['video_resolution_h'] = this.headerBuffer.getUint16(this.pos).toString();
	this.pos += 2;
	blockContent['video_resolution_h'] += '.' + this.headerBuffer.getUint16(this.pos).toString()
	blockContent['video_resolution_h'] = parseFloat(blockContent['video_resolution_h']);
	this.pos += 2;
	blockContent['video_resolution_v'] = this.headerBuffer.getUint16(this.pos).toString();
	this.pos += 2;
	blockContent['video_resolution_v'] += '.' + this.headerBuffer.getUint16(this.pos).toString()
	blockContent['video_resolution_v'] = parseFloat(blockContent['video_resolution_v']);
	this.pos += 2;
	
//    -> 4 bytes QUICKTIME video data size = long value set to zero
	blockContent['QUICKTIME_video_data_size'] = this.headerBuffer.getUint32(this.pos); 
	this.pos += 4;
//    -> 2 bytes video frame count = short unsigned total (set to 1)
	blockContent['video_frame_count'] = this.headerBuffer.getUint16(this.pos); 
	this.pos += 2;
	
//    -> 1 byte video encoding name string length = byte unsigned length
	blockContent['video_encoding_name_length'] = this.headerBuffer.getUint8(this.pos); 
	this.pos += 1;
//    -> 31 bytes video encoder name string
//    -> NOTE: if video encoder name string < 31 chars then pad with zeros
	blockContent['video_encoding_name'] = '';
	for (var i = 0, l = 31; i < l; i++) {
		if (i < blockContent['video_encoding_name_length'])
			blockContent['video_encoding_name'] += String.fromCharCode.call(this.headerBuffer.getUint8(this.pos));
		this.pos += 1;
	}

//    -> 2 bytes video pixel depth = short unsigned bit depth
//      - colors are 1 (Monochrome), 2 (4), 4 (16), 8 (256)
//      - colors are 16 (1000s), 24 (Ms), 32 (Ms+A)
//      - grays are 33 (B/W), 34 (4), 36 (16), 40(256)
	blockContent['video_pixel_depth'] = this.headerBuffer.getUint16(this.pos); 
	this.pos += 2;
//    -> 2 bytes QUICKTIME video color table id = short integer value
//        (no table = -1)
	this.pos += 2;
	
	//   -> optional QUICKTIME color table data if above set to 0
	//        (see color table atom below for layout)
	// or go to pasp or avcC box
	while (this.pos < originalPos + size - 16) { 				// should be originalPos + size - 8, but trick here to prevent eventual (although never seen) end-padded avc1 box (one should never rely on supposingly full-filled box, so end loop before remaining data is under 8 bytes)
		subBlockSize = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
		subBlockType = String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++));
		if (typeof this['parse_' + subBlockType + '_atom'] === 'function') {
			blockContent[subBlockType] = this['parse_' + subBlockType + '_atom'](subBlockSize) 	// -3 -5
		}
		else
			this.pos += subBlockSize - 8;
	}
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}


MP4.codecTable ={
		avc1 : 'H264', 
		mp4v : 'MPEG4 Visual',
		encv : 'ISO/IEC 14496-12 or 3GPP',
		s263 : '3GPP H.263v1'
}

MP4.profileTable ={
		'42' : 'Baseline', 
		'4d' : 'Main',
		'64' : 'High',
}

parser.parse_avcC_atom = function(size) {
	var blockContent = {}, originalPos = Number(this.pos);
	
//	-> 1 byte version = 8-bit hex version  (current = 1)
	blockContent['version'] = this.headerBuffer.getUint8(this.pos); 
	this.pos += 1;
//    -> 1 byte H.264 profile = 8-bit unsigned stream profile
	blockContent['profile'] = zeroFill(this.headerBuffer.getUint8(this.pos).toString(16), 2); 	// Baseline : 42, Main : 4D, High : 64  https://wiki.whatwg.org/wiki/video_type_parameters#Video_Codecs_3
	blockContent['profile_HR'] = MP4.profileTable[blockContent['profile']]; 	
	this.pos += 1;
//    -> 1 byte H.264 compatible profiles = 8-bit hex flags
	blockContent['compatible_profiles'] = zeroFill(this.headerBuffer.getUint8(this.pos).toString(16), 2);
	this.pos += 1;
//    -> 1 byte H.264 level = 8-bit unsigned stream level
	blockContent['level'] = this.headerBuffer.getUint8(this.pos); 
	this.pos += 1;
	
//    -> 1 1/2 nibble reserved = 6-bit unsigned value set to 63
	blockContent['reserved'] = this.headerBuffer.getUint8(this.pos) >>> 6; 
//    -> 1/2 nibble NAL length = 2-bit length byte size type : 1 byte = 0 ; 2 bytes = 1 ; 4 bytes = 3
	blockContent['NAL_length'] = this.headerBuffer.getUint8(this.pos) & 0x03; 
	this.pos += 1;
//    -> 1 byte number of SPS = 8-bit unsigned total
	blockContent['number_of_SPS'] = this.headerBuffer.getUint8(this.pos); 
	this.pos += 1;
//    -> 2+ bytes SPS length = short unsigned length
	blockContent['SPS_length'] = this.headerBuffer.getUint16(this.pos); 
	this.pos += 2;
	// -> + SPS NAL unit = hexdump
	blockContent['SPS_NAL_unit'] = '0x';
	for (var i = 0, l = blockContent['SPS_length']; i < l; i++) {
		blockContent['SPS_NAL_unit'] += zeroFill(this.headerBuffer.getUint8(this.pos).toString(16), 2);
		this.pos += 1;
	}
//    -> 1 byte number of PPS = 8-bit unsigned total
	blockContent['number_of_PPS'] = this.headerBuffer.getUint8(this.pos); 
	this.pos += 1;
	
//    -> 2+ bytes PPS length = short unsigned length
	blockContent['PPS_length'] = this.headerBuffer.getUint16(this.pos); 
	this.pos += 2;
//  -> + PPS NAL unit = hexdump
	blockContent['PPS_NAL_unit'] = '0x';
	for (var i = 0, l = blockContent['PPS_length']; i < l; i++) {
		blockContent['PPS_NAL_unit'] += zeroFill(this.headerBuffer.getUint8(this.pos).toString(16), 2);
		this.pos += 1;
	}
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_mvhd_atom = function(size) {
	var originalPos = Number(this.pos);

	this.pos += 4;
	var blockContent = {'creationTime' : this.headerBuffer.getUint32(this.pos)};
	this.pos += 4;
	blockContent['modificationTime'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['timeScale'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['duration'] = this.headerBuffer.getUint32(this.pos);

	this.fileStructure.fileDesc.movieDuration = blockContent['duration'] / blockContent['timeScale'];
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
};



parser.parse_mdhd_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {
			'version' : this.headerBuffer.getUint8(this.pos++),
			'flags' : this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString()
	};
	
	if (blockContent.version === 0){
		blockContent.creationTime = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
		blockContent.modificationTime = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	else if (blockContent.version === 1){
		blockContent.creationTime = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
		blockContent.modificationTime = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
	}
	
	blockContent.timeScale = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	if (blockContent.version === 0){
		blockContent.duration = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	else if (blockContent.version === 1){
		blockContent.duration = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
	}
		
	blockContent.languageCode = this.headerBuffer.getUint16(this.pos);
	blockContent.language = this.getLanguageCode(blockContent.languageCode);
	this.pos += 2;
	blockContent.quality = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;

	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
};

parser.parse_mehd_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 4;
	
	if (blockContent['version'] === 1)
		blockContent['fragment_duration'] = this.headerBuffer.getUint64(this.pos);
	else if (blockContent['version'] === 0)
		blockContent['fragment_duration'] = this.headerBuffer.getUint32(this.pos);
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_mfhd_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 4;

	blockContent['sequence_number'] = this.headerBuffer.getUint32(this.pos);
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_trex_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 4; 	// "trex" box extends full box (incl. version and flags) 
	
	blockContent['track_ID'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4; 
	blockContent['default_sample_description_index'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['default_sample_duration'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['default_sample_size'] = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	blockContent['Reserved'] = 0;
	blockContent['is_leading'] = (this.headerBuffer.getUint8(this.pos) >>> 2) & 0x03;
	blockContent['sample_depends_on'] = this.headerBuffer.getUint8(this.pos) & 0x03;
	this.pos += 1;
	blockContent['sample_is_depended_on'] = (this.headerBuffer.getUint8(this.pos) >>> 6) & 0x03;
	blockContent['sample_has_redundancy'] = (this.headerBuffer.getUint8(this.pos) >>> 4) & 0x03;
	blockContent['sample_padding_value'] = (this.headerBuffer.getUint8(this.pos) >>> 1) & 0x07;
	blockContent['sample_is_non_sync_sample'] = this.headerBuffer.getUint8(this.pos) & 0x01;
	this.pos += 1;
	blockContent['sample_degradation_priority'] = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}



parser.parse_tkhd_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {
			'version' : this.headerBuffer.getUint8(this.pos++),
			'flags' : this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString()
	};
	if (blockContent.version === 0){
		blockContent.creationTime = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
		blockContent.modificationTime = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	else if (blockContent.version === 1){
		blockContent.creationTime = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
		blockContent.modificationTime = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
	}
	
	blockContent.trackId = this.headerBuffer.getUint32(this.pos);
	// reserved 4
	this.pos += 8;

	if (blockContent.version === 0){
		blockContent.duration = this.headerBuffer.getUint32(this.pos);
		// reserved 8
		this.pos += 12;
	}
	else if (blockContent.version === 1){
		blockContent.duration = this.headerBuffer.getUint64(this.pos);
		// reserved 8
		this.pos += 16;
	}

	blockContent.videoLayer = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent.alternate = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	blockContent.audioVolume = this.headerBuffer.getUint16(this.pos);
	this.pos += 2;
	// reserved 2
	// matrix structure 36
	this.pos += 38;
	blockContent.trackWidth = this.headerBuffer.getUint16(this.pos).toString() + '.' + this.headerBuffer.getUint16(this.pos + 2).toString();
	this.pos += 4;
	blockContent.trackHeight = this.headerBuffer.getUint16(this.pos).toString() + '.' + this.headerBuffer.getUint16(this.pos + 2).toString();
	this.pos += 4;

	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
};

parser.parse_tfhd_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 1;
	
	var f = '0x' 
		+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2)
		+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2)
		+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2);
	var flags = parseInt(f);
	blockContent['f'] = f;
	blockContent['flags'] = {
							base_data_offset_present : flags & 0x000001,
							sample_description_index_present : flags & 0x000002,
							default_sample_duration_present : flags & 0x000008,
							default_sample_size_present : flags & 0x000010,
							default_sample_flags_present : flags & 0x000020,
							duration_is_empty : flags & 0x010000,
							default_base_is_moof : flags & 0x020000
							};
//	this.pos += 3;
	
	if (blockContent['flags'].base_data_offset_present) {
		blockContent['base_data_offset'] = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
	}
	if (blockContent['flags'].sample_description_index_present) {
		blockContent['sample_description_index'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	if (blockContent['flags'].default_sample_duration_present) {
		blockContent['default_sample_duration'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	if (blockContent['flags'].default_sample_siz_presente) {
		blockContent['default_sample_size'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	if (blockContent['flags'].default_sample_flags_present) {
		blockContent['default_sample_flags'] = '0x' + this.headerBuffer.getUint32(this.pos).toString(16);
		this.pos += 4;
	}
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

parser.parse_tfdt_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 4;

	if (blockContent.version === 0){
		blockContent.baseMediaDecodeTime = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	else if (blockContent.version === 1){
		blockContent.baseMediaDecodeTime = this.headerBuffer.getUint64(this.pos);
		this.pos += 8;
	}
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
}

//Track run
parser.parse_trun_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {'version': this.headerBuffer.getUint8(this.pos)};
	this.pos += 1;
	
	var f = '0x'
				+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2)
				+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2)
				+ zeroFill(this.headerBuffer.getUint8(this.pos++).toString(16), 2);
	var flags = parseInt(f);
	blockContent['f'] = f;
	blockContent['flags'] = {
							data_offset_present : (flags & 0x000001) > 0,
							first_sample_flags_present : (flags & 0x000004) > 0,
							sample_duration_present : (flags & 0x000100) > 0,
							sample_size_present : (flags & 0x000200) > 0,
							sample_flags_present : (flags & 0x000400) > 0,
							sample_composition_time_offsets_present : (flags & 0x000800) > 0
							};
	
	var entrySize = blockContent['flags'].sample_duration_present + blockContent['flags'].sample_size_present + blockContent['flags'].sample_flags_present + blockContent['flags'].sample_composition_time_offsets_present;
	console.log(entrySize);
//	this.pos += 4;
	blockContent.numberOfEntries = numberOfEntries = this.headerBuffer.getUint32(this.pos);
	this.pos += 4;
	
	if (blockContent['flags'].data_offset_present) {
		blockContent['data_offset'] = this.headerBuffer.getUint32(this.pos);
		this.pos += 4;
	}
	if (blockContent['flags'].first_sample_flags_present) {
		blockContent['first_sample_flags'] = '0x' + this.headerBuffer.getUint32(this.pos).toString(16);
		this.pos += 4;
	}
	
	blockContent['trunTable'] = this.parse_st_table_full(numberOfEntries, entrySize * 4);
	
	this.pos = originalPos + size - 8;
	return {'size' : size, 'content' : blockContent};
};

parser.parse_hdlr_atom = function(size) {
	var originalPos = Number(this.pos);
	var blockContent = {
			'version' : this.headerBuffer.getUint8(this.pos++),
			'flags' : this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString()
	};
	blockContent.componentType = String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++));
	blockContent.componentSubtype = String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++)) + String.fromCharCode(this.headerBuffer.getUint8(this.pos++));

	if (this.pos !== originalPos + size - 8) {
		this.pos = originalPos + size - 8;
	}

	return {'size' : size, 'content' : blockContent};
};

parser.parse_elst_atom = function(size) {
	var originalPos = Number(this.pos);
	var numberOfEntries = this.headerBuffer.getUint32(this.pos + 4);
	var blockContent = {
			'version' : this.headerBuffer.getUint8(this.pos++),
			'flags' : this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString() + this.headerBuffer.getUint8(this.pos++).toString(),
			numberOfEntries : this.headerBuffer.getUint32(this.pos),
			elstTable : this.parse_st_table(numberOfEntries, MP4.sampleTables.entrySize['elst'])
	};
	
	this.pos = originalPos + size - 8;
	return {'size' : size, content : blockContent};
}

parser.trackTypeFromSubType = function(subType) {
	switch (subType) {
		case 'vide' :
			return 'video';
		case 'soun' :
			return 'audio';
	}
}

parser.getLanguageCode = function(ISOcode) {
	var bytes = [];
	bytes[0] = ((ISOcode & 0x00007C00) >>> 10) + 0x60;
	bytes[1] = ((ISOcode & 0x000003E0) >>> 5) + 0x60;
	bytes[2] = (ISOcode & 0x0000001F) + 0x60;

	return String.fromCharCode.apply(String, bytes);
}

parser.getFrameRate = function(track) {
	if (!track.mdia.minf.stbl.stts.content.numberOfEntries)
		return 1;
	var view = track.mdia.minf.stbl.stts.content.sttsTable,
		i = 0, c = 0, sampleCount = 0,
		significantSampleNbr = 0,
		values = [];

	while (significantSampleNbr < 256) {
		sampleCount = view.getUint32(i);
		for (c = 0; c < sampleCount; c++) {
			values.average(view.getUint32(i + 4));
		}
		significantSampleNbr += sampleCount;
		i += 8;
	}

	return ((1 / values.avg) * track.mdia.mdhd.content.timeScale) || 1;
}

parser.getMP4Brand = function(buffer, brandPos, length) {
	this.fileStructure.fileDesc['MP4brand'] = '';
	var view;
	for (var i = 8; i < length; i += 4) {
		view = new DataView(buffer.slice(brandPos + i, brandPos + i + 4));
		this.fileStructure.fileDesc['MP4brand'] += stringFromUint32(view)
	}
	this.fileStructure.brandBuffer = buffer.slice(brandPos, brandPos + length);
}
