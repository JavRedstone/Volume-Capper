// EVENT LISTENERS

chrome.runtime.onInstalled.addListener(
    details => {
        console.log(`Successfully Installed Amplitude Controller\nRuntime Details ----------\nPrevious Version: ${details.previousVersion}\nReason: ${details.reason}\n--------------------------`);
        chrome.storage.local.clear();
        let tabDebugging = setInterval(debugStorage, 500);
    }
);

chrome.tabs.onRemoved.addListener(
    (tabId, removeInfo) => {
        chrome.storage.local.remove(`${tabId}`);
    }
);

chrome.tabs.onActivated.addListener(
    activeInfo => {
        setTabBadge(activeInfo.tabId);
    }
)

// FUNCTIONS

async function setTabBadge(tabId) {
    let result = await chrome.storage.local.get(`${tabId}`);
    let tabResult = result[`${tabId}`];    
    if (tabResult != undefined && tabResult.on) {
        chrome.action.setBadgeText({ text: `${tabResult.amplitudeLimit}` });
        chrome.action.setBadgeBackgroundColor({ color: '#AB47BC' });
    }
    else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// DEBUG

function debugStorage() {
    chrome.storage.local.get(null,
        items => {
            console.log(items);
        }
    );
}