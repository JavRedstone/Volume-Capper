/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Constants */

const MAX_VOLUME_CAP = 130;

/* Global Variables */
let _tab = null;
let _on = false;
let _volumeCap = MAX_VOLUME_CAP;
let _hiddenVisual = false;

/* DOM Elements */

let switchCheckbox = document.getElementById('switch-checkbox');
let slider = document.getElementById('slider');
let max = document.getElementById('max');
let volumeCapText = document.getElementById('volume-cap-text');
let showHideVisual = document.getElementById('show-hide-visual');

/* Event Listeners */

/**
 * Listens when the popup window is loaded
 * 
 * @listens
 */
window.addEventListener('load',
    async ( ev ) => {
        slider.max = MAX_VOLUME_CAP;
        slider.value = MAX_VOLUME_CAP;
        max.innerHTML = `${MAX_VOLUME_CAP} dB`;
        _tab = await getCurrentTab();
        await setTabVariables(_tab.id);
        displayTabVariables(_on, _volumeCap, _hiddenVisual);
        await controlMediaStream(_tab, _on);
    }
);

/**
 * Listens when the switch checkbox is selected or unselected
 * 
 * @listens
 */
switchCheckbox.addEventListener('change',
    async ( ev ) => {
        _on = !_on;
        _hiddenVisual = !_on;
        displayTabVariables(_on, _volumeCap, _hiddenVisual);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
        await setTabBadge(_tab.id);
        await controlMediaStream(_tab, _on);
        sendShowHideVisual(_tab, _hiddenVisual);
    }
);

/**
 * Listens when the slider has been moved
 * 
 * @listens
 */
slider.addEventListener('input',
    async ( ev ) => {
        _volumeCap = parseInt(slider.value);
        displayTabVariables(_on, _volumeCap, _hiddenVisual);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
        await setTabBadge(_tab.id);
    }
);

showHideVisual.addEventListener('click',
    async ( ev ) => {
        _hiddenVisual = !_hiddenVisual;
        displayTabVariables(_on, _volumeCap, _hiddenVisual);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
        sendShowHideVisual(_tab, _hiddenVisual);
    }
);

/* Functions */

/**
 * Returns the current tab that the user is active in
 * 
 * @async
 * @function getCurrentTab
 * @returns { Tab }
 */
async function getCurrentTab() {
    let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    return tab;
}

/**
 * Returns the local tab storage object when given a tab id
 * 
 * @async
 * @function getLocalTabStorage
 * @param { number } tabId 
 * @returns { Object }
 */
async function getLocalTabStorage(tabId) {
    let keys = await chrome.storage.local.get(tabId);
    return keys[tabId];
}

/**
 * Sets up the tab variables
 * 
 * @param { tabId } tabId
 */
async function setTabVariables(tabId) {
    let tabVariables = await getLocalTabStorage(_tab.id);
    if (tabVariables != undefined) {
        if (tabVariables.on != null) {
            _on = tabVariables.on;
        }
        if (tabVariables.volumeCap != null) {
            _volumeCap = tabVariables.volumeCap;
        }
        if (tabVariables.hiddenVisual != null) {
            _hiddenVisual = tabVariables.hiddenVisual;
        }
    }
}

/**
 * Displays the tab variables in the chrome extension window
 * 
 * @function displayTabVariables
 * @param { boolean } on 
 * @param { number } volumeCap 
 */
function displayTabVariables(on, volumeCap, hiddenVisual) {
    switchCheckbox.checked = on;

    slider.value = volumeCap;
    slider.disabled = !on;

    volumeCapText.innerHTML = on ? `${volumeCap} dB` : '';

    showHideVisual.innerHTML = hiddenVisual ? 'Show amplitude graph' : 'Hide amplitude graph';
}

/**
 * Sets the badge of a tab, given the tabId
 * 
 * @async
 * @function setTabBadge
 * @param { number } tabId 
 */
async function setTabBadge(tabId) {
    let tabVariables = await getLocalTabStorage(tabId);
    let text = '';
    if (tabVariables != undefined && tabVariables.on) {
        text = `${tabVariables.volumeCap}`;
    }
    await chrome.action.setBadgeText({ text: text });
}

/**
 * Updates the local storage variables for the tab provided
 * 
 * @async
 * @function updateLocalTabStorage
 * @param { Tab } tab 
 * @param { boolean } on 
 * @param { number } volumeCap 
 */
async function updateLocalTabStorage(tab, on, volumeCap, hideGraph) {
    if (tab != null) {
        await chrome.storage.local.set({
            [ tab.id ]: {
                tab: tab,
                on: on,
                volumeCap: volumeCap,
                hideGraph: hideGraph
            }
        });
    }
}

/**
 * Controls the media stream status
 * 
 * @async
 * @function
 * @param { boolean } on 
 */
async function controlMediaStream(tab, on) {
    if (on) {
        await sendMediaStreamId(tab);
    }
    else {
        sendStopMediaStream(tab);
    }
}

/**
 * Sends the current media stream id to the sevice worker
 * 
 * @async
 * @function sendMediaStreamId
 */
async function sendMediaStreamId(tab) {
    chrome.tabCapture.getMediaStreamId({
        consumerTabId: tab.id
    },
        ( streamId ) => {
            chrome.tabs.sendMessage(tab.id, {
                command: 'tab-media-stream',
                mediaStreamId: streamId
            });
        }
    );
}

/**
 * Stops the media stream
 * 
 * @async
 * @function sendStopMediaStream
 */
function sendStopMediaStream(tab) {
    chrome.tabs.sendMessage(tab.id, {
        command: 'stop-media-stream'
    });
}

function sendShowHideVisual(tab, hiddenVisual) {
    chrome.tabs.sendMessage(tab.id, {
        command: 'show-hide-visual',
        hiddenVisual: hiddenVisual
    });
}
