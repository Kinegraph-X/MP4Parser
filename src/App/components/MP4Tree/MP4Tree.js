
const TemplateFactory = require('src/coreTest/TemplateFactory');
const Components = require('src/coreTest/Components');

var createMP4TreeHostTemplate = require('src/App/components/MP4Tree/componentTemplates/MP4TreeHostTemplate');
//var createMP4TreeSlotsTemplate = require('src/App/components/MP4Tree/componentTemplates/MP4TreeSlotsTemplate');

/**
 * @constructor MP4Tree
 * @param {TemplateFactory.HierarchicalTemplate} template
 * @param {CoreTypes.ComponentView} parentView
*/
var MP4Tree = function(template, parentView) {
	Components.ComponentWithView.call(this, template, parentView);
	this.objectType = 'MP4Tree';
}
MP4Tree.prototype = Object.create(Components.ComponentWithView.prototype);
MP4Tree.prototype.objectType = 'MP4Tree';

// Optional template override
MP4Tree.prototype.createDefaultDef = function() {
	return createMP4TreeHostTemplate();
}

module.exports = MP4Tree;