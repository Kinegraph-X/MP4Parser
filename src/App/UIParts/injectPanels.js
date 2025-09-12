/**
 * @factory injectPanels
 */

 const {App, TemplateFactory} = require('formantjs');
 const MP4Tree = require('src/App/components/MP4Tree/MP4Tree');
 
 const injectPanels = function(UIStructureComponent) {
//	console.log(UIStructureComponent);
//	console.log(App.componentTypes.AbstractSlider);
	const leftSlidingPanel = new App.componentTypes.SlidingPanelComponent(TemplateFactory.mockDef(), UIStructureComponent.view);
//	console.log(leftSlidingPanel);

	const mp4Tree = new MP4Tree(TemplateFactory.mockDef(), null);
 }
 
 module.exports = injectPanels;