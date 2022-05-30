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
        let logPrinting = setInterval(printLog, 1000);
        await clearLocalStorage();
        let message = 'Volume Capper was successfully installed.';
        for (let detail in details) {
            message += `\n${detail}: ${details[detail]}`;
        }
        createLogMessage(message);
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
 * Clears the chrome local storage
 * 
 * @async
 * @function clearLocalStorage
 */
async function clearLocalStorage() {
    await chrome.storage.local.clear();
    await createLogMessage('Cleared chrome local storage');
}

/**
 * Creates a new log message
 * 
 * @async
 * @function createLogMessage
 * @param { string } message
 */
async function createLogMessage(message) {
    let keys = await chrome.storage.local.get('log');
    let timeString = new Date().toTimeString();
    let logMessage = (keys.log == undefined ? '' : `${keys.log}\n\n`) + `${timeString}----------\n\n${message}`;
    await chrome.storage.local.set({
        log: logMessage
    });
}

/**
 * Prints the log
 * 
 * @async
 * @function printLog
 */
async function printLog() {
    let keys = await chrome.storage.local.get('log');
    console.log(keys.log);
}

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
    await createLogMessage(`Set badge text of tab ${tabId} to ${text}`);
}