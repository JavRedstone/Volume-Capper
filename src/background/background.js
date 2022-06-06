/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Event Listeners */

/**
 * Listens when the extension is installed
 * 
 * @listens
 */
chrome.runtime.onInstalled.addListener(
    async ( details ) => {
        await chrome.storage.local.clear();
    }
);

/**
 * Listens when the tab is selected
 * 
 * @listens
 */
chrome.tabs.onActivated.addListener(
    ( activeInfo ) => {
        setTabBadge(activeInfo.tabId);
    }
)

/* Functions */

/**
 * Sets the badge of a tab, given the tabId
 * 
 * @async
 * @function setTabBadge
 * @param { number } tabId
 */
async function setTabBadge(tabId) {
    let keys = await chrome.storage.local.get(tabId);
    let tabVariables = keys[tabId];
    let text = '';
    if (tabVariables != undefined && tabVariables.on) {
        text = `${tabVariables.volumeCap}`;
    }
    chrome.action.setBadgeText({ text: text });
}