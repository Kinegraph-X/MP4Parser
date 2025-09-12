/**
 * Template definition
 * Useful when you need to dynamically generate members for a host-template of MP4Tree
 * (case of elaborated CompoundComponents)
 * 
 * @CSSify styleName : MP4TreeHeader
 * @CSSify styleName : MP4TreeSection
 * @CSSifyTheme themeName : basic-light
 */
const {TemplateFactory, CreateStyle} = require('formantjs');


const MP4TreeSlotsDef = function(options, model) {
	/**@CSSify DEBUG */ 	// Remove the whitespace between @CSSify and the word DEBUG to log the stylesheet definition
		
	// If a "styleName" defined above exists in DB, component styles are injected on the placeholder below (rollup-plugin-CSSifyFromDB)
	/**@CSSifySlots placeholder */
	
	const headerDef = TemplateFactory.createDef({
		host : TemplateFactory.createDef({
			/* Example
			type : 'ButtonComponent',
			nodeName : 'header',
			states : [
				{highlighted : undefined}
			],
			props : [
				{headerTitle : undefined}
			],
			reactOnSelf : [
				{
					from : 'headerTitle',
					to : 'content'
				}
			]*/
			/**@CSSifyStyle componentStyle : MP4TreeHeader */
		})
	});
	
	const sectionDef = TemplateFactory.createDef({
		host : TemplateFactory.createDef({
			/* Example
			type : 'ComponentWithView',
			nodeName : 'pseudo-panel'
			*/
			/**@CSSifyStyle componentStyle : MP4TreeSection */
		})
	});
	
	return {
		headerDef : headerDef,
		sectionDef : sectionDef
	};
}

module.exports = MP4TreeSlotsDef;