/**
 * Template definition for MP4Tree
 * 
 * @CSSify styleName : MP4TreeHost
 * @CSSify styleName : MP4TreeTemplate
 * @CSSifyTheme themeName : basic-light
 * 
 */
const {TemplateFactory, CreateStyle} = require('formantjs');


const MP4TreeDef = function(options, model) {
	/**@CSSify DEBUG */		// Remove the whitespace between @CSSify and the word DEBUG to log the stylesheet definition
		
	// If a "styleName" defined above exists in DB, component styles are injected on the placeholder below (rollup-plugin-CSSifyFromDB)
	/**@CSSifySlots placeholder */
	
	return TemplateFactory.createDef({
		host : TemplateFactory.createDef({
			nodeName : 'component-node',
			/* Example
			states : [{isActive : undefined}],
			subscribeOnChild : [
				{
					on : 'update',
					subscribe : function(e) { this is mapped to the component instance}
				}
			]
			*/
			/**@CSSifyStyle componentStyle : MP4TreeHost */
		})
	});
}

module.exports = MP4TreeDef;