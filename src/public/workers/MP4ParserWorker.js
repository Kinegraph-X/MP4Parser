
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
 * @param {number|null} length
 */
const stringFromBuffer = function(buffer, start = 0, length = null) {
	let endPos;
	if (length === 0) {
		return '';
	}
	if (length !== null)
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
 * @param {number} max
 */
const getNullTerminatedString = function(buf, pos, max = 0) {
	const strAsArray = [];
	let i = 0, getter, res = 0;
	
	if (buf instanceof DataView)
		getter = (pos) => buf.getUint8(pos);
	else
		getter = (pos) => buf[pos];
		
	while ((res = getter(pos + i)) !== 0 && (max && i < max)) {
		strAsArray.push(res);
		i++;
	}
	return String.fromCharCode(...strAsArray);
}

function zeroFill(number, size) {
	if (typeof number === 'number')
		number = number.toString();
	else if (typeof number !== 'string')
		return;
  while (number.length < size) number = "0" + number;
  return number;
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
 * 
 */
class ContainerFullBox extends MP4FullBox {
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

class SampleEntry extends ContainerBox {
	type = "";
	reserved = null; // (int8[6])
	dataReferenceIndex = 0;
	// should be derived, so other props are codec-dependant
}

/**
 * Audio Sample Description Box
 */
class mp4aBox extends SampleEntry {
	type = "mp4a";
	version = 0; 		// (Uint16);
	revisionLevel = 0;	// (Uint16);
	vendor = 0;  		// (Uint32);
	channelCount = 0; 	//  (Uint16);
	sampleSize = 0;  	// (Uint16);
	compressionId = 0;  // (Uint16); // must be set to 0 for version 0 sound descriptions, set to –2, the sound track uses redefined sample tables optimized for compressed audio : sample-to-chunk and chunk offset atoms point to compressed frames
	// a version 1 sound description is used and the compression ID field is set to –2. The samplesPerPacket field and the bytesPerSample field are not necessarily meaningful for variable bit rate audio
	packetSize = 0;  	// (Uint16);
	sampleRate = 0;  	// (Uint16);
}

/**
 * Video Sample Description Box (Never found in real life)
 */
class mp4vBox extends SampleEntry {
	type = "mp4v";
//	version = 0; 		// (Uint16);
//	revisionLevel = 0;	// (Uint16);
//	vendor = 0;  		// (Uint32);
//	channelCount = 0; 	//  (Uint16);
//	sampleSize = 0;  	// (Uint16);
//	compressionId = 0;  // (Uint16); // must be set to 0 for version 0 sound descriptions, set to –2, the sound track uses redefined sample tables optimized for compressed audio : sample-to-chunk and chunk offset atoms point to compressed frames
//	// a version 1 sound description is used and the compression ID field is set to –2. The samplesPerPacket field and the bytesPerSample field are not necessarily meaningful for variable bit rate audio
//	packetSize = 0;  	// (Uint16);
//	sampleRate = 0;  	// (Uint16);
}


/**
 * BaseDescriptor
 */
class BaseDescriptor {
	type;
	size;
	constructor (tag = 0, size = 0) {
		this.type = tag;
		this.size = size;
	}
}

/**
 * @template {BaseDescriptor} D
 */
class DescriptorContainer extends BaseDescriptor {
	/** @type {D[]} */
	children = [];
}

/**
 * ESDescriptor (in this implementation, is handled directly in esds atom)
 */
class ESDescriptor extends DescriptorContainer {}
class DecoderConfigDescriptor extends DescriptorContainer {}
class SLConfigDescriptor extends BaseDescriptor {}
class DecoderSpecificConfigDescriptor extends BaseDescriptor {}


/**
 * VideoSample Description Extension (contained by derived Sample Description Box avc1)
 */
class AvcCBox extends MP4Box {
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
	hSpacing = 0;
	vSpacing = 0;
}

/**
 * ES Descriptor Box (contained by an esds box)
 */
class ESDescriptorBox extends MP4Box {
	type = "ESDescriptor";
	
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
 *  Data Box
 */
class DataBox extends MP4Box {
	type = "data";
	entryCount = 0;
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
 * Google Host Header Box
 * @extends {ContainerBox<DataBox>}
 */
class GshhBox extends ContainerBox {
	type = "gshh";
}

/**
 * Atom List Box
 * @extends {ContainerBox<MP4Box>}
 */
class IlstBox extends ContainerBox {
	type = "ilst";
}

/**
 *  Metadata Box
 * @extends {ContainerFullBox<HdlrBox|IlstBox>}
 */
class MetaBox extends ContainerFullBox {
	type = "meta";
}

/**
 * User data
 * (copyright, etc.)
 * @extends {ContainerBox<MetaBox|CprtBox>}
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
class DrefBox extends ContainerFullBox {
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
	// uint32 if not specified
	reserved = 0;			// int8[6]
	dataReferenceIndex = 0; // uint16
	version = 0;			// uint16
	revisionLevel = 0;		// uint16
	vendor = 0;				
	temporalQuality = 0;
	spatialQuality = 0;
	width = 0				// uint16
	height = 0				// uint16
	horizontalResolution = 0;
	verticalResolution = 0;
	dataSize = 0;
	frameCount = 0;			// uint16 (nbr of frames in a sample)
	compressorNameSize = 0;// uint8
	compressorName = '';	// 31 bytes
	depth = 0;				// uint116 (bit depth of a pixel)
	colorTableId = 0;		// uint16
}

/**
 * ES Descriptor container box
 * @extends {ContainerBox<ESDescriptorBox>}
 */
class EsdsBox extends ContainerFullBox {
	type = 'esds';
	ES_descriptor_type = ''; // 0x03
	// length remaining after length_byte :  as found on real cases : length includes 0x04, 0x05 and 0x06 ES_Descriptor (should exclude trailing descriptors)
	descriptor_length = 0;			// uint8
	ES_ID = 0;						// uint16
	stream_dependance_flag = 0;		// uint8
	url_flag = 0;					// uint8
	stream_priority = 0;			// uint8 ?
}

/**
 * Sample Descriptor (special) box (contains derived atoms from SampleEntry, most frequently avc1 type)
 * @extends {ContainerBox<SampleEntry>}
 */
class StsdBox extends ContainerFullBox {
	type = "stsd";
	entryCount = 0;
	// each entry is an instance of a class derived from SampleEntry 
//	data = new Uint8Array(0);
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
	mp4a: mp4aBox,
	mp4v: mp4vBox,
//	hint: HintBox,
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
	gshh: GshhBox,
	meta: MetaBox,
	ilst: IlstBox,
	data: DataBox
};

/**
 * @param {keyof BoxRegistry} fourcc
 * @param {number} size
 * @param {number} pos
 */
function createBox(fourcc, pos = 0, size = 0) {
	const Ctor = BoxRegistry[fourcc] || MP4Box;
	const box = new Ctor();
	box.pos = pos;
	box.size = size;
	return box;
}

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


class ParserCtx {
	handlerType = '';
	trackId = 0;
	constructor(handlerType = "", trackId = 0) {
		this.handlerType = handlerType;
		this.trackId = trackId;
	}
}

class ParserWorkTask {
	/** @type {MP4Box} */ parent;
	/** @type {ParserCtx} */ parserCtx;
	start = 0;
	end = 0;
	constructor(parent, pos, end, parserCtx = new ParserCtx()) {
		this.parent = parent;
		this.start = pos;
		this.end = end;
		this.parserCtx = parserCtx;
	}
}

class FastAccessNode {
	/** @type {MP4Box} */ box;
	/** @type {ParserCtx} */ ctx;
	
	/**
	 * @constructor
	 * @param {MP4Box} box
	 * @param {ParserCtx} ctx
	 */
	constructor(box, ctx) {
		this.box = box;
		this.ctx = ctx;
	}
}

/**
 * @type {Map<string, FastAccessNode[]>}
 */
const fastAccessMap = new Map();
/**
 * @param {string} atomType
 * @param {string} handlerType
 */
fastAccessMap.findFromHandlerType = function(atomType, handlerType) {
	return this.get(atomType).find(node => node.ctx.handlerType === handlerType);
}
/**
 * @param {string} atomType
 * @param {number} trackId
 */
fastAccessMap.findFromTrackId = function(atomType, trackId) {
	return this.get(atomType).find(node => node.ctx.trackId === trackId);
}




//const testFilename = 'Big_Buck_Bunny_360_10s_2MB.mp4';
const testFilename = 'mp4-example-video-download-hd-1280x720.mp4';
const testFilePath = 'test_files/' + testFilename;

//fetch(testFilePath).then(r => {
//	r.blob().then(function(blob) {
//		const file = new File([blob], testFilename);
//		new Parser(blob);
//	});
//});















class FileDesc {
	mp4Brand = new FtypBox();
}



class Parser {
	atomParser = new AtomParser(new DataView(new ArrayBuffer(0)));
	headerBuffer = new ArrayBuffer(0);
	headerView = new DataView(new ArrayBuffer(0));
	fileStructure;
	fileDesc = new FileDesc();
	pos = constants.stdAtomHeaderSize;
	trackNbr = 0;
	depthDebug = 0;

	/**
	 * @constructor
	 */
	constructor() {
		
	}
	
	/**
	 * @param {string} action
	 * @param {object} [params]
	 */
	handleMessage(action, params) {
		if (typeof action !== 'undefined') {
			return this[action](params);
		}
		return {type : 'error', cause : 'MP4Parser has no such action: ' + action};
	}

	/**
	 * @param {File} file
	 * @param {function} [callback]
	 */
	async readFile(file, callback) {
		const reader = new FileReader();
		if (file instanceof Blob) {
			const fileContent = await file.arrayBuffer();
			
			if (typeof callback === 'function')
				callback(fileContent);
			else
				var result = fileContent;
		}
		else
			console.error({ type: 'error', cause: 'The MP4Parser worker expects to receive a File instance' });
	}
	
	/**
	 * Main entry-point of the parser
	 * @param {File} file
	 */
	async init(file) {
		console.log(file);
		
		// Try to find the header
		const callback = this.identifyHeaderBoundaries.bind(this);
		const fileChunkSize = Math.pow(10, 6);
		let startOfFileChunk,
			isLargeFile = false;
		if (file.size > fileChunkSize) {
			isLargeFile = true;
			startOfFileChunk = file.slice(0, fileChunkSize);
		}
		else {
			startOfFileChunk = file;
		}
		
		
		await this.readFile(startOfFileChunk, callback);
		// header not found at beginning, try at the end
		if (isLargeFile && !this.headerView.byteLength) {
			const endOfFileChunk = file.slice(-fileChunkSize, 0);
			await this.readFile(endOfFileChunk, callback);
			if (!this.headerView.byteLength) {
				return {type : 'error', cause : 'MP4 file header not found'};
			}
			else {
				return {type : 'event', id : 'initSuccess'};
			}
		}
		else {
			return {type : 'event', id : 'initSuccess'};
		}
	}

	/**
	 * @method
	 */
	logInitResult() {
		console.log('headerBuffer.byteLength', this.headerBuffer.byteLength);
		console.log(this.fileStructure);
		console.log(fastAccessMap);
	}
	
	/**
	 * @method
	 */
	parse() {
		this.parseIterativeWorkStack(this.fileStructure.header);
		this.logInitResult();
		if (fastAccessMap.size > 0)
			return {type : 'event', id : 'parseSuccess'};
		else
			return {type : 'error', cause : 'unkown parse error'};
	}
	
	/**
	 * @method
	 * @param {ArrayBuffer} fileBuffer
	 */
	identifyHeaderBoundaries(fileBuffer) {
		this.setFileStructure(fileBuffer);
		if (this.headerView.byteLength) {
			this.atomParser = new AtomParser(this.headerView);
		}
	}

	/**
	 * @method
	 * @param {ArrayBuffer} fileBuffer
	 */
	setFileStructure(fileBuffer) {
		const fileView = new Uint8Array(fileBuffer);

		// Find ftyp atom boundaries
		const [brandOffset, brandSize] = this.getMP4BrandBoundaries(fileView);
		if (brandOffset === -1) return;
		// Find moov atom boundaries
		const moovOffset = bufferIndexOf(fileView, int8ArrayFromString('moov'));
		if (moovOffset === -1) return;
		const moovSize = buffer8getUint32(moovOffset - 4, fileView);

		this.headerBuffer = fileBuffer.slice(moovOffset - 4, moovOffset - 4 + moovSize);
		this.headerView = new DataView(this.headerBuffer);
		
		this.fileStructure = {
			brand: this.atomParser.ftyp('ftyp', fileView, brandOffset + 4, brandSize).newBox,
			header: new BoxRegistry.moov(0, this.headerBuffer.byteLength)
		};
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

//	/**
//	 * @method
//	 * @param {number} boxSize
//	 * @param {MP4BoxType} currentBox
//	 * @return undefined
//	 */
//	parseRecursive(pos, boxSize, currentBox) {
//		const originalPos = pos;
//		let isLarge = false, parsingRes = null;
//
//		while (pos < originalPos + boxSize) {
//			isLarge = false;
//			let atomSize = this.headerView.getUint32(pos);
//			const atomType = /** @type {keyof BoxRegistry} */ stringFromUint32(this.headerView, pos + 4);
//			
//			// see MP4Box typedef => if size === 1
//			if (atomSize === 1) {
//				atomSize = getUint64(this.headerView, this.pos);
//				isLarge = true;
//			}
//
//			if (atomType in this.atomParser) {
//				parsingRes = this.atomParser.newBox(atomType, pos, atomSize, currentBox, isLarge);
//				if (!parsingRes.isLeaf && atomSize > constants.stdAtomHeaderSize) {
//					this.parseRecursive(pos + constants.stdAtomHeaderSize, atomSize - constants.stdAtomHeaderSize, parsingRes.newBox);
//				}
//			}
//			pos += atomSize;
//		}
//	}
//	
//	/**
//	 * @method
//	 * @param {MoovBox} rootNode
//	 * @return undefined
//	 */
//	parseWithParentBacktrack(rootNode) {
//		const hierarchyStack = [];
//		let isLarge = false,
//			parentNode = rootNode,
//			currentNode = rootNode,
//			pos = 8,
//			atomType = '',
//			atomSize = 0,
//			/** @type {ParsingResult|null} */ parsingResult;
//		hierarchyStack.push(rootNode);
//		
//		while (pos < rootNode.size) {
//			parsingResult = null;
//			isLarge = false;
//			atomSize = this.headerView.getUint32(pos);
//			atomType = /** @type {keyof BoxRegistry} */ stringFromUint32(this.headerView, pos + 4);
//			
//			// see MP4Box typedef => if size === 1
//			if (atomSize === 1) {
//				atomSize = getUint64(this.headerView, this.pos);
//				isLarge = true;
//			}
//			
//			if (atomType in this.atomParser) {
//				parsingResult = this.atomParser.newBox(atomType, pos, atomSize, parentNode, isLarge);
//				currentNode = parsingResult.newBox;
//			}
//			else {	// let's say unknown atoms also have boxes
//				currentNode = createBox(atomType, pos, atomSize);
//				parentNode.children.push(currentNode);
//			}
//			
//			// Walk
//			if (((parsingResult && !parsingResult.isLeaf) || currentNode instanceof ContainerBox) 
//					&& atomSize > constants.stdAtomHeaderSize) {
//				pos += 8;
//				
//				hierarchyStack.push(currentNode);
//				parentNode = currentNode;
//			}
//			else {
//				pos += atomSize;
//				// Before depth 2, this test fails (parentNode.pos + parentNode.size === pos)
//				// But deeper, the loop leaves the stack empty => enforce parentNode not being undefined,
//				// while ensuring minimal stack size
//				while(hierarchyStack.length > 1 && parentNode.pos + parentNode.size === pos) {
//					parentNode = hierarchyStack.pop();
//				}
//			}
//		}
//	}
	
	/**
	 * @method
	 * @param {MoovBox} rootNode
	 * @return undefined
	 */
	parseIterativeWorkStack(rootNode) {
		const workStack = [];
		let isLarge = false,
			atomType = '',
			atomSize = 0,
			/** @type {ParsingResult|null} */ parsingResult,
			/** @type {MP4Box} */ node;
		workStack.push(new ParserWorkTask(rootNode, 8, rootNode.size));
	
		while (workStack.length > 0) {
			const task = workStack.pop();
			let pos = task.start;
			let end = task.end;
	
			while (pos < end) {
				node = null;
				parsingResult = null;
				isLarge = false;
				atomSize = this.headerView.getUint32(pos);
				atomType = stringFromUint32(this.headerView, pos + 4);
				
				// see MP4Box typedef => if size === 1
				if (atomSize === 1) {
					atomSize = getUint64(this.headerView, this.pos);
					isLarge = true;
				}
				
				if (atomType in this.atomParser) {
					if (atomSize <= constants.stdAtomHeaderSize) {
						console.warn('MP4Parser:  malformed atom size for atom', atomType);
						pos += constants.stdAtomHeaderSize;
						continue;
					}
					if (atomType === "stsd") {
		                parsingResult = this.atomParser.stsd(atomType, pos + constants.stdAtomHeaderSize, atomSize - constants.stdAtomHeaderSize, task.parent, task.parserCtx.handlerType);
		            }
		            else {
						parsingResult = this.atomParser.newBox(atomType, pos, atomSize, task.parent, isLarge);
					}
					node = parsingResult.newBox;
				}
//				else {	// unknown atoms don't have boxes (they wouldn' have a name)
//					node = createBox(atomType, pos, atomSize);
//					task.parent.children.push(node);
//				}
				
				// Ctx for sample description & fast access map
				if (atomType === "tkhd") {
					task.parserCtx = new ParserCtx();
	                task.parserCtx.trackId = node.trackId;
	            }
	            else if (atomType === "hdlr") {
	                task.parserCtx.handlerType = node.handlerType;
	            }
				
				// Fast access map, to display a summarized file content
				if (!fastAccessMap.has(atomType)) {
					fastAccessMap.set(atomType, []);
				}
        		fastAccessMap.get(atomType).push(
					new FastAccessNode(node, task.parserCtx)
				);
				
				// recurse
				if (parsingResult && !parsingResult.isLeaf) {
					workStack.push(new ParserWorkTask(node, pos + 8, pos + atomSize, task.parserCtx));
				}
	
				pos += atomSize;
			}
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
	currentHandlerType;

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
	 * @param {boolean} isLarge
	 * @return {ParsingResult}
	 */
	newBox(fourCC, currentPos, size, parentAtom, isLarge) {
		if (isLarge)
			return this[fourCC](fourCC, currentPos + constants.stdAtomHeaderSize + 4, size - constants.stdAtomHeaderSize - 4, parentAtom);
		else
			return this[fourCC](fourCC, currentPos + constants.stdAtomHeaderSize, size - constants.stdAtomHeaderSize, parentAtom);
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
	 * @param {null} parentAtom
	 * @return {ParsingResult}
	 */
	moov(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
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
		this.currentHandlerType = box.handlerType;
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
		// to urn or url
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
//			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset + 4);
			if (this[nextType])
				this.newBox(nextType, offset, nextSize, box);
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
	 * Spec from ISO/IEC 14496-1:2001 13.2.3.17
	 * An stblAttom contains one of stsdAtom, depending on handler-type, containing an exteension of SampleEntry : 
	 * SampleEntry ('mp4v'), SampleEntry ('mp4a'), SampleEntry ('mp4s') (last one is generic)
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StblBox} parentAtom
	 * @param {string} handlerType
	 * @return {ParsingResult}
	 */
	stsd(fourcc, currentPos, size, parentAtom, handlerType) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		box.entryCount = this.headerView.getUint32(offset);
		offset += 4;
		
		// to SampleEntry
		const nextSize = this.headerView.getUint32(offset);
		const nextType = stringFromUint32(this.headerView, offset + 4);
		offset += 8;
		
		switch(handlerType) {
			case 'vide' : 
				if (this[nextType])
					this[nextType](nextType, offset, nextSize - 8, box);
				break;
			case 'soun' : this.mp4aSample('mp4a', offset, nextSize - 8, box); break;
			case 'hint' : this.hintSample('hint', offset, nextSize - 8, box); break;
			default : break;
		}
		
		// isLeaf = true, recursion handled before here
		return new ParsingResult(true, box);
	}
	
	/**
	 * @method
	 * class AudioSampleEntry() extends SampleEntry ('mp4a')
	 * last props may be 
	 * - ESDAtom ('esds'), wrapper atom to 
	 * 		the ElementaryStreamDesc (extends BaseDescriptor)
	 * 		ISO/IEC 14496-1:2001 13.2.3.17
	 * - chnl atom (ChannelLayout)
	 * ISO/IEC 14496-12:2015 12.2.4
	 * - any number of DownMix or DRC boxes:
		 DownMixInstructions() [];
		 DRCCoefficientsBasic() [];
		 DRCInstructionsBasic() [];
		 DRCCoefficientsUniDRC() [];
		 DRCInstructionsUniDRC()
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return undefined
	 */
	mp4aSample(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		// Reserved 6
		let offset = currentPos + 6;
		
		box.dataReferenceIndex = this.headerView.getUint16(offset);
		offset += 2;
		//  int(32)[2] reserved (found somewhere : version, revisionLevel, vendor)
		box.version = this.headerView.getUint16(offset);
		offset += 2;
		box.revisionLevel = this.headerView.getUint16(offset);
		offset += 2;
		box.vendor = this.headerView.getUint32(offset);
		offset += 4;
		box.channelCount = this.headerView.getUint16(offset);
		offset += 2;
		box.sampleSize = this.headerView.getUint16(offset);
		offset += 2;
		box.compressionId = this.headerView.getUint16(offset); // must be set to 0 for version 0 sound descriptions, set to –2, the sound track uses redefined sample tables optimized for compressed audio : sample-to-chunk and chunk offset atoms point to compressed frames
		offset += 2;
		// a version 1 sound description is used and the compression ID field is set to –2. The samplesPerPacket field and the bytesPerSample field are not necessarily meaningful for variable bit rate audio
		box.packetSize = this.headerView.getUint16(offset);
		offset += 2;
		box.sampleRate = this.headerView.getUint16(offset);
		offset += 4;
		
		// to mandatory ESDescriptor ('esds') & optional BitRateBox ('btrt')
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			offset += 4;
			if (this[nextType])
				this[nextType](nextType, offset, nextSize - constants.stdAtomHeaderSize, box,  'soun');
			offset += nextSize - constants.stdAtomHeaderSize;
		}
	}
	
	/**
	 * @method
	 * Channel layout 
	 * ISO/IEC 14496-12:2015 12.2.4
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return undefined
	 */
	chnl(fourcc, currentPos, size, parentAtom) {
		
	}
	
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return {ParsingResult}
	 */
	hintSample(fourcc, currentPos, size, parentAtom) {
		
	}
	
	/**
	 * @method
	 * Mp4 files use a derived implem of SampleEntry
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return {ParsingResult}
	 */
	mp4vSample(fourcc, currentPos, size, parentAtom) {
		
	}
	
	
	
	/**
	 * @method
	 * Extends SampleEntry ('coding_name')
	 * ISO/IEC 14496-12:2015 12.1.3
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @return undefined
	 */
	avc1(fourcc, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
//		reserved = 0;	// int8[6]
		offset += 6;
		box.dataReferenceIndex = this.headerView.getUint16(offset);
		offset += 2;
		box.version = this.headerView.getUint16(offset);
		offset += 2;
		box.revisionLevel = this.headerView.getUint16(offset);
		offset += 2;
		box.vendor = this.headerView.getUint32(offset);	
		offset += 4;
		box.temporalQuality = this.headerView.getUint32(offset);
		offset += 4;
		box.spatialQuality = this.headerView.getUint32(offset);
		offset += 4;
		box.width = this.headerView.getUint16(offset);
		offset += 2;
		box.height = this.headerView.getUint16(offset);
		offset += 2;
		box.horizontalResolution = this.headerView.getUint32(offset) >> 16;
		offset += 4;
		box.verticalResolution = this.headerView.getUint32(offset) >> 16;
		offset += 4;
		box.dataSize = this.headerView.getUint32(offset);
		offset += 4;
		box.frameCount = this.headerView.getUint16(offset); // Generally ONE frame per sample
		offset += 2;
		box.compressorNameSize = this.headerView.getUint8(offset);
		offset += 1;
		box.compressorName = stringFromBuffer(this.headerView, offset, box.compressorNameSize);
		offset += 31;
		box.depth = this.headerView.getUint16(offset);
		offset += 2;
		box.colorTableId = '0x' + this.headerView.getUint16(offset).toString(16);
		offset += 2;
		
		// Fast access map, not handled in recursion for mixed type boxes (having props and children)
		if (!fastAccessMap.has(fourcc)) {
			fastAccessMap.set(fourcc, []);
		}
		fastAccessMap.get(fourcc).push(
			new FastAccessNode(box, new ParserCtx('vide'))
		);
		
		// to mandatory AVCConfigurationBox ('avcC') & optional MPEG4BitRateBox ('btrt')
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			offset += 4;
			if (this[nextType])
				this[nextType](nextType, offset, nextSize - constants.stdAtomHeaderSize, box, 'vide');
			offset += nextSize - constants.stdAtomHeaderSize;
		}
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {Avc1Box} parentAtom
	 * @param {'vide'} handlerType
	 * @return undefined
	 */
	avcC(fourcc, currentPos, size, parentAtom, handlerType) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
		//	-> 1 byte version = 8-bit hex version  (current = 1)
		box.version = this.headerView.getUint8(offset); 
		offset += 1;
		//    -> 1 byte H.264 profile = 8-bit unsigned stream profile
		box.profile = zeroFill(this.headerView.getUint8(offset).toString(16), 2); 	// Baseline : 42, Main : 4D, High : 64  https://wiki.whatwg.org/wiki/video_type_parameters#Video_Codecs_3
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
		//    -> 1 byte number of SPS = 8-bit unsigned total Sequence Parameter Set
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
		//    -> 1 byte number of PPS = 8-bit unsigned total Picture Parameter Set
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
		
		// Fast access map, not handled in recursion for mixed type boxes (having props and children)
		if (!fastAccessMap.has(fourcc)) {
			fastAccessMap.set(fourcc, []);
		}
		fastAccessMap.get(fourcc).push(
			new FastAccessNode(box, new ParserCtx('vide'))
		);
	}
	
	/**
	 * @method
	 * PixelAspectRatioBox
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
		
		// Fast access map, not handled in recursion for mixed type boxes (having props and children)
		if (!fastAccessMap.has(fourcc)) {
			fastAccessMap.set(fourcc, []);
		}
		fastAccessMap.get(fourcc).push(
			new FastAccessNode(box, new ParserCtx('vide'))
		);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {StsdBox} parentAtom
	 * @param {'vide'|'soun'} handlerType
	 * @return undefined
	 */
	btrt(fourcc, currentPos, size, parentAtom, handlerType) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
		box.bufferSizeDB = this.headerView.getUint32(offset);
		box.maxBitrate = this.headerView.getUint32(offset);
		box.avgBitrate = this.headerView.getUint32(offset);
		
		// Fast access map, not handled in recursion for mixed type boxes (having props and children)
		if (!fastAccessMap.has(fourcc)) {
			fastAccessMap.set(fourcc, []);
		}
		fastAccessMap.get(fourcc).push(
			new FastAccessNode(box, new ParserCtx(handlerType))
		);
	}
	
	/**
	 * @method
	 * Spec from ISO/IEC 14496-1:2001 8.6.5
	 * esds is host for ES_Descriptor (a Descriptor of class ES_Descriptor) 
	 * each Descriptor extends BaseDescriptor
	 * Each BaseDescriptor begins with a Class Tag for Descriptor, and encodes its own length
		0x03 ES_DescrTag
		0x04 DecoderConfigDescrTag
		0x05 DecSpecificInfoTag
		0x06 SLConfigDescrTag
	 * ES_Descriptor is host for DecoderConfigDescriptor & SLConfigDescriptor
	 * and other optional ObjectDescriptor
		//		IPI_DescrPointer ipiPtr[0 .. 1];
		//		IP_IdentificationDataSet ipIDS[0 .. 255];
		//		IPMP_DescriptorPointer ipmpDescrPtr[0 .. 255];
		//		LanguageDescriptor langDescr[0 .. 255];
		//		QoS_Descriptor qosDescr[0 .. 1];
		//		RegistrationDescriptor regDescr[0 .. 1];
		//		ExtensionDescriptor extDescr[0 .. 255];
	 * DecoderConfigDescriptor is host for DecSpecificInfo (which also extends BaseDescriptor)
	 * 
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
		
		const tagForDescriptor = this.headerView.getUint8(offset); // ESDescriptorTag is 0x03
		offset += 1;
		
		//3 bytes optional extended descriptor type tag string
		let tag_string;
		if ([0x80, 0x81, 0xFE].indexOf(this.headerView.getUint8(offset)) !== -1) {
			tag_string = this.headerView.getUint32(offset);
			offset += 3;
		}
		// length_byte : length remaining after this byte
		const descriptor_length = this.headerView.getUint8(offset);
		offset += 1;
		box.ES_ID = this.headerView.getUint16(offset);
		offset += 2;
		const flags = this.headerView.getUint8(offset);
		const streamDependancyFlag = flags & 0x80;
		const OCRstreamFlag = flags & 0x20;
		const urlFlag = flags & 0x40;
		box.stream_priority = (flags << 3) >>> 3;
		offset += 1;
		if (streamDependancyFlag) {
			box.dependsOn_ES_ID = this.headerView.getUint16(offset);
			offset += 2;
		}
		// ISO_IEC_14496-1_1998 p24 (pdf p47)
		if (urlFlag) {
			const stringLength = this.headerView.getUint8(offset);
			offset += 1;
			box.url = stringFromBuffer(this.headerView, offset, stringLength);
			offset += stringLength;
		}
		if (OCRstreamFlag) {
			box.OCR_ES_Id = this.headerView.getUint16(offset);
			offset += 2;
		}
		
		let nextTag = this.headerView.getUint8(offset);
		offset += 1;
		const nextSize = this.headerView.getUint8(offset);

		this.DecoderConfigDescriptor(offset, nextTag, box);
		offset += nextSize;
		
		nextTag = this.headerView.getUint8(offset);
		offset += 1;
		this.SLConfigDescriptor(offset, nextTag, box);
		
		return new ParsingResult(true, box);
	}
	
	DecoderConfigDescriptor(currentPos, nextTag, parentBox) {
		let offset = currentPos;
		//3 bytes optional extended descriptor type tag string
		if ([0x80, 0x81, 0xFE].indexOf(this.headerView.getUint8(offset)) !== -1) {
			const tag_string = this.headerView.getUint32(offset);
			offset += 3;
		}
		const size = this.headerView.getUint8(offset);
		offset += 1;
		const descriptor = new DecoderConfigDescriptor(this.descriptorClassTagTable[nextTag], size);
		parentBox.children.push(descriptor);
		
		descriptor.object_type_ID = '0x' + this.headerView.getUint8(offset).toString(16); 	// MPEG-4 audio = 64 (0x40); MPEG-4 video = 32 (0x20); H264 video = 241
		descriptor.object_type_ID_HR =  this.object_type_ID[parseInt(descriptor.object_type_ID)];
		offset += 1;
		descriptor.stream_type = this.headerView.getUint8(offset) >>> 2; 	// 6 bits stream type = 3/4 byte hex value
		/*
		 * 	- type IDs are object descript. = 1 ; clock ref. = 2
		    - type IDs are scene descript. = 4 ; visual = 4
		    - type IDs are audio = 5 ; MPEG-7 = 6 ; IPMP = 7
		    - type IDs are OCI = 8 ; MPEG Java = 9
		    - type IDs are user private = 32
		 */
		offset += 1;
		descriptor.buffer_size = this.headerView.getUint32(offset) >>> 8;
		offset += 3;
		descriptor.maximum_bit_rate = this.headerView.getUint32(offset); 
		offset += 4;
		descriptor.average_bit_rate = this.headerView.getUint32(offset);
		offset += 4;
		
		nextTag = this.headerView.getUint8(offset);
		offset += 1;
		this.DecoderSpecificConfigDescriptor(offset, nextTag, descriptor);
	}
	
	DecoderSpecificConfigDescriptor(currentPos, nextTag, parentBox) {
		let offset = currentPos;
		//3 bytes optional extended descriptor type tag string
		if ([0x80, 0x81, 0xFE].indexOf(this.headerView.getUint8(offset)) !== -1) {
			const tag_string = this.headerView.getUint32(offset);
			offset += 3;
		}
		const size = this.headerView.getUint8(offset);
		offset += 1;
		const descriptor = new DecoderSpecificConfigDescriptor(this.descriptorClassTagTable[nextTag], size);
		parentBox.children.push(descriptor);
		
		descriptor.ES_header_start_codes = '0x';
		while (offset < currentPos + size) { // Every stream or table begins with a 32-bit start code : 0x01 - 0xAF means "slice"
			descriptor.ES_header_start_codes += this.headerView.getUint8(this.pos).toString(16); 	// ES header start codes = hex dump
			offset += 1;
		}
	}
	
	/**
	 * Sync Layer Config Descriptor
	 * Meaning to be found (has just one value)
	 */
	SLConfigDescriptor(currentPos, nextTag, parentBox) {
		let offset = currentPos;
		//3 bytes optional extended descriptor type tag string
		if ([0x80, 0x81, 0xFE].indexOf(this.headerView.getUint8(offset)) !== -1) {
			const tag_string = this.headerView.getUint32(offset);
			offset += 3;
		}
		const size = this.headerView.getUint8(offset);
		offset += 1;
		const descriptor = new SLConfigDescriptor(this.descriptorClassTagTable[nextTag], size);
		parentBox.children.push(descriptor);
		
		// ISO_IEC_14496-1_1998 10.2.3.1 : if (predefined==0) { [...] }
		descriptor.SL_value = '0x' + this.headerView.getUint8(this.pos).toString(16); 	// bit(8) predefined : 0x02 - 0xFF : Reserved for ISO use
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
		return new ParsingResult(true, box);
	}
	
	tfdt(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourcc](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		if (box.version === 0) {
			blockContent.baseMediaDecodeTime = this.headerView.getUint32(offset);
			offset += 4;
		}
		else if (box.version === 1) {
			blockContent.baseMediaDecodeTime = getUint64(this.headerView, offset);
		}
		return new ParsingResult(true, box);
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
		return new ParsingResult(true, box);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {UdtaBox} parentAtom
	 * @return {ParsingResult}
	 */
	meta(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourCC](currentPos, size);
		parentAtom.children.push(box);
		let offset = this.versionAndFlags(currentPos, box);
		
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			offset += 4;
			if (this[nextType])
				this[nextType](nextType, offset, nextSize - constants.stdAtomHeaderSize, box);
			offset += nextSize - constants.stdAtomHeaderSize;
		}
		
		return new ParsingResult(true, box);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MetaBox} parentAtom
	 * @return undefined
	 */
	ilst(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourCC](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
		while(offset < currentPos + size) {
			const nextSize = this.headerView.getUint32(offset);
			offset += 4;
			const nextType = stringFromUint32(this.headerView, offset);
			offset += 4;
			if (this[nextType])
				this[nextType](nextType, offset, nextSize- constants.stdAtomHeaderSize, box);
			offset += nextSize - constants.stdAtomHeaderSize;
		}
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {IlstBox} parentAtom
	 * @return undefined
	 */
	gshh(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourCC](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos 
		const dataSize = this.headerView.getUint32(offset);
		offset += constants.stdAtomHeaderSize;
		this.data('data', offset, dataSize - constants.stdAtomHeaderSize, box);
	}
	
	/**
	 * @method
	 * @param {keyof BoxRegister} fourcc
	 * @param {number} currentPos
	 * @param {number} size
	 * @param {MP4Box} parentAtom
	 * @return undefined
	 */
	data(fourCC, currentPos, size, parentAtom) {
		const box = new BoxRegistry[fourCC](currentPos, size);
		parentAtom.children.push(box);
		let offset = currentPos;
		
//		box.entryCount = this.headerView.getUint32(offset);
		// not sure of entryCount && found empty Uint32
		offset += 8;
		box.content = getNullTerminatedString(this.headerView, offset, size - 8);
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
	
	
	
	
	
	
	
	descriptorClassTagTable =  {
		0x00: 'Forbidden',
		0x01: 'ObjectDescr',
		0x02: 'InitialObjectDescr',
		0x03: 'ES_Descr',
		0x04: 'DecoderConfigDescr',
		0x05: 'DecSpecificInfo',
		0x06: 'SLConfigDescr',
		0x07: 'ContentIdentDescr',
		0x08: 'SupplContentIdentDescr',
		0x09: 'IPI_DescrPointer',
		0x0A: 'IPMP_DescrPointer',
		0x0B: 'IPMP_Descr',
		0x0C: 'QoS_Descr',
		0x0D: 'RegistrationDescr',
		0x0E: 'ES_ID_Inc',
		0x0F: 'ES_ID_Ref',
		0x10: 'MP4_IOD_',
		0x11: 'MP4_OD_',
		0x12: 'IPL_DescrPointerRef',
		0x13: 'ExtendedProfileLevelDescr',
		0x14: 'profileLevelIndicationIndexDescr',
//		0x15-0x3F Reserved for ISO use
		0x40: 'ContentClassificationDescr',
		0x41: 'KeyWordDescr',
		0x42: 'RatingDescr',
		0x43: 'LanguageDescr',
		0x44: 'ShortTextualDescr',
		0x45: 'ExpandedTextualDescr',
		0x46: 'ContentCreatorNameDescr',
		0x47: 'ContentCreationDateDescr',
		0x48: 'OCICreatorNameDescr',
		0x49: 'OCICreationDateDescr',
		0x4A: 'SmpteCameraPositionDescr'
//		0x4B-0x5F Reserved for ISO use (OCI extensions)
//		0x60-0xBF Reserved for ISO use
//		0xC0-0xFE User private
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
	
	/*
	1 	AAC Main 	1999 	contains AAC LC
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
	object_type_ID = {
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
}











const thisName = 'The MP4 parser';
const workerImplem = new Parser();

onmessage = function(event) {
	try {
		if (Array.isArray(event.data)) {
			var result = workerImplem.handleMessage(...event.data);
			if (result instanceof Promise) {
				result.then(function(res) {
					postMessage(res);
				});
			}
			else if (result)
				postMessage(result);
			else
				postMessage({type : 'warning', cause : thisName + ' didn\'t return anything.'});
		}
		else {
			postMessage({type : 'error', cause : thisName + ' expects an array as payload. ' + typeof event.data + ' received'});
		}
	}
	catch (e) {
		postMessage({type : 'error', cause : e.message});
	}
}

function sendResponse(res) {
	postMessage(res);
}