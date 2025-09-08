const {App, TemplateFactory} = require('formantjs');
//const MP4ParserCode = require('src/App/workers/MP4parse.worker').default; // code bundled as string is exposed as an ESmodule
const videoFileModel = require('src/App/valueObjects/videoFileModel');
const normalizeTree = require('src/App/transform/MP4ParserTreeNormalize');

const testFilename = 'Big_Buck_Bunny_360_10s_2MB.mp4';
const testFilePath = 'test_files/' + testFilename;
const workerPath = 'workers/MP4ParserWorker.js';

/**
 * @factory MP4Parser
 * @launcher
 */
module.exports = function(parentView) {
	return {
		init : function (containerSelector) {
			
			document.querySelector(containerSelector).innerHTML = 'Hello from MP4Parser rebundled 😎';
			const root = new App.RootView();
			
			const dropZone = new App.componentTypes.FileDropZone(TemplateFactory.mockDef(), root.view);
			const UIStructureComponent = new App.coreComponentLib.FlexRowComponent(TemplateFactory.mockGroupDef(), root.view);
			const parser = new App.Worker('mp4Parser', null, workerPath);
			
			const self = this;
			var parserHandlers = {
					'initSuccess' : function(responsePayload) {
//						console.log(responsePayload);
						parser.postMessage('parse');
//						if (headerAsTreeHR)
//							resetApp();
					},
					'parseSuccess' : function(responsePayload) {
						console.log(responsePayload);
//						self.treeTest(responsePayload.moov, root.view);
//						videoFileModel.setMediaInfo(responsePayload);
//						dropZone.updateCurrently(videoFileModel.data.title);
					}
			};
			for (var k in parserHandlers) {
				parser.addResponseHandler(k, parserHandlers[k]);
			}
			
			fetch(testFilePath).then(r => {
				r.blob().then(function(blob) {
					const file = new File([blob], testFilename);
//					videoFileModel.populateFromFileObj({data : file});
					parser.postMessage('init', {data : file});				
				});
			});
			
			
			console.log('hello here', App.Worker);
			App.renderDOM();
			parser.destroy();
		},
		treeTest : function(moovData, parentView) {
			const treeComponent = new App.coreComponents.AbstractTree(null, parentView, null);
			const depth = 0;
			const rootNode = {
				id : 'moov',
				type : 'root',
				value : '',
				children : [],
				parent : null
			}
			this.traverseTree(moovData, rootNode, depth);
			console.log(rootNode);
		},
		traverseTree : function(treeNode, currentNode, depth) {
			if (typeof treeNode != 'object') {
				if (typeof treeNode === 'string' || typeof treeNode === 'number') {
					currentNode.type = 'value';
				}
				currentNode.value = treeNode;
				return;
			}
			else if (ArrayBuffer.isView(treeNode)) {
				currentNode.type = 'table';
				currentNode.value = treeNode;
				return;
			}
			
			depth++;
			let newNode;
			for (const childProp in treeNode) {
				if (
					childProp === 'size'
					|| childProp.slice(-3) === 'Pos'
					)
					continue;
				
				// ISO FullBox content is currently boxed in a "content" prop, cause the parser can't know the size before having parsed the whole FullBox
				// But now we're okay skipping it
				if (childProp === 'content') {
					currentNode.type = 'ISO FullBox';
					this.traverseTree(treeNode[childProp], currentNode, depth);
					continue;
				}
				
				newNode = {
					id : childProp,
					type : 'ISO Box',
					value : '',
					children : [],
					parent : currentNode
				};
				
				currentNode.children.push(newNode);
				this.traverseTree(treeNode[childProp], newNode, depth);
			}
		}
	}
};