/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Constants */
let MAX_VOLUME_CAP = 130;

/* Global Variables */
let _tab = null;
let _on = false;
let _volumeCap = MAX_VOLUME_CAP;
let _hiddenGraph = false;

/* DOM Elements */

let switchCheckbox = document.getElementById('switch-checkbox');
let slider = document.getElementById('slider');
let max = document.getElementById('max');
let volumeCapText = document.getElementById('volume-cap-text');
let hideShowGraph = document.getElementById('hide-show-graph');

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
        let tabVariables = await getLocalTabStorage(_tab.id);
        if (tabVariables != undefined) {
            if (tabVariables.on != null) {
                _on = tabVariables.on;
            }
            if (tabVariables.volumeCap != null) {
                _volumeCap = tabVariables.volumeCap;
            }
            if (tabVariables.hiddenGraph != null) {
                _hiddenGraph = tabVariables.hiddenGraph;
            }
        }
        displayTabVariables(_on, _volumeCap, _hiddenGraph);
        await controlMediaStream(_on);
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
        displayTabVariables(_on, _volumeCap, _hiddenGraph);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
        await setTabBadge(_tab.id);
        await controlMediaStream(_on);
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
        displayTabVariables(_on, _volumeCap, _hiddenGraph);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
        await setTabBadge(_tab.id);
    }
);

hideShowGraph.addEventListener('click',
    async ( ev ) => {
        _hiddenGraph = !_hiddenGraph;
        displayTabVariables(_on, _volumeCap, _hiddenGraph);
        await updateLocalTabStorage(_tab, _on, _volumeCap);
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
 * Displays the tab variables in the chrome extension window
 * 
 * @function displayTabVariables
 * @param { boolean } on 
 * @param { number } volumeCap 
 */
function displayTabVariables(on, volumeCap, hiddenGraph) {
    switchCheckbox.checked = on;

    slider.value = volumeCap;
    slider.disabled = !on;

    volumeCapText.innerHTML = on ? `${volumeCap} dB` : '';

    hideShowGraph.innerHTML = hiddenGraph ? 'Show amplitude graph' : 'Hide amplitude graph';
    hideShowGraph.disabled = !on;
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
async function controlMediaStream(on) {
    if (on) {
        await sendMediaStreamId();
    }
    else {
        await stopMediaStream();
    }
}

/**
 * Sends the current media stream id to the sevice worker
 * 
 * @async
 * @function sendMediaStreamId
 */
async function sendMediaStreamId() {
    let tab = await getCurrentTab();
    chrome.tabCapture.getMediaStreamId({
        consumerTabId: tab.id
    },
        ( streamId ) => {
            chrome.tabs.sendMessage(tab.id, {
                command: 'tab-media-stream',
                streamId: streamId
            },
                ( response ) => { }
            );
        }
    );
}

/**
 * Stops the media stream
 * 
 * @async
 * @function stopMediaStream
 */
async function stopMediaStream() {
    let tab = await getCurrentTab();
    chrome.tabs.sendMessage(tab.id, {
        command: 'stop-media-stream'
    },
        ( response ) => { }
    );
}