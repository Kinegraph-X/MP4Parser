import Types from './Types.js';

/**
 * MP4Parser
 * @author KinegraphX
 * 
 * If not specified, numbers come from uint32
 */




/**
 * @function getUint64
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {boolean} littleEndian
 */
const getUint64 = function(dataView, byteOffset, littleEndian = false) {
	// on décompose la valeur 64 sur bits en deux nombres 32 bits
	const left = dataView.getUint32(byteOffset, littleEndian);
	const right = dataView.getUint32(byteOffset + 4, littleEndian);

	// on combine les deux valeurs 32 bits
	const combined = littleEndian ? left + 2 ** 32 * right : 2 ** 32 * left + right;
	if (!Number.isSafeInteger(combined)) {
		console.warn(combined, " dépasse MAX_SAFE_INTEGER : perte de précision !");
	}
	return combined;
}

/**
 * @function bufferIndexOf
 * Buffer manipulation Helper
 * @param {Uint8Array} buf
 * @param {Uint8Array} search
 * @param {number} offset
 */
const bufferIndexOf = function(buf, search, offset = 0) {
	offset = offset || 0
	let m = 0;
	let s = -1;
	for (var i = offset; i < buf.byteLength; ++i) {
		if (buf[i] !== search[m]) {
			s = -1;
			m = 0;
		}
		if (buf[i] == search[m]) {
			if (s == -1) s = i;
			++m;
			if (m == search.length) break;
		}
	}
	if (s > -1 && buf.length - s < search.length) return -1;
	return s;
}

/**
 * @function int8ArrayFromString
 * Buffer manipulation Helper
 * @param {string} str
 */
const int8ArrayFromString = function(str) {
	const len = str.length, intArray = new Uint8Array(str.length);
	for (var i = 0; i < len; i++) {
		intArray[i] = str[i].charCodeAt(0);
	}
	return intArray;
}

/**
 * @function buffer8getUint32
 * Buffer manipulation Helper
 * @param {number} pos
 * @param {Uint8Array} tArray
 * @param {boolean} littleEndian
 */
const buffer8getUint32 = function(pos, tArray, littleEndian = false) {
	if (!littleEndian)
		return tArray[pos + 3] | tArray[pos + 2] << 8 | tArray[pos + 1] << 16 | tArray[pos] << 24;
	else
		return tArray[pos] | tArray[pos + 1] << 8 | tArray[pos + 2] << 16 | tArray[pos + 3] << 24;
}

/**
 * @function stringFromBuffer
 * Buffer manipulation Helper
 * (DataViews can't be dynamically sliced => let's for now assign a new buffer)
 * @param {DataView|Uint8Array} buffer
 * @param {number} start
 * @param {number} length
 */
const stringFromBuffer = function(buffer, start = 0, length = 0) {
	let endPos;
	if (length)
		endPos = start + length;
	else
		endPos = buffer.byteLength;

	return String.fromCharCode(...new Uint8Array(buffer.buffer.slice(start, endPos)));
}

/**
 * @function stringFromUint32
 * Buffer manipulation Helper
 * @param {DataView} buffer
 * @param {number} start
 */
var stringFromUint32 = function(buffer, start = 0) {
	const normalizedArray = (new Uint8Array(buffer.buffer.slice(start, start + 4))).map(function(val) {
		return (val >= 32 && val <= 126) ? val : 32;
	});
	return String.fromCharCode(...normalizedArray);
}

/**
 * @function getNullTerminatedString
 * Buffer manipulation Helper
 * @param {Uint8Array|DataView} buf
 * @param {number} pos
 */
const getNullTerminatedString = function(buf, pos) {
	const strAsArray = [];
	let i = 0, getter, res = 0;
	
	if (buf instanceof DataView)
		getter = (pos) => buf.getUint8(pos);
	else
		getter = (pos) => buf[pos];
		
	while ((res = getter(pos + i)) !== 0) {
		strAsArray.push(res);
		i++;
	}
	return String.fromCharCode(...strAsArray);
}


// CONSTANTS

const constants = {
	stdAtomHeaderSize: 8,
	largeAtomHeaderSize: 16
}



// Base classes

class PdinTupple extends Uint8Array { }

class MP4Box {
	size;
	pos;
	type = '';
	/**
	 * @param {number} size total box size (32/64-bit, as parsed)
	 * @param {number} pos  file offset where the box header starts
	 */
	constructor(pos = 0, size = 0) {
		this.size = size;
		this.pos = pos;
	}

	// MP4Box can have properties OR children
	getProperties() {
		const out = {};
		for (const key in this) {
			if (key !== 'children')
				out[key] = this[key];
		}
		return out;
	}
}

class MP4FullBox extends MP4Box {
	version = 0;
	flags = new Uint8Array(3);

	// MP4FullBox can't have children
	getProperties() {
		const out = {};
		for (const key in this) {
			if (key !== 'data')
				out[key] = this[key];
		}
		return out;
	}

	getTable() {
		return this.data;
	}
}

/**
 * @template {MP4Box} C
 */
class ContainerBox extends MP4Box {
	/** @type {C[]} */
	children = [];
}




/** 
 * Progressive Download info box
*/
class PdinBox extends MP4FullBox {
	type = "pdin";
  /** @type {PdinTupple[]} */ sequences = [];
}



/**
 * Movie Header Box
 */
class MvhdBox extends MP4FullBox {
	type = "mvhd";
	creationTime = 0;
	modificationTime = 0;
	timeScale = 0;
	duration = 0;
	// The next props aren't generally set: they're more track-level
	frameRate = [0, 0];
	volume = 0;
	reserved1 = null;
	reserved2 = null;
	matrix = new Int32Array(9 * 4);
	preDefined = 0;
	nextTrackID = 0;
}

/**
 * Track Header Box
 */
class TkhdBox extends MP4FullBox {
	type = "tkhd";
	creationTime = 0;
	modificationTime = 0;
	trackId = 0;
	reserved1 = null;
	duration = 0;
	reserved2 = null;
	layer = 0;
	alternateGroup = 0;
	volume = 0;
	reserved3 = null;
	matrix = new Int32Array(9 * 4);
	width = [0, 0];
	height = [0, 0];
}

/**
 * Track reference box
 */
class TrefBox extends MP4Box {
	type = "tref";
	trackIDs = new Uint8Array(0);
}

/**
 * Media Header Box
 */
class MdhdBox extends MP4FullBox {
	type = "mdhd";
	creationTime = 0;
	modificationTime = 0;
	timeScale = 0;
	duration = 0;
	languageCode = "";
	preDefined = null;
}

/**
 * Media Handler Box
 */
class HdlrBox extends MP4FullBox {
	type = "hdlr";
	preDefined = null;
	handlerType = "";
	reserved = null;
	name = "";
}


/**
 * Bitrate Box
 */
class BtrtBox extends MP4Box {
	type = "btrt";
	bufferSizeDB = 0;
	maxBitrate = 0;
	avgBitrate = 0;
}



/**
 * Edits list Box
 */
class ElstBox extends MP4FullBox {
	type = "elst";
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Data Entry URL-type
 */
class UrlBox extends MP4FullBox {
	type = "url ";
	location = "";
}

/**
 * Data Entry URN-type
 */
class UrnBox extends MP4FullBox {
	type = "urn ";
	name = "";
	location = "";
}

/**
 * Sample Description Box (class to be derived, e.g in avc1)
 * (codec types, initialization etc)
 */

class SampleEntry extends MP4Box {
	type = "";
	reserved = null;
	dataReferenceIndex = 0;
	// should be derived, so other props are codec-dependant
}


class AcvCBox extends MP4Box {
	type = "avcC";
	version = 0; 
	//    -> 1 byte H.264 profile = 8-bit unsigned stream profile
	profile = ''; 	// Baseline : 42, Main : 4D, High : 64  https://wiki.whatwg.org/wiki/video_type_parameters#Video_Codecs_3
	profile_HR = ''; 	
	//    -> 1 byte H.264 compatible profiles = 8-bit hex flags
	compatible_profiles = '';
	//    -> 1 byte H.264 level = 8-bit unsigned stream level
	level = 0; 
	//    -> 1 1/2 nibble reserved = 6-bit unsigned value set to 63
	reserved = 0; 
	//    -> 1/2 nibble NAL length = 2-bit length byte size type : 1 byte = 0 ; 2 bytes = 1 ; 4 bytes = 3
	NAL_length = 0; 
	//    -> 1 byte number of SPS = 8-bit unsigned total
	number_of_SPS = 0; 
	//    -> 2+ bytes SPS length = short unsigned length
	SPS_length = 0; 
	// -> + SPS NAL unit = hexdump
	SPS_NAL_unit = '';
	//    -> 1 byte number of PPS = 8-bit unsigned total
	number_of_PPS = 0; 
	//    -> 2+ bytes PPS length = short unsigned length
	PPS_length = 0; 
	//  -> + PPS NAL unit = hexdump
	PPS_NAL_unit = '';
}

class PaspBox extends MP4FullBox {
	type = "pasp";
	box.hSpacing = 0;
	box.vSpacing = 0;
}

class EsdsBox extends MP4FullBox {
	type = "esds";
}

class SampleEntry extends MP4Box {
	type = "";
	reserved = null;
	dataReferenceIndex = 0;
	// should be derived, so other props are codec-dependant
}

/**
 * Sample degradation priority box
 */
class StdpBox extends MP4FullBox {
	type = "stdp";
	entrySize = 2;
	columnNames = ['priority'];
	data = new Uint8Array(0);
}

/**
 * Time to Sample Box
 */
class SttsBox extends MP4FullBox {
	type = "stts";
	entrySize = 8;
	columnNames = ['sample_count', 'sample_delta'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Composition Time to Sample Box 
 */
class CttsBox extends MP4FullBox {
	type = "ctts";
	entrySize = 8;
	// for version 1, the second int32 is signed
	columnNames = ['sample_count', 'sample_offset'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Composition to Decode Box 
 */
class CslgBox extends MP4FullBox {
	type = "cslg";
	// for version 1, every prop is signed int64
	compositionToDTSShift = 0;
	leastDecodeToDisplayDelta = 0;
	greatestDecodeToDisplayDelta = 0;
	compositionStartTime = 0;
	compositionEndTime = 0;
}

/**
 * Sync Sample Box
 */
class StssBox extends MP4FullBox {
	type = "stss";
	entrySize = 4;
	columnNames = ['sample_number'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Shadow Sync Sample Box
 */
class StshBox extends MP4FullBox {
	type = "stsh";
	entrySize = 8;
	columnNames = ['shadowed_sample_number', 'sync_sample_number'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Independent and Disposable Samples Box 
 */
class SdtpBox extends MP4FullBox {
	type = "sdtp";
	entrySize = 1; // each value on 2 bits
	columnNames = ['is_leading', 'sample_depends_on', 'sample_is_depended_on', 'sample_has_redondancy'];
	data = new Uint8Array(0);
}

/**
 * Sample Size Box 
 */
class StszBox extends MP4FullBox {
	type = "stsz";
	entrySize = 4;
	columnNames = ['entry_size'];
	sampleSize = 0;
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Sample Size Box (compact = author-defined field size)
 */
class Stz2Box extends MP4FullBox {
	type = "stz2";
	entrySize = null;
	columnNames = ['entry_size'];
	reserved = 0;
	fieldSize = 0;
	sampleCount = 0;
	data = new Uint8Array(0);
}

/**
 * Sample to Chunk Box 
 */
class StscBox extends MP4FullBox {
	type = "stsc";
	entrySize = 12;
	columnNames = ['first_chunk', 'samples_per_chunk', 'sample_description_index'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Chunk Offset Box
 */
class StcoBox extends MP4FullBox {
	type = "stco";
	entrySize = 4;
	columnNames = ['chunk_offset'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Large Chunk Offset Box
 */
class Co64Box extends MP4FullBox {
	type = "co64";
	entrySize = 8;
	columnNames = ['chunk_offset'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Padding Bits
 */
class PadbBox extends MP4FullBox {
	type = "padb";
	sampleCount = 0;
	data = new Uint8Array(0);
}

/**
 * SubSample Information Box
 */
class SubsBox extends MP4FullBox {
	type = "subs";
	// entry size is variable : 14 or 16, depdending on version
	// (and there's a possibility to define subsample_count to 0, for a given sample_delta, so size falls to 8)
	entrySize = 8;
	columnNames = ['sample_delta', 'subsample_count'];
	entryCount = 0;
	data = new Uint8Array(0);
}

/**
 * Movie Extends Header Box 
 */
class MehdBox extends MP4FullBox {
	type = "mehd";
	fragmentDuration = 0;
}

/**
 * Track Extends Box
 */
class TrexBox extends MP4FullBox {
	type = "trex";
	trackID = 0;
	defaultSampleDescriptionIndex = 0;
	defaultSampleDuration = 0;
	defaultSampleSize = 0;
	defaultSampleFlags = 0;
}

/**
 * Movie Fragment Header Box
 */
class MfhdBox extends MP4FullBox {
	type = "mfhd";
	sequenceNumber = 0;
}

/**
 * Track Fragment Header Box
 * version is set to zero
 * all fields are optional
 */
class TfhdBox extends MP4FullBox {
	type = "tfhd";
	trackId = 0;
	// the following flags are optional (based on flags of the atom)
	baseDataOffset = 0;
	sampleDescriptionIndex = 0;
	defaultSampleDuration = 0;
	defaultSampleSize = 0;
	defaultSampleFlags = '';
}

/**
 * Track Fragment Run Box
 * version is set to zero
 */
class TrunBox extends MP4FullBox {
	type = "trun";
	sampleCount = 0;
	// the following fields are optional
	dataOffset = 0;
	firstSampleFlag = '';
	sampleDuration = 0;
	sampleSize = 0;
	sampleFlags = 0;
	sampleCompositionTimeOffsets = 0;
}

/**
 * Track Fragment Random Access Box 
 */
class TfraBox extends MP4FullBox {
	type = "tfra";
	trackID = 0;
	reserved = 0;
	length_size_of_tra_num = 0;
	length_size_of_trun_num = 0;
	length_size_of_sample_num = 0;
	number_of_entry = 0;
	data = new Uint8Array(0);
}

/**
 * Movie Fragment Random Access Offset Box
 */
class MfroBox extends MP4FullBox {
	type = "mfro";
	mfraSize = 0;
}

/**
 * Track Fragment Base Media Decode Time Box
 */
class TfdtBox extends MP4FullBox {
	type = "tfdt";
	baseMediaDecodeTime = 0;
}

/**
 * Track Extension Properties Box
 */
class TrepBox extends MP4FullBox {
	type = "trep";
	trackId = 0;
}

/**
 *  Copyright Box
 */
class CprtBox extends MP4FullBox {
	type = "cprt";
	pad = null;
	language = "";
	notice = "";
}








/**
 * Actual AV data chunk
 */
class MdatBox extends MP4Box { type = "mdat"; }

/** 
 * often found with a zero size
 */
class FreeBox extends MP4Box { type = "free"; }

/**
 * User data
 * (copyright, etc.)
 * @extends {ContainerBox<TrakBox|MvhdBox>}
 */
class UdtaBox extends ContainerBox { type = "udta"; }

/**
 * Edits Box
 * @extends {ContainerBox<TrakBox|MvhdBox>}
 */
class EdtsBox extends ContainerBox { type = "edts"; }

/**
 * Data Reference Box
 * @extends {ContainerBox<UrnBox|UrlBox>}
 * (declares source(s) of media in track, as url, urn, or both)
 */
class DrefBox extends ContainerBox {
	version = '';
	flags = new Uint8Array(3);
	type = "dref";
	entryCount = 0;
}

/**
 * Data Information Box
 * @extends {ContainerBox<DrefBox>}
 */
class DinfBox extends ContainerBox { type = "dinf"; }

/**
 * AVC format Descriptor
 * @extends {ContainerBox<AvcCBox|PaspBox>}
 */
class Avc1Box extends ContainerBox {
	type = "avc1";
	// int32 if not specified
	reserved = 0;	// int8[6]
	dataReferenceIndex = 0; // int16
	version = 0;			// int16
	revisionLevel = 0;		// int16
	vendor = 0;				
	temporalQuality = 0;
	spatialQuality = 0;
	width = 0				// int16
	height = 0				// int16
	horizontalResolution = 0;
	verticalResolution = 0;
	dataSize = 0;
	frameCount = 0;			// int16 (nbr of frames in a sample)
	videoEncodingNameSize = 0;// int8
	videoEncodingName = '';	// 31 bytes
	depth = 0;				// int116 (bit depth of a pixel)
	colorTableId = 0;		// int16
	
}

/**
 * Sample Descriptor (special) box (contains derived atoms from SampleEntry, most frequently avc1 type)
 * @extends {ContainerBox<Avc1Box>}
 */
class StsdBox extends ContainerBox {
	type = "stsd";
	entryCount = 0;
	// each entry is an instance of a class derived from SampleEntry 
	data = new Uint8Array(0);
}

/**
 * Sample Tables Box
 * @extends {ContainerBox<StsdBox|StdpBox|SttsBox|CttsBox|CslgBox|StssBox|StshBox|SdtpBox|StszBox|Stz2Box|StscBox|StcoBox|Co64Box>}
 */
class StblBox extends ContainerBox { type = "stbl"; }

/**
 * Media Info Box
 * @extends {ContainerBox<DinfBox|StblBox>}
 */
class MinfBox extends ContainerBox { type = "minf"; }

/**
 * Media Box
 * @extends {ContainerBox<MinfBox|MdhdBox|HdlrBox>}
 */
class MdiaBox extends ContainerBox { type = "mdia"; }

/**
 * Track Box
 * @extends {ContainerBox<MdiaBox|EdtsBox>}
 */
class TrakBox extends ContainerBox { type = "trak"; }

/** 
 * Movie Box
 * @extends {ContainerBox<TrakBox|MvhdBox>}
 */
class MoovBox extends ContainerBox { type = "moov"; }

/**
 * Track Fragment Box 
 */
class TrafBox extends ContainerBox { type = "traf"; }

/**
 * Movie Fragment Random AccessBox
 */
class MvexBox extends ContainerBox { type = "mvex"; }

/**
 * Movie Fragment Random AccessBox
 */
class MfraBox extends ContainerBox { type = "mfra"; }

/**
 * Movie Fragment Box
 * @extends {ContainerBox<TrafBox|MvexBox>}
 */
class MoofBox extends ContainerBox { type = "moof"; }



/**
 * File brands
 */
class FtypBox extends MP4Box {
	type = "ftyp";
	majorBrand = "";
	minorVersion = "";
  /** @type string[]*/ compatibleBrands = [];
}













// --- Registry and factory ---
const BoxRegistry = {
	ftyp: FtypBox,
	free: FreeBox,
	mdat: MdatBox,
	moov: MoovBox,
	mfra: MfraBox,
	moof: MoofBox,
	mvex: MvexBox,
	udta: UdtaBox,
	mvhd: MvhdBox,
	trak: TrakBox,
	tkhd: TkhdBox,
	tref: TrefBox,
	mdia: MdiaBox,
	mdhd: MdhdBox,
	hdlr: HdlrBox,
	minf: MinfBox,
	stbl: StblBox,
	stsd: StsdBox,
	avc1: Avc1Box,
	avcC: AvcCBox,
	pasp: PaspBox,
	esds: EsdsBox,
	stdp: StdpBox,
	stts: SttsBox,
	ctts: CttsBox,
	cslg: CslgBox,
	stss: StssBox,
	stsh: StshBox,
	sdtp: SdtpBox,
	stsz: StszBox,
	stz2: Stz2Box,
	stsc: StscBox,
	stco: StcoBox,
	co64: Co64Box,
	padb: PadbBox,
	subs: SubsBox,
	edts: EdtsBox,
	elst: ElstBox,
	dinf: DinfBox,
	"url ": UrlBox,
	"urn ": UrnBox,
	dref: DrefBox,
	btrt: BtrtBox,
	mehd: MehdBox,
	trex: TrexBox,
	mfhd: MfhdBox,
	traf: TrafBox,
	tfhd: TfhdBox,
	trun: TrunBox,
	tfra: TfraBox,
	mfro: MfroBox,
	tfdt: TfdtBox,
	trep: TrepBox,
	pdin: PdinBox,
};

/**
 * @param {keyof BoxRegistry} fourcc
 * @param {number} size
 * @param {number} pos
 */
//function createBox(fourcc, pos = 0, size = 0) {
//	const Ctor = BoxRegistry[fourcc] || MP4Box;
//	const box = new Ctor();
//	box.pos = pos;
//	box.size = size;
//	return box;
//}

//module.exports = {
//  MP4Box,
//  MP4FullBox,
//  MdatBox,
//  FreeBox,
//  PdinBox,
//  FtypBox,
//  MoovBox,
//  MvhdBox,
//  TrakBox,
//  TkhdBox,
//  TrefBox,
//  MdiaBox,
//  MdhdBox,
//  HdlrBox,
//  MinfBox,
//  StblBox,
//  SampleEntry,
//  BtrtBox,
//  StsdBox,
//  StdpBox,
//  SttsBox,
//  CttsBox,
//  CslgBox,
//  StssBox,
//  StshBox,
//  SdtpBox,
//  EdtsBox,
//  ElstBox,
//  DinfBox,
//  UrlBox,
//  UrnBox,
//  DrefBox,
//  StszBox,
//  Stz2Box,
//  StscBox,
//  StcoBox,
//  Co64Box,
//  PadbBox,
//  SubsBox,
//  MvexBox,
//  MehdBox,
//  TraxBox,
//  MoofBox,
//  MfhdBox,
//  TrafBox,
//  TfhdBox,
//  TrunBox,
//  MfraBox,
//  TfraBox,
//  MfroBox,
//  TfdtBox,
//  TrepBox,
//  UdtaBox,
//  CprtBox,
//  BoxRegistry,
//  createBox,
//};








const testFilename = 'Big_Buck_Bunny_360_10s_2MB.mp4';
const testFilePath = 'test_files/' + testFilename;

fetch(testFilePath).then(r => {
	r.blob().then(function(blob) {
		const file = new File([blob], testFilename);
		new Parser(file);
	});
});







class FileDesc {
	mp4Brand = new FtypBox();
}


/**
 * @class
 * @property {AtomParser} atomParser
 * @property {ArrayBuffer} fileBuffer
 * @property {ArrayBuffer} headerBuffer
 * @property {DataView} headerView
 * @property {{'brand' : FtypBox, 'header' : MoovBox}}  fileStructure
 * @property {FileDesc} fileDesc
 * @property {number} pos
 * @property {number} trackNbr
 */
class Parser {
	atomParser = new AtomParser(new DataView(new ArrayBuffer(0)));
	fileBuffer = new ArrayBuffer(0);
	headerBuffer = new ArrayBuffer(0);
	headerView = new DataView(new ArrayBuffer(0));
	fileStructure;
	fileDesc = new FileDesc();
	pos = 8;
	trackNbr = 0;
	//	depthDebug = 0;

	/**
	 * @constructor
	 * @param {File} file
	 */
	constructor(file) {
		this.readFile(file, this.init.bind(this));
	}

	/**
	 * @param {File} file
	 * @param {function} callback
	 */
	async readFile(file, callback) {
		const self = this;
		const reader = new FileReader();
		if (file instanceof File) {
			reader.onload = function(/** @type {ProgressEvent} */ evt) {
				if (typeof callback === 'function') /** @ts-ignore evt.target cant be null in that case */
					var result = callback.call(self, evt.target.result);
				else	/** @ts-ignore evt.target cant be null in that case */
					var result = evt.target.result;
			}
			reader.onprogress = function(loadEvent) {
				var progress = loadEvent.loaded / loadEvent.total;
			}

			reader.readAsArrayBuffer(file);
		}
		else console.error({ type: 'error', cause: 'The MP4Parser worker expects to receive a File instance' });
	}

	/**
	 * @method
	 * @param {ArrayBuffer} fileBuffer
	 */
	init(fileBuffer) {
		this.fileBuffer = fileBuffer;
		console.log(this.fileBuffer);

		this.setFileStructure();
		this.atomParser = new AtomParser(this.headerView);

		console.log('headerBuffer.byteLength', this.headerBuffer.byteLength);
		this.parseRecursive(this.headerBuffer.byteLength - 8, this.fileStructure.header);

		console.log(this.fileStructure);
	}

	/**
	 * @method
	 */
	setFileStructure() {
		const fileView = new Uint8Array(this.fileBuffer);

		// Find ftyp atom boundaries
		const [brandOffset, brandSize] = this.getMP4BrandBoundaries(fileView);
		// Find moov atom boundaries
		const moovOffset = bufferIndexOf(fileView, int8ArrayFromString('moov'));
		const moovSize = buffer8getUint32(moovOffset - 4, fileView);

		this.fileStructure = {
			brand: this.atomParser.ftyp('ftyp', fileView, brandOffset + 4, brandSize).newBox,
			header: new BoxRegistry.moov(0, this.headerBuffer.byteLength - 8)
		};

		this.headerBuffer = this.fileBuffer.slice(moovOffset - 4, moovOffset - 4 + moovSize);
		this.headerView = new DataView(this.headerBuffer);
	}

	/**
	 * @method
	 * @param {Uint8Array} fileView
	 */
	getMP4BrandBoundaries(fileView) {
		const brandOffset = bufferIndexOf(fileView, int8ArrayFromString('ftyp'));
		const brandSize = buffer8getUint32(brandOffset - 4, fileView);
		return [brandOffset, brandSize];
	}

	/**
	 * @method
	 * @param {number} blockSize
	 * @param {MP4BoxType} currentBlock
	 */
	parseRecursive(blockSize, currentBlock) {
		//		if (this.depthDebug > 1) return;

		const originalPos = this.pos;
		console.log('originalPos', originalPos, 'atomSize', blockSize);

		while (this.pos < originalPos + blockSize) {
			let atomSize = this.headerView.getUint32(this.pos) - constants.stdAtomHeaderSize;
			this.pos += 4;
			const atomType = /** @type {keyof BoxRegistry} */ stringFromUint32(this.headerView, this.pos);
			this.pos += 4;

			// see MP4Box typedef => if size === 1
			if (atomSize === 1) {
				atomSize = getUint64(this.headerView, this.pos) - constants.largeAtomHeaderSize;
				this.pos += 8;
			}

			if (atomType in this.atomParser) {
				const parsingRes = this.atomParser[atomType](atomType, this.pos, atomSize, currentBlock);
				if (!parsingRes.isLeaf) {
					//					this.depthDebug++;
					const cachedPos = this.pos;
					this.parseRecursive(atomSize, parsingRes.newBox);
					//					this.depthDebug--;
					this.pos = cachedPos;
				}
			}

			this.pos += atomSize;

		}
	}
}

class ParsingResult {
	constructor(isLeaf = false, newBox) {
		/** @type {boolean} */ this.isLeaf = isLeaf;
		/** @type {MP4Box} */ this.newBox = newBox;
	}
}

/**
 * @class AtomParser
 * @property {DataView} headerView
 */
class AtomParser {
	headerView;

	/**
	 * @constructor
	 * @param {DataView} headerView
	 */
	constructor(headerView) {
		this.headerView = headerView;
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} type
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MP4Box} parentAtom
	 * @return {ParsingResult}
	 */
	ftyp(fourcc, fileView, currentPos, size) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		box.majorBrand = stringFromUint32(fileView, offset);
		offset += 4;
		box.minorVersion = stringFromUint32(fileView, offset);
		offset += 4;
		for (offset; offset < currentPos + size; offset += 4)
			box.compatibleBrands.push(stringFromUint32(fileView, offset));
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MP4Box} parentAtom
	 * @return {ParsingResult}
	 */
	moov(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MoovBox} parentAtom
	 * @return {ParsingResult}
	 */
	mvhd(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		if (box.version === 1) {
			box.creationTime = getUint64(this.headerView, offset);
			offset += 8;
			box.modificationTime = getUint64(this.headerView, offset);
			offset += 8;
			box.timeScale = this.headerView.getUint32(offset);
			offset += 4;
			box.duration = getUint64(this.headerView, offset);
			offset += 8;
		}
		else {
			box.creationTime = this.headerView.getUint32(offset);
			offset += 4;
			box.modificationTime = this.headerView.getUint32(offset);
			offset += 4;
			box.timeScale = this.headerView.getUint32(offset);
			offset += 4;
			box.duration = this.headerView.getUint32(offset);
			offset += 4;
		}
		box.frameRate[0] = this.headerView.getUint32(offset) & 0xf0 >> 4;
		box.frameRate[1] = this.headerView.getUint32(offset) & 0x0f;
		offset += 4;
		box.volume = this.headerView.getUint16(offset);
//		offset += 2;
//		box.reserved1 = null;
//		offset += 2;
//		box.reserved2 = null;
//		offset += 8;
		offset += 12;
		const matrix = []
		let cursor = 0;
		for (cursor; cursor < 4 * 9; cursor += 4)
			matrix.push(this.headerView.getUint32(offset + cursor));
		box.matrix.set(matrix, 0);
		offset += cursor;
//		box.preDefined = 0;
		offset += 24;
		box.nextTrackID = this.headerView.getUint32(offset);
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MoovBox} parentAtom
	 * @return {ParsingResult}
	 */
	udta(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MoovBox} parentAtom
	 * @return {ParsingResult}
	 */
	trak(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {TrakBox} parentAtom
	 * @return {ParsingResult}
	 */
	tkhd(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		if (box.version === 1) {
			box.creationTime = getUint64(this.headerView, offset);
			offset += 8;
			box.modificationTime = getUint64(this.headerView, offset);
			offset += 8;
		}
		else {
			box.creationTime = this.headerView.getUint32(offset);
			offset += 4;
			box.modificationTime = this.headerView.getUint32(offset);
			offset += 4;
		}
		box.trackId = this.headerView.getUint32(offset);
		// reserved 4
		offset += 8;
		if (box.version === 1) {
			box.duration = this.headerView.getUint64(offset);
			// reserved 8
			offset += 16;
		}
		else {
			box.duration = this.headerView.getUint32(offset);
			// reserved 8
			offset += 12;
		}
		box.videoLayer = this.headerView.getUint16(offset);
		offset += 2;
		box.alternate = this.headerView.getUint16(offset);
		offset += 2;
		box.volume = this.headerView.getUint16(offset);
		offset += 2;
		// reserved 2
		offset += 2;
		const matrix = []
		let cursor = 0;
		for (cursor; cursor < 4 * 9; cursor += 4)
			matrix.push(this.headerView.getUint32(offset + cursor));
		box.matrix.set(matrix, 0);
		offset += cursor;
		box.width[0] = this.headerView.getUint16(offset);
		box.width[1] = this.headerView.getUint16(offset + 2);
		offset += 4;
		box.height[0] = this.headerView.getUint16(offset);
		box.height[1] = this.headerView.getUint16(offset + 2);
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {TrakBox} parentAtom
	 * @return {ParsingResult}
	 */
	edts(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {EdtsBox} parentAtom
	 * @return {ParsingResult}
	 */
	elst(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer, offset, offset + box.entryCount * box.entrySize);
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {TrakBox} parentAtom
	 * @return {ParsingResult}
	 */
	mdia(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MdiaBox} parentAtom
	 * @return {ParsingResult}
	 */
	mdhd(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MdiaBox} parentAtom
	 * @return {ParsingResult}
	 */
	hdlr(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		// pre-defined 4
		offset += 4;
		box.handlerType = stringFromBuffer(
			new Uint8Array(this.headerView.buffer.slice(offset, offset + 4))
		);
		// reserved 12
		offset += 16;
		box.name = getNullTerminatedString(this.headerView, offset);
		
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MdiaBox} parentAtom
	 * @return {ParsingResult}
	 */
	minf(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MinfBox} parentAtom
	 * @return {ParsingResult}
	 */
	dinf(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {DinfBox} parentAtom
	 * @return {ParsingResult}
	 */
	dref(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			if (this[nextType])
				this[nextType](nextType, offset - 4, nextSize, box);
			offset += nextSize;
		}
		
		// isLeaf = true, cause we've already parsed the children (table contains max 2 values)
		return new ParsingResult(true, box);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {DrefBox} parentAtom
	 * @return undefined
	 */
	['urn '](fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		if (size === 12)	// empty entry
			return;
		box.name = getNullTerminatedString(this.headerView, offset);
		offset += box.name.length;
		box.location = getNullTerminatedString(this.headerView, offset);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {DrefBox} parentAtom
	 * @return undefined
	 */
	['url '](fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		if (size === 12)	// empty entry
			return;
		box.location = getNullTerminatedString(this.headerView, offset);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MinfBox} parentAtom
	 * @return {ParsingResult}
	 */
	stbl(fourcc, currentPos, size, parentAtom) {
		let offset = currentPos;
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		return new ParsingResult(false, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stts(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	ctts(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stss(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stsd(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		// Seems compatibility with Apple mov format : 
		// - apple mov : 2 first int32 are size & formatId
		// - mp4 ISO: 2 first int32 are considered size & atomType
		// (and, for example, avcC & pasp are always included in avc1, without avc1 being described as a table by apple.)
		const nextSize = this.headerView.getUint32(offset);
		offset += 4;
		const nextType = stringFromUint32(this.headerView, offset);
		offset += 4;
		if (this[nextType])
			this[nextType](nextType, offset, nextSize, box);
//		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		
		// isLeaf = true, see above com
		return new ParsingResult(true, box);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return {ParsingResult}
	 */
	avc1(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
//		reserved = 0;	// int8[6]
		offset += 6;
		dataReferenceIndex = this.headerView.getUint16(offset);
		offset += 2;
		version = this.headerView.getUint16(offset);
		offset += 2;
		revisionLevel = this.headerView.getUint16(offset);
		offset += 2;
		vendor = this.headerView.getUint32(offset);	
		offset += 4;
		temporalQuality = this.headerView.getUint32(offset);
		offset += 4;
		spatialQuality = this.headerView.getUint32(offset);
		offset += 4;
		width = this.headerView.getUint16(offset);
		offset += 2;
		height = this.headerView.getUint16(offset);
		offset += 2;
		horizontalResolution = this.headerView.getUint32(offset);
		offset += 4;
		verticalResolution = this.headerView.getUint32(offset);
		offset += 4;
		dataSize = this.headerView.getUint32(offset);
		offset += 4;
		frameCount = this.headerView.getUint16(offset);
		offset += 2;
		videoEncodingNameSize = this.headerView.getUint8(offset);
		offset += 1;
		videoEncodingName = getNullTerminatedString(this.headerView, offset);
		offset += 31;
		depth = this.headerView.getUint16(offset);
		offset += 2;
		colorTableId = this.headerView.getUint16(offset);
		offset += 2;
		
		while(offset < currentPos + size - 8) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			offset += 4;
			if (this[nextType])
				this[nextType](nextType, offset, nextSize, box);
			offset += nextSize - 8;
		}
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {Avc1Box} parentAtom
	 * @return undefined
	 */
	avcC(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
		//	-> 1 byte version = 8-bit hex version  (current = 1)
		box.version = this.headerView.getUint8(offset); 
		offset += 1;
		//    -> 1 byte H.264 profile = 8-bit unsigned stream profile
		box.profile = zeroFill(this.headerBuffer.getUint8(offset).toString(16), 2); 	// Baseline : 42, Main : 4D, High : 64  https://wiki.whatwg.org/wiki/video_type_parameters#Video_Codecs_3
		box.profile_HR = this.profileTable[box.profile]; 	
		offset += 1;
		//    -> 1 byte H.264 compatible profiles = 8-bit hex flags
		box.compatible_profiles = zeroFill(this.headerView.getUint8(offset).toString(16), 2);
		offset += 1;
		//    -> 1 byte H.264 level = 8-bit unsigned stream level
		box.level = this.headerView.getUint8(offset); 
		offset += 1;
		//    -> 1 1/2 nibble reserved = 6-bit unsigned value set to 63
		box.reserved = this.headerView.getUint8(offset) >>> 6; 
		//    -> 1/2 nibble NAL length = 2-bit length byte size type : 1 byte = 0 ; 2 bytes = 1 ; 4 bytes = 3
		box.NAL_length = this.headerView.getUint8(offset) & 0x03; 
		offset += 1;
		//    -> 1 byte number of SPS = 8-bit unsigned total
		box.number_of_SPS = this.headerView.getUint8(offset); 
		offset += 1;
		//    -> 2+ bytes SPS length = short unsigned length
		box.SPS_length = this.headerView.getUint16(offset); 
		offset += 2;
		// -> + SPS NAL unit = hexdump
		box.SPS_NAL_unit = '0x';
		for (var i = 0, l = box.SPS_length; i < l; i++) {
			box.SPS_NAL_unit += zeroFill(this.headerView.getUint8(offset).toString(16), 2);
			offset += 1;
		}
		//    -> 1 byte number of PPS = 8-bit unsigned total
		box.number_of_PPS = this.headerView.getUint8(offset); 
		offset += 1;
		//    -> 2+ bytes PPS length = short unsigned length
		box.PPS_length = this.headerView.getUint16(offset); 
		offset += 2;
		//  -> + PPS NAL unit = hexdump
		box.PPS_NAL_unit = '0x';
		for (var i = 0, l = box.PPS_length; i < l; i++) {
			box.PPS_NAL_unit += zeroFill(this.headerView.getUint8(offset).toString(16), 2);
			offset += 1;
		}
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {Avc1Box} parentAtom
	 * @return undefined
	 */
	pasp(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		box.hSpacing = this.headerView.getUint32(offset);
		box.vSpacing = this.headerView.getUint32(offset);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {Avc1Box} parentAtom
	 * @return undefined
	 */
	esds(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		box.ES_descriptor_type = '0x' + this.headerView.getUint8(offset).toString(16); // 0x03
		offset += 1;
	
		//3 bytes optional extended descriptor type tag string
		let tag_string;
		if ([0x80, 0x81, 0xFE].indexOf(this.headerView.getUint8(offset)) !== -1) {
			tag_string = this.headerView.getUint32(offset);
			offset += 3;
		}
		
		// length remaining after length_byte :  as found on real cases : length includes 0x04, 0x05 and 0x06 ES_Descriptor (should exclude trailing descriptors)
		box.descriptor_length = this.headerView.getUint8(offset);
		offset += 1;
		
		box.ES_ID = this.headerView.getUint16(offset);
		offset += 2;
		
		const tags = this.headerView.getUint8(offset);
		box.stream_dependance_flag = tags & 0x80;
		box.url_flag = tags & 0x40;
		box.stream_priority = (tags << 3) >>> 3;
		offset += 1;
		
		// ISO_IEC_14496-1_1998 p24 (pdf p47)
		// if (URL_Flag)
		// 		bit(8) URLstring[length-3-(streamDependencFlag*2)];
		if (box.url_flag) {
			offset += box.descriptor_length - 3 - box.stream_dependance_flag * 2;
		}
		
		blockContent['ES_descriptor'] = this.parse_ES_descriptor(blockContent['descriptor_length']) 	// -3 -5
		
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stsz(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.sampleSize = this.headerView.getUint32(offset);
		offset += 4;
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stsc(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	stco(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	co64(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		box.data = new Uint8Array(this.headerView.buffer.slice(offset, offset + box.entryCount * box.entrySize));
		return new ParsingResult(true, box);
	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	//	stsh(fourcc, currentPos, size, parentAtom) {
	//		let offset = currentPos;
	//		const box = new BoxRegistry[fourcc](currentPos, size);
	//		parentAtom.children.push(box);
	//		return new ParsingResult(true, box);
	//	}

	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @return {ParsingResult}
	 */
	//	stdp(fourcc, currentPos, size, parentAtom) {
	//		let offset = currentPos;
	//		const box = new BoxRegistry[fourcc](currentPos, size);
	//		parentAtom.children.push(box);
	//		return new ParsingResult(true, box);
	//	}
	
	tfhd(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		// We must parse the flags for this atom
		offset -= 3;
		const flags = this.headerView.getUint32(offset) >> 8;
		const computedFlags = {
			base_data_offset_present : flags & 0x000001,
			sample_description_index_present : flags & 0x000002,
			default_sample_duration_present : flags & 0x000008,
			default_sample_size_present : flags & 0x000010,
			default_sample_flags_present : flags & 0x000020,
			duration_is_empty : flags & 0x010000,
			default_base_is_moof : flags & 0x020000
		};
		offset += 3;
		if (computedFlags.base_data_offset_present) {
			box.baseDataOffset = getUint64(this.headerView, offset);
			offset += 8;
		}
		if (computedFlags.sample_description_index_present) {
			box.sampleDescriptionIndex = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.default_sample_duration_present) {
			box.defaultSampleDuration = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.default_sample_siz_presente) {
			box.defaultSampleSize = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.default_sample_flags_present) {
			box.defaultSampleFlags = '0x' + this.headerView.getUint32(offset).toString(16);
			offset += 4;
		}
	}
	
	tfdt(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		if (box.version === 0) {
			blockContent.baseMediaDecodeTime = this.headerView.getUint32(offset);
			this.pos += 4;
		}
		else if (box.version === 1) {
			blockContent.baseMediaDecodeTime = getUint64(this.headerView, offset);
		}
	}
	
	trun(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		// We must parse the flags for this atom
		offset -= 3;
		const flags = this.headerView.getUint32(offset) >> 8;
		const computedFlags = {
			data_offset_present : (flags & 0x000001) > 0,
			first_sample_flags_present : (flags & 0x000004) > 0,
			sample_duration_present : (flags & 0x000100) > 0,
			sample_size_present : (flags & 0x000200) > 0,
			sample_flags_present : (flags & 0x000400) > 0,
			sample_composition_time_offsets_present : (flags & 0x000800) > 0
		};
		offset += 3;
		
		if (computedFlags.data_offset_present) {
			box.dataOffset = this.headerView.getInt32(offset);
			offset += 4;
		}
		if (computedFlags.first_sample_flags_present) {
			box.firstSampleFlags = '0x' + this.headerView.getUint32(offset).toString(16);
			offset += 4;
		}
		if (computedFlags.sample_duration_present) {
			box.sampleDuration = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.sample_size_present) {
			box.sampleSize = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.sample_flags_present) {
			box.sampleFlags = this.headerView.getUint32(offset);
			offset += 4;
		}
		if (computedFlags.sample_composition_time_offsets_present) {
			if (box.version == 1)
				box.sampleCompositionTimeOffsets = this.headerView.getUint32(offset);
			else
				box.sampleCompositionTimeOffsets = this.headerView.getInt32(offset);
		}
	}
	
	
	
	
	
	
	
	
	
	
	

	versionAndFlags(currentPos, box) {
		box.version = this.headerView.getUint8(currentPos);
		box.flags.set([
			this.headerView.getUint8(currentPos + 1),
			this.headerView.getUint8(currentPos + 2),
			this.headerView.getUint8(currentPos + 3),
		], 0);
		return currentPos + 4;
	}
	
	
	
	
	
	
	
	
	
	codecTable = {
		avc1 : 'H264', 
		mp4v : 'MPEG4 Visual',
		encv : 'ISO/IEC 14496-12 or 3GPP',
		s263 : '3GPP H.263v1'
	}
	
	profileTable = {
		'42' : 'Baseline', 
		'4d' : 'Main',
		'64' : 'High',
	}
}


