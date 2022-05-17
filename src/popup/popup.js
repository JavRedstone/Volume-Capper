/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Constants */
let MAX_AMPLITUDE_LIMIT = 130;

/* Global Variables */
let _tab = null;
let _on = false;
let _amplitudeLimit = MAX_AMPLITUDE_LIMIT;

/* DOM Elements */

let switchCheckbox = document.getElementById('switch-checkbox');
let slider = document.getElementById('slider');

/* Event Listeners */

/**
 * Listens when the popup window is loaded
 * 
 * @listens
 */
window.addEventListener('load',
    async ( ev ) => {
        _tab = await getCurrentTab();
        let tabVariables = await getLocalTabStorage(_tab);
        if (tabVariables != undefined) {
            if (tabVariables.on != null) {
                _on = tabVariables.on;
            }
            if (tabVariables.amplitudeLimit != null) {
                _amplitudeLimit = tabVariables.amplitudeLimit;
            }
        }
        await displayVariables(_on, _amplitudeLimit);
    }
);

/**
 * Listens when the switch checkbox is selected or unselected
 * 
 * @listens
 */
switchCheckbox.addEventListener('change',
    ( ev ) => {
        _on = !_on;
        await updateLocalTabStorage(_tab, _on, _amplitudeLimit);
        await updateTableValues();
    }
);

/**
 * Listens when the slider's value is changed
 * 
 * @listens
 */
slider.addEventListener('change',
    ( ev ) => {
        await updateTableValues();
    }
);

/**
 * Listens when the slider has been moved
 * 
 * @listens
 */
slider.addEventListener('input',
    ( ev ) => {
        _amplitudeLimit = parseInt(slider.value);
        updateLocalTabStorage(_tab, _on, _amplitudeLimit);
    }
);

/* Functions */

/**
 * Returns the current tab that the user is active in
 * 
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
 * @param { Tab } tab 
 * @returns { Object }
 */
async function getLocalTabStorage(tabId) {
    let keys = await chrome.storage.local.get(`${tabId}`);
    return keys[`${tabId}`];
}

/**
 * Updates the switch checkbox and the slider with the given variable values
 * 
 * @function displayVariables
 * @param { boolean } on 
 * @param { number } amplitudeLimit 
 */
function displayVariables(on, amplitudeLimit) {
    switchCheckbox.checked = on;
    slider.value = amplitudeLimit;
}

/**
 * Updates the local storage variables for the tab provided
 * 
 * @async
 * @function updateLocalTabStorage
 * @param { Tab } tab 
 * @param { boolean } on 
 * @param { number } amplitudeLimit 
 */
async function updateLocalTabStorage(tab, on, amplitudeLimit) {
    if (tab != null) {
        await chrome.storage.local.set({
            [ tab.id ]: {
                tab: tab,
                on: on,
                amplitudeLimit: amplitudeLimit
            }
        });
    }
}

async function updateTableValues() {
    
}