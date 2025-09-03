/**
 * Entry point of the App, you should not have to edit this file
 * @author KingraphX (aka E_B_U_n19)
 * @thanks to @SteveDev76 @ArcureDev & @Gulhe_le_GuJ for their very kind and thoroughful testing and insights during their Twitch livestreams
 */

const {appConstants, App, debugUtilities} = require('formantjs');

appConstants.launch({
	UIDPrefix : 'MP4Parser'
});
// Relaunch core components inheritance mechanism, in case the user has defined new components needing it
App.componentTypes.CompositorComponent.createAppLevelExtendedComponent();
const appLauncher = require('src/App/launcher/app');
debugUtilities.checkRenderDOMPresence(appLauncher);

module.exports = appLauncher;