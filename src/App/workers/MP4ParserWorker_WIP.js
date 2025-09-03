/**
 * MP4Parser
 * @author KinegraphX
 * 
 * If not specified, numbers come from uint32
 */


// @ts-ignore override of a native proto
if(!DataView.prototype.getUint64){
	// @ts-ignore
	DataView.prototype.getUint64 = function(byteOffset, littleEndian) {
		// on décompose la valeur 64 sur bits en deux nombres 32 bits
		const gauche = this.getUint32(byteOffset, littleEndian);
		const droite = this.getUint32(byteOffset + 4, littleEndian);

		// on combine les deux valeurs 32 bits
		const combinaison = littleEndian ? gauche + 2 ** 32 * droite : 2 ** 32 * gauche + droite;
		if (!Number.isSafeInteger(combinaison)) {
			console.warn(combinaison, " dépasse MAX_SAFE_INTEGER : perte de précision !");
		}
		return combinaison;
	}
}

/**
 * @function bufferIndexOf
 * Buffer manipulation Helper
 * @param {Uint8Array} buf
 * @param {Uint8Array} search
 * @param {number} offset
 */
const bufferIndexOf = function(buf, search, offset = 0){
	offset = offset||0
	let m = 0;
	let s = -1;
	for(var i = offset; i < buf.byteLength; ++i){
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
const buffer8getUint32 = function(pos, tArray, littleEndian = false){
	if (typeof littleEndian === 'undefined')
		return tArray[pos + 3] | tArray[pos + 2] << 8 | tArray[pos + 1] << 16 | tArray[pos] << 24;
	else
		return tArray[pos] | tArray[pos + 1] << 8 | tArray[pos + 2] << 16 | tArray[pos + 3] << 24;
}

/**
 * @function stringFromBuffer
 * Buffer manipulation Helper
 * @param {DataView|Uint8Array} buffer
 * @param {number} start
 * @param {number} length
 */
var stringFromBuffer = function(buffer, start = 0, length = 0) {
	if (length)
		return String.fromCharCode(...new Uint8Array(buffer.buffer.slice(start, start + length)));
	else
		return String.fromCharCode(...new Uint8Array(buffer.buffer.slice(start, buffer.byteLength)));
}

/**
 * @function stringFromUint32
 * Buffer manipulation Helper
 * @param {DataView} buffer
 * @param {number} start
 */
var stringFromUint32 = function(buffer, start = 0) {
	return String.fromCharCode(...new Uint8Array(buffer.buffer.slice(start, start + 4)));
}

 /**
  * @typedef {Uint8Array} pdinTupple
  */
 
 /**
  * @typedef {number[]} FixedPoint
  */
 
 
/**
  * @typedef {object} MP4Box
  * Abstract type
  * @property {string} type
  * @property {number} size
  * @property {number} pos
  * // if size === 1
  * 	property {number} size (int64)
  */
 
/**
  * @typedef {MP4Box} MP4FullBox
  * Abstract type
  * @property {number} version
  * @property (Uint8Array) flags
  */
 
/**
  * @typedef {MP4Box} mdatBox
  * Actual AV data chunk
  */
 
/**
  * @typedef {MP4Box} freeBox
  * often found with a zero size
  */
 
/**
  * Progressive Download info box
  * @typedef {MP4FullBox} pdinBox
  * @property {pdinTupple[]} sequences
  */
 
/**
  * @typedef {MP4Box} ftypBox
  * @property {string} majorBrand
  * @property {string} minorVersion
  * @property {string} compatibleBrand
  */
 
 /**
  * @typedef {MP4Box} moovBox
  * Container for the header
  */
 
 /**
  * @typedef {MP4FullBox} mvhdBox
  * Movie Header Box
  * v0 : for(0, 3) int32
  * v1 : for(0, 3) int64
  * @property {number} creationTime
  * @property {number} modificationTime
  * @property {number} timeScale
  * @property {number} duration
  * 
  * @property {FixedPoint} frameRate
  * @property {FixedPoint} volume (int16)
  * @property {null} reserved1 (int16)
  * @property {null} reserved2 (int32)
  * @property {Uint8Array} matrix (int32[9])
  * @property {number} preDefined (int32[6]) defaults to 0
  * @property {number} nextTrackID (uint32)
  */
 
/**
  * @typedef {MP4Box} trakBox
  * Track Box
  */
 
/**
  * @typedef {MP4FullBox} tkhdBox
  * Track Header Box
  * v0 : for(0, 4) int32
  * v1 : for(0, 1) int64,  int32, int32, int64
  * @property {number} creationTime
  * @property {number} modificationTime
  * @property {number} trackID
  * @property {null} reserved (int32)
  * @property {number} duration
  * 
  * @property {null} reserved (int32[2])
  * @property {number} layer (signed int16)
  * @property {number} alternateGroup (int16)
  * @property {FixedPoint} volume (int16)
  * @property {null} reserved (int16)
  * @property {Uint8Array} matrix (int32[9])
  * @property {number} width
  * @property {number} height
  */
 
/**
  * @typedef {MP4Box} trefBox
  * Track reference box
  * @property {Uint8Array} trackIDs (uint32[])
  */
 
/**
  * @typedef {MP4Box} mdiaBox
  * Media Box
  */
 
/**
  * @typedef {MP4FullBox} mdhdBox
  * Media Header Box
  * v0 : for(0, 4) int32
  * v1 : for(0, 1) int64,  int32, int64
  * @property {number} creationTime
  * @property {number} modificationTime
  * @property {number} timeScale
  * @property {number} duration
  * @property {string} languageCode (Uint(5)[3])
  * @property {null} preDefined (int16
  */
 
/**
  * @typedef {MP4FullBox} hdlrBox (version & flags set to 0)
  * @property {null} preDefined
  * @property {string} handlerType
  * @property {null} reserved (int32[3])
  * @property {string} name (null-terminated)
  */
 
/**
  * @typedef {MP4Box} minfBox
  * Media Info Box
  */
 
/**
  * @typedef {MP4Box} stblBox
  * Sample Tables Box
  */
 
/**
  * @typedef {MP4Box} SampleEntry
  * @property {null} reserved (int8[6])
  * @property {number} dataReferenceIndex (uint16)
  */
 
 /**
  * @typedef {MP4Box} btrtBox
  * Bitrate box
  * @property {number} bufferSizeDB 
  * @property {number} maxBitrate 
  * @property {number} avgBitrate
  */
 
/**
  * @typedef {MP4FullBox} stsdBox
  * version & flags are set to 0
  * @property {number} entryCount
  * @property {Uint8Array} data (SampleEntry[])
  */
 
/**
  * @typedef {MP4FullBox} stdpBox
  * Sample degradation priority box
  * version & flags are set to 0
  * entryCount is the sample count of the track
  * @property {Uint8Array} data (uint16[] priority)
  */
 
/**
  * @typedef {MP4FullBox} sttsBox
  * Time to Sample Box
  * version & flags are set to 0
  * @property {number} entryCount
  * @property {Uint8Array} data (uint32,uint32[] sample_count, sample_delta) 
  */
 
/**
  * @typedef {MP4FullBox} cttsBox
  * Composition Time to Sample Box 
  * flags are set to 0
  * v0 uint32, uint32
  * v1 uint32, int32
  * @property {number} entryCount
  * @property {Uint8Array} data (uint32,uint32[] sample_count, sample_offset) 
  */
 
/**
  * @typedef {MP4FullBox} cslgBox
  * Composition to Decode Box 
  * flags are set to 0
  * v0 for (0, 4) int32
  * v1 for (0, 4) int64
  * @property {number} compositionToDTSShift
  * @property {number} greatestDecodeToDisplayDelta
  * @property {number} greatestDecodeToDisplayDelta
  * @property {number} compositionStartTime
  * @property {number} compositionEndTime
  */

/**
 * @typedef {MP4FullBox} stssBox
 * Sync Sample Box
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32[] sample_number) 
 */

/**
 * @typedef {MP4FullBox} stshBox
 * Shadow Sync Sample Box
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32,uint32[] shadowed_sample_number, sync_sample_number) 
 */

/**
 * @typedef {MP4FullBox} sdtpBox
 * Independent and Disposable Samples Box 
 * version & flags are set to 0
 * entryCount is the sample count
 * @property {Uint8Array} data (int(2),int(2),int(2),int(2)[] is_leading, sample_depends_on, sample_is_depended_on, sample_has_redundancy) 
 */
 
/**
 * @typedef {MP4Box} edtsBox
 * Edits Box
 */

/**
 * @typedef {MP4FullBox} elstBox
 * Edits list Box
 * v0 uint32, int32, int16, int16
 * v1 uint64, int64, int16, int16
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32,int32,int16,int16[] segment_duration, media_time, media_rate_integer, media_rate_fraction) 
 */
 
/**
 * @typedef {MP4Box} dinfBox
 * Data Information Box
 */

/**
 * @typedef {MP4FullBox} url Box
 * Data Entry URL
 * version is set to 0
 * @property {string} location (null-terminated) 
 */

/**
 * @typedef {MP4FullBox} url Box
 * Data Entry URN
 * version is set to 0
 * @property {string} name (null-terminated)
 * @property {string} location (null-terminated)  
 */
 
 /**
 * @typedef {MP4FullBox} drefBox
 * DataReferenceBox
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {string} dataRefEntry ((url Box|urn Box)[]) see above
 */

/**
 * @typedef {MP4FullBox} stszBox
 * Sample Size Box 
 * version & flags are set to 0
 * @property {number} sampleSize (if set to zero, indicates there is a table)
 * @property {number} sampleCount
 * @property {Uint8Array} data (uint32[])=(sampleSize[]) 
 */

/**
 * @typedef {MP4FullBox} stz2Box
 * Sample Size Box 
 * version & flags are set to 0
 * @property {null} reserved (int24)
 * @property {number} fieldSize (int8)
 * @property {number} sampleCount
 * @property {Uint8Array} data (fieldSize[])=(sampleSize[]) 
 */

/**
 * @typedef {MP4FullBox} stscBox
 * Sample to Chunk Box 
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32,uint32,uint32[] first_chunk, samples_per_chunk, sample_description_index) 
 */

/**
 * @typedef {MP4FullBox} stcoBox
 * Chunk Offset Box
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32[] chunk_offset) 
 */

/**
 * @typedef {MP4FullBox} co64Box
 * Large Chunk Offset Box
 * version & flags are set to 0
 * @property {number} entryCount
 * @property {Uint8Array} data (uint64[] chunk_offset) 
 */

/**
 * @typedef {MP4FullBox} padbBox
 * Padding Bits
 * version & flags are set to 0
 * @property {number} sampleCount
 * @property {Uint8Array} data (bit(1),bit(3),bit(1),bit(3)[] zero,  pad1, zero, pad2) 
 */

/**
 * @typedef {MP4FullBox} subsBox
 * SubSampleInformationBox
 * @property {number} entryCount
 * @property {Uint8Array} data (uint32,uint16,...[] sample_delta, sample_count, optionnaly table)
 * if sample_count != 0 there's a table:
 * v0 subSampleSize uint16
 * v1 subSampleSize uint32 
 * 		optional table (uint16,uint8,uint8,uint32[] subSampleSize, subsample_priority, discardable, codec_specific_parameters)
 */

/**
 * @typedef {MP4Box} mvexBox
 * Movie Extends Box 
 */

/**
 * @typedef {MP4FullBox} mehdBox
 * Movie Extends Header Box 
 * v0 uint32
 * v1 uint64
 * @property {number} fragmentDuration
 */

/**
 * @typedef {MP4FullBox} traxBox
 * Track Extends Box
 * @property {number} trackID
 * @property {number} defaultSampleDescriptionIndex
 * @property {number} defaultSampleDuration
 * @property {number} defaultSampleSize
 * @property {number} defaultSampleFlags
 */

/**
 * @typedef {MP4Box} moofBox
 * Movie Fragment Box 
 */

/**
 * @typedef {MP4FullBox} mfhdBox
 * Movie Fragment Header Box
 * version & flags are set to zero
 * @property {number} sequenceNumber
 */

/**
 * @typedef {MP4Box} trafBox
 * Track Fragment Box 
 */

/**
 * @typedef {MP4FullBox} tfhdBox
 * Track Fragment Header Box
 * version is set to zero
 * all fields are optional
 * @property {number} [sequenceNumber]
 * @property {number} [sampleDescriptionIndex]
 * @property {number} [defaultSampleDuration]
 * @property {number} [defaultSampleSize]
 * @property {number} [defaultSampleFlags]
 */

/**
 * @typedef {MP4FullBox} trunBox
 * Track Fragment Run Box
 * version is set to zero
 * @property {number} sampleCount
 * the following fields are optional
 * @property {number} [dataOffset] (signed int32)
 * @property {number} [firstSampleFlag]
 * @property {Uint8Array} [data]
 * 		(
 * 		sample_duration,
 * 		sample_size,
 * 		sample_flags,
 * 		v0 uint32 sample_composition_time_offset
 * 		v1 signed int32 sample_composition_time_offset
 * 		)[sampleCount]
 */

/**
 * @typedef {MP4Box} mfraBox
 * Movie Fragment Random AccessBox
 */

/**
 * @typedef {MP4FullBox} tfraBox
 * Track Fragment Random Access Box 
 * @property {number} trackID
 * @property {null} reserved (int26)
 * @property {number} length_size_of_tra_num (int(2))
 * @property {number} length_size_of_trun_num (int(2))
 * @property {number} length_size_of_sample_num (int(2))
 * @property {number} number_of_entry
 * @property {Uint8Array} data
 *	 if(version==1){
	 	unsigned int(64) time;
		unsigned int(64) moof_offset;
	 }else{
		unsigned int(32) time;
		unsigned int(32) moof_offset;
	 }
	 unsigned int((length_size_of_traf_num+1) * 8) traf_number;
	 unsigned int((length_size_of_trun_num+1) * 8) trun_number;
	 unsigned int((length_size_of_sample_num+1) * 8) sample_number;
 */

/**
 * @typedef {MP4FullBox} mfroBox
 * Movie Fragment Random Access Offset Box
 * @property {number} size
 */

/**
 * @typedef {MP4FullBox} tfdtBox
 * Track Fragment Base Media Decode Time Box
 * v0 uint32
 * v1 uint64
 * @property {number} baseMediaDecodeTime
 */

/**
 * @typedef {MP4FullBox} trepBox
 * Track Extension Properties Box
 * @property {number} trackId
 */

// 	/!\  Sample groups still TBD

/**
 * @typedef {MP4Box} udtaBox
 * Movie Fragment Random AccessBox
 */

/**
 * @typedef {MP4FullBox} cprtBox
 * Copyright Box
 * @property {null}  pad (int(1))
 * @property {string}  language (int(5)[3])
 * @property {string}  notice (null terminated)
 */





// Base classes
class MP4Box {
  type = '';
  size = 0;
  pos = 0;
  /**
   * @param {string} type FourCC (e.g., 'moov')
   * @param {number} size total box size (32/64-bit, as parsed)
   * @param {number} pos  file offset where the box header starts
   */
  constructor(type = "", size = 0, pos = 0) {
    this.type = type;
    this.size = size;
    this.pos = pos;
  }
}

class MP4FullBox extends MP4Box {
  version = 0;
  flags = new Uint8Array(3);
}

// Concrete boxes
class MdatBox extends MP4Box { type = "mdat"; }
class FreeBox extends MP4Box { type = "free"; }

class PdinBox extends MP4FullBox {
  type = "pdin";
  /** @type {pdinTupple[]} */ sequences = [];
}

class FtypBox extends MP4Box {
  type = "ftyp";
  majorBrand = "";
  minorVersion = "";
  compatibleBrand = "";
}

class MoovBox extends MP4Box { type = "moov"; }

class MvhdBox extends MP4FullBox {
  type = "mvhd";
  creationTime = 0;
  modificationTime = 0;
  timeScale = 0;
  duration = 0;
  frameRate = [0, 0];
  volume = [0, 0];
  reserved1 = null;
  reserved2 = null;
  matrix = new Int32Array(9);
  preDefined = new Int32Array(6);
  nextTrackID = 0;
}

class TrakBox extends MP4Box { type = "trak"; }

class TkhdBox extends MP4FullBox {
  type = "tkhd";
  creationTime = 0;
  modificationTime = 0;
  trackID = 0;
  reserved1 = null;
  duration = 0;
  reserved2 = null;
  layer = 0;
  alternateGroup = 0;
  volume = [0, 0];
  reserved3 = null;
  matrix = new Int32Array(9);
  width = 0;
  height = 0;
}

class TrefBox extends MP4Box {
  type = "tref";
  trackIDs = new Uint8Array(0);
}

class MdiaBox extends MP4Box { type = "mdia"; }

class MdhdBox extends MP4FullBox {
  type = "mdhd";
  creationTime = 0;
  modificationTime = 0;
  timeScale = 0;
  duration = 0;
  languageCode = "";
  preDefined = null;
}

class HdlrBox extends MP4FullBox {
  type = "hdlr";
  preDefined = null;
  handlerType = "";
  reserved = null;
  name = "";
}

class MinfBox extends MP4Box { type = "minf"; }
class StblBox extends MP4Box { type = "stbl"; }

class SampleEntry extends MP4Box {
  type = "";
  reserved = null;
  dataReferenceIndex = 0;
}

class BtrtBox extends MP4Box {
  type = "btrt";
  bufferSizeDB = 0;
  maxBitrate = 0;
  avgBitrate = 0;
}

class StsdBox extends MP4FullBox {
  type = "stsd";
  entryCount = 0;
  data = new Uint8Array(0);
}

class StdpBox extends MP4FullBox {
  type = "stdp";
  data = new Uint8Array(0);
}

class SttsBox extends MP4FullBox {
  type = "stts";
  entryCount = 0;
  data = new Uint8Array(0);
}

class CttsBox extends MP4FullBox {
  type = "ctts";
  entryCount = 0;
  data = new Uint8Array(0);
}

class CslgBox extends MP4FullBox {
  type = "cslg";
  compositionToDTSShift = 0;
  leastDecodeToDisplayDelta = 0;
  greatestDecodeToDisplayDelta = 0;
  compositionStartTime = 0;
  compositionEndTime = 0;
}

class StssBox extends MP4FullBox {
  type = "stss";
  entryCount = 0;
  data = new Uint8Array(0);
}

class StshBox extends MP4FullBox {
  type = "stsh";
  entryCount = 0;
  data = new Uint8Array(0);
}

class SdtpBox extends MP4FullBox {
  type = "sdtp";
  data = new Uint8Array(0);
}

class EdtsBox extends MP4Box { type = "edts"; }

class ElstBox extends MP4FullBox {
  type = "elst";
  entryCount = 0;
  data = new Uint8Array(0);
}

class DinfBox extends MP4Box { type = "dinf"; }

class UrlBox extends MP4FullBox {
  type = "url ";
  location = "";
}

class UrnBox extends MP4FullBox {
  type = "urn ";
  name = "";
  location = "";
}

class DrefBox extends MP4FullBox {
  type = "dref";
  entryCount = 0;
  dataRefEntry = "";
}

class StszBox extends MP4FullBox {
  type = "stsz";
  sampleSize = 0;
  sampleCount = 0;
  data = new Uint8Array(0);
}

class Stz2Box extends MP4FullBox {
  type = "stz2";
  reserved = 0;
  fieldSize = 0;
  sampleCount = 0;
  data = new Uint8Array(0);
}

class StscBox extends MP4FullBox {
  type = "stsc";
  entryCount = 0;
  data = new Uint8Array(0);
}

class StcoBox extends MP4FullBox {
  type = "stco";
  entryCount = 0;
  data = new Uint8Array(0);
}

class Co64Box extends MP4FullBox {
  type = "co64";
  entryCount = 0;
  data = new Uint8Array(0);
}

class PadbBox extends MP4FullBox {
  type = "padb";
  sampleCount = 0;
  data = new Uint8Array(0);
}

class SubsBox extends MP4FullBox {
  type = "subs";
  entryCount = 0;
  data = new Uint8Array(0);
}

class MvexBox extends MP4Box { type = "mvex"; }

class MehdBox extends MP4FullBox {
  type = "mehd";
  fragmentDuration = 0;
}

class TraxBox extends MP4FullBox {
  type = "trex";
  trackID = 0;
  defaultSampleDescriptionIndex = 0;
  defaultSampleDuration = 0;
  defaultSampleSize = 0;
  defaultSampleFlags = 0;
}

class MoofBox extends MP4Box { type = "moof"; }

class MfhdBox extends MP4FullBox {
  type = "mfhd";
  sequenceNumber = 0;
}

class TrafBox extends MP4Box { type = "traf"; }

class TfhdBox extends MP4FullBox {
  type = "tfhd";
  sequenceNumber = undefined;
  sampleDescriptionIndex = undefined;
  defaultSampleDuration = undefined;
  defaultSampleSize = undefined;
  defaultSampleFlags = undefined;
}

class TrunBox extends MP4FullBox {
  type = "trun";
  sampleCount = 0;
  dataOffset = undefined;
  firstSampleFlag = undefined;
  data = undefined;
}

class MfraBox extends MP4Box { type = "mfra"; }

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

class MfroBox extends MP4FullBox {
  type = "mfro";
  mfraSize = 0;
}

class TfdtBox extends MP4FullBox {
  type = "tfdt";
  baseMediaDecodeTime = 0;
}

class TrepBox extends MP4FullBox {
  type = "trep";
  trackId = 0;
}

class UdtaBox extends MP4Box { type = "udta"; }

class CprtBox extends MP4FullBox {
  type = "cprt";
  pad = null;
  language = "";
  notice = "";
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
  trex: TraxBox,
  trax: TraxBox,
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
function createBox(fourcc, size = 0, pos = 0) {
  const Ctor = BoxRegistry[fourcc] || MP4Box;
  const box = new Ctor();
  box.type = fourcc;
  box.size = size;
  box.pos = pos;
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









const testFilename = 'Big_Buck_Bunny_360_10s_2MB.mp4';
const testFilePath = 'test_files/' + testFilename;

fetch(testFilePath).then(r => {
	r.blob().then(function(blob) {
		const file = new File([blob], testFilename);
		new Parser(file);				
	});
});


const constants = {
	stdAtomHeaderSize : 8,
	largeAtomHeaderSize : 16
}



/**
 * @typedef {object} FileDesc
 * @property {ftypBox} mp4Brand
 */

class FileDesc {
	mp4Brand = new ftypBox();
}


/**
 * @class
 * @property {AtomParser} atomParser
 * @property {ArrayBuffer} fileBuffer
 * @property {ArrayBuffer} headerBuffer
 * @property {DataView} headerView
 * @property {object}  fileStructure
 * @property {FileDesc} fileDesc
 * @property {number} pos
 * @property {number} trackNbr
 */
class Parser {
	atomParser = new AtomParser(new DataView(new ArrayBuffer(0)));
	fileBuffer = new ArrayBuffer(0);
	headerBuffer = new ArrayBuffer(0);
	headerView = new DataView(new ArrayBuffer(0));
	fileStructure = {};
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
			reader.onprogress = function (loadEvent) {
				var progress = loadEvent.loaded / loadEvent.total;
			}
			
			reader.readAsArrayBuffer(file);
		}
		else console.error({type : 'error', cause : 'The MP4Parser worker expects to receive a File instance'});
	}
	
	/**
	 * @method
	 * @param {ArrayBuffer} fileBuffer
	 */
	init(fileBuffer) {
		this.fileBuffer = fileBuffer;
		console.log(this.fileBuffer);
		
		this.setHeaderView();
		this.atomParser = new AtomParser(this.headerView);
		
		console.log('headerBuffer.byteLength', this.headerBuffer.byteLength);
		this.parseRecursive(this.headerBuffer.byteLength - 8, this.fileStructure);
		
		console.log(this.fileStructure);
	}
	
	/**
	 * @method
	 */
	setHeaderView() {
		const fileView = new Uint8Array(this.fileBuffer);
		this.setMP4Brand(fileView);
		const moovOffset = bufferIndexOf(fileView, int8ArrayFromString('moov'));
		const moovSize = buffer8getUint32(moovOffset - 4, fileView);
		this.headerBuffer = this.fileBuffer.slice(moovOffset - 4, moovOffset - 4 + moovSize);
		this.headerView = new DataView(this.headerBuffer);
	}
	
	/**
	 * @method
	 * @param {Uint8Array} fileView
	 */
	setMP4Brand(fileView) {
		const brandOffset = bufferIndexOf(fileView, int8ArrayFromString('ftyp'));
		const brandSize = buffer8getUint32(brandOffset - 4, fileView);
		this.fileDesc.mp4Brand = stringFromBuffer(fileView, brandOffset + 4, brandSize - 8);
	}
	
	/**
	 * @method
	 * @param {number} blockSize
	 * @param {object} currentBlock
	 */
	parseRecursive(blockSize, currentBlock) {
//		if (this.depthDebug > 3) return;
		
		const originalPos = this.pos;
		console.log('originalPos', originalPos, 'atomSize', blockSize);
		
		while (this.pos < originalPos + blockSize) {
			let atomSize = this.headerView.getUint32(this.pos) - constants.stdAtomHeaderSize;
			this.pos += 4;
			const atomType = /** @type {keyof BoxRegistry} */ stringFromUint32(this.headerView, this.pos);
			this.pos += 4;
			
			// see MP4Box typedef => if size === 1
			if (atomSize === 1) {
				/** @ts-ignore getUint64 is DataView extended */
				atomSize = this.headerView.getUint64(this.pos) - constants.largeAtomHeaderSize;
				this.pos += 8;
			}
			
			if (!(atomType in currentBlock))
				currentBlock[atomType] = {};
			
			if (atomType in this.atomParser) {
				if (!this.atomParser[atomType](this.pos, currentBlock[atomType])) {
//					this.depthDebug++;
					const cachedPos = this.pos;
					this.parseRecursive(atomSize, currentBlock[atomType]);
//					this.depthDebug--;
					this.pos = cachedPos;
				}
			}
			
			this.pos += atomSize;
			
		}
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
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	moov(currentPos, atomContent) {
		return false;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	mvhd(currentPos, atomContent) {
		const offset = currentPos;
		return true;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	udta(currentPos, atomContent) {
		const offset = currentPos;
		return true;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	trak(currentPos, atomContent) {
		return false;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	tkhd(currentPos, atomContent) {
		const offset = currentPos;
		return true;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	edts(currentPos, atomContent) {
		return false;
	}
	
	/**
	 * @method
	 * @param {number} currentPos
	 * @param {object} atomContent
	 * @return {boolean}
	 */
	mdia(currentPos, atomContent) {
		return false;
	}
}
 
 
