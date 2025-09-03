/**
 * 
 */

module.exports = function(node) {
	if (!Array.isArray(node.projectedData))
		node.projectedData = [];

	if (node.key.indexOf('trak') !== -1 || node.key === 'moov')
		node.type = node.value = 'ISO Box';
	
	if (typeof node.children === 'undefined')
		return node;
	
	function getHeaderTitles(UUID) {
		switch(UUID) {
			case 'stts' :
				return ['sample_count', 'sample_delta']
			case 'ctts' : 
				return ['sample_count', 'sample_offset'];
			case 'stsc' : 
				return ['first_chunk', 'samples_perchunk', 'sample_desc_idx'];
			case 'stss' : 
				return ['sample_number'];
			case 'stco' : 
				return ['chunk_offset'];
			case 'stsz' : 
				return ['sample_size'];
			case 'elst' :
				return ['segmt_durat.', 'media_time', 'media_rate'];
		}
	}
	
	function projectMixedInPlace (node, key) {
		node.projectedData = node.projectedData.concat(node.children);
//			if (node.projectedData.indexOfObjectByValue('key', 'Box UUID') === false)
//				node.projectedData.unshift({key : 'Box UUID', value : key});
		node.children.length = 0;
		return node;
	}
	
	function projectMixedToParentProtected (node) {

		var newChildrenSet = node.children.filter(function(child){
			if (child.key.indexOf('Table') === -1) {
				if (typeof child.value === 'object') {
					child.type = child.value = 'ISO Box';
					stepUpChildAsFirst(child);	
				}
				else {
					node.parent.projectedData.push(child);
					return false;
				}
			}
		})
		node.children = newChildrenSet;
		
		return node;
	}
	
	function projectMixedToParent(node) {
		node.children = node.children.filter(function(item) {
			if (typeof item.value !== 'object' || item.key.match(/Table|video_frame_pixel_size|trackWidth|trackHeight/)) {
				node.parent.projectedData.push(item);
			}
			else {
				item.type = item.value = 'ISO Box';
				stepUpChild(item);
			}
		});
		
		return node;
	}
	
	function projectMixedToDummy(node) {
		node.parent.type = node.parent.value = 'dummy box';
		node.children = node.children.filter(function(item) {
			if (typeof item.value === 'object') {
				item.type = item.value = 'ISO streamDesc';
				item.projectedData = [];
				projectMixedInPlace(item);
				item.projectedData.unshift({key : 'Box UUID', value : item.key.slice(0, 10)});
				node.parent.children.push(item);
				item.parent = node.parent;
			}
		});
		return node;
	}
	
	function stepUpChildAsFirst (node) {
		node.parent.parent.children.unshift(node);
		node.parent = node.parent.parent;
		return node;
	}
	
	function stepUpChild (node) {
		node.parent.parent.children.push(node);
		node.parent = node.parent.parent;
		return node;
	}
	
	function stepUpProjected (node) {
		node.parent.projectedData = node.parent.projectedData.concat(node.projectedData);
		delete node.projectedData;
		return node;
	}
	
	
	if (node.children.length === 1 && node.children[0].key === 'size') {
		node.type = node.value = '~not parsed (by  definition)';
		return node = projectMixedInPlace(node);
	}

	for (var k = node.children.length - 1; k >= 0; k--) {
		child = node.children[k];
		if (!Array.isArray(child.projectedData))
			child.projectedData = [];
		if (typeof child.key === 'string') {
			switch(child.key) {
				case 'content' : {
					
					// child is leaf : contains box data & may contain a table
					if (node.key !== 'stsd' && node.key !== 'mp4a' && node.key !== 'avc1' && node.key !== 'esds' && node.key !== 'ES_descriptor') {
						node.type = node.value = 'ISO fullBox';
						stepUpProjected(projectMixedInPlace(child, node.key));
						
						if (node.key === 'avcC' || node.key.indexOf('config') !== -1 || node.key.indexOf('decoder') !== -1)
								child.parent.projectedData.unshift({key : 'Box UUID', value : node.key});

						if (["stts",  "ctts",  "stsc",  "stss",  "stco",  "stsz", "elst"].indexOf(node.key) !== -1)
							child.parent.projectedData.push({key : '_private_headerTitles', value : getHeaderTitles(node.key)});
					}
					// child is leaf : contains NALU-type raw descriptors
					else if (node.key === 'ES_descriptor') {
						projectMixedToDummy(child);
						child.parent.projectedData.unshift({key : 'Box UUID', value : node.key.slice(0, 7)});
					}
					// child has mixed content, and it's problematic: we should not project until the leaf node (recursive parsing creates an unwanted "content" key)
					else {
						// Wrong attempt when looking for missing nodes : they were in fact just lacking a type (Kept as a reminder => remove after commit)
//							if (node.key === 'stsd' || node.key === 'mp4a' || node.key === 'avc1' || node.key === 'esds') {
//								projectMixedToParentProtected(child);
//								break;
//							}
//							else {
							child.type = child.value = 'ISO fullBox';
							projectMixedToParent(child);
//								console.log(child.parent.projectedData.indexOfObjectByValue('key', 'Box UUID'), child.parent.projectedData);
							if (node.key === 'avc1' || node.key === 'mp4a' || node.key === 'esds')
								child.parent.projectedData.unshift({key : 'Box UUID', value : node.key});
//							}
					}
					node.children.splice(k, 1);
					break;
				}
				// side cases
				case 'stsd' :
					child.type = child.value = 'ISO fullBox';
					break;
				case 'edts' :
				case 'mdia' :
				case 'stbl' :
				case 'minf' :
					child.type = child.value = 'ISO Box';
					break;
				// typical 
				case 'subAtomSize' : {}
				case 'subAtomType' : {}
				case 'version' :
				case 'flags' :
				case 'size' : {
					node.projectedData.unshift(child);
					node.children.splice(k, 1);
					break;
				}
				default : {}
			}
			
			if (child.key.indexOf(node.key + 'Pos') === 0 || (child.key.indexOf('Pos') !== -1 && child.key.indexOf(node.key.slice(0,4)) === 0)) {
//				console.log(node.key, node.projectedData.indexOfObjectByValue('key', 'Box UUID'), node.projectedData);
				if (node.projectedData.indexOfObjectByValue('key', 'Box UUID') === false)
					node.projectedData.unshift({key : 'Box UUID', value : node.key});
				node.projectedData.push(child);
				node.children.splice(k, 1);
			}
		}
	}

	return node;
}
	
//	var projectorFunction = function(projectedData) {
//		var table = null, tableName = '', container = $(projectorTargetId);
//		projectedData = projectedData.filter(function(item) {
//			if (item.key.indexOf('Table') !== -1) {
//				table = item.value;
//				tableName = item.key.slice(0, 4);
//			}
//			else return item;
//		});
//		var box = prefBox(context).create({nodes : projectedData}, container, 'emptyContainer');
//
//		if (table !== null) {
//			$('#loading_spinner').css('opacity', 1).show();
//			$('#ready').css('opacity', 1).show();
//			setTimeout(function() {
//				var moduleDef = createMP4tableDef(tableName);
//				
//				var sPanel = slidingPanel(context).create(createSlidingPanelDef('MP4sampleTable', 'noStylesheet'), container);
//				var bTable = basicTable(context).create(moduleDef, $('<li>').appendTo(sPanel.targetContainer), {buffer : table});
//				sPanel.setHeader(bTable.headerRow, 'tableEmbed', 'basic_table', bTable.def.id);
//				sPanel.Make();
//				$('#loading_spinner').hide();
//				$('#ready').hide();
//			}, 255);
//		}
//	}
	
//	var projectorTargetId = "#projector_target";

