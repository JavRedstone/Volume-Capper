// VARIABLES

let currentTab = null;
let currentOn = false;
let currentAmplitudeLimit = 130;

let currentStream = null;
let currentAudioContext = null;
let currentAnalyserNode = null;
let currentGainNode = null;
let currentDataArray = null;

// DOM ELEMENTS

let extensionSwitch = document.getElementsByClassName('extension-switch')[0];
let amplitudeSlider = document.getElementsByClassName('amplitude-slider')[0];
let amplitudeLimitText = document.getElementsByClassName('amplitude-limit-text')[0];
let amplitudeCanvas = document.getElementsByClassName('amplitude-canvas')[0];
let amplitudeTable = document.getElementsByClassName('amplitude-table')[0];

let amplitudeCanvasCtx = amplitudeCanvas.getContext('2d');

// EVENT LISTENERS

window.addEventListener('load',
    event => {
        setCurrentTab();
    }
);

extensionSwitch.addEventListener('click',
    event => {
        currentOn = !currentOn;
        setTabStatus();
    }
);

amplitudeSlider.addEventListener('change',
    event => {
        currentAmplitudeLimit = parseInt(amplitudeSlider.value);
        setTabStatus();
    }
);

// FUNCTIONS

async function setCurrentTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    setGlobalVariables();
}

async function setGlobalVariables() {
    let result = await chrome.storage.local.get(`${currentTab.id}`);
    let tabResult = result[`${currentTab.id}`];
    if (tabResult != undefined) {
        if (tabResult.on != null) {
            currentOn = tabResult.on;
        }
        if (tabResult.amplitudeLimit != null) {
            currentAmplitudeLimit = tabResult.amplitudeLimit;
        }
    }
    setTabStatus();
}

function setTabStatus() {
    if (currentTab != null) {
        chrome.storage.local.set({
            [ currentTab.id ]: {
                tab: currentTab,
                on: currentOn,
                amplitudeLimit: currentAmplitudeLimit
            }
        });
        if (currentOn) {
            extensionSwitch.innerHTML = 'Turn it off';
            amplitudeSlider.disabled = false;
            amplitudeLimitText.innerHTML = `Amplitude Limit: ${currentAmplitudeLimit} Decibel(s)`;
            chrome.action.setBadgeText({ text: `${currentAmplitudeLimit}` });
            chrome.action.setBadgeBackgroundColor({ color: '#AB47BC' });
            if (currentStream == null && currentAudioContext == null) {
                captureTab();
            }
        }
        else {
            extensionSwitch.innerHTML = 'Turn it on';
            amplitudeSlider.disabled = true;
            amplitudeLimitText.innerHTML = '';
            chrome.action.setBadgeText({ text: '' });
            if (currentStream != null && currentAudioContext != null) {
                stopCaptureTab();
            }
        }
        amplitudeSlider.value = currentAmplitudeLimit;
        updateAmplitudeTable();
    }
}

function captureTab() {
    chrome.tabCapture.capture({
        audio: true,
        video: false
    },
        async stream => {
            currentStream = stream;
            analyseTabAudio();
        }
    );
}

async function analyseTabAudio() {
    currentAudioContext = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 44100
    });
    let streamSource = currentAudioContext.createMediaStreamSource(currentStream);
    currentAnalyserNode = new AnalyserNode(currentAudioContext, {
        fftSize: 2048,
        minDecibels: -130,
        maxDecibels: 0
    });
    currentGainNode = currentAudioContext.createGain();
    streamSource.connect(currentAnalyserNode);
    streamSource.connect(currentGainNode);
    streamSource.connect(currentAudioContext.destination);
    currentAnalyserNode.connect(currentAudioContext.destination);
    currentGainNode.connect(currentAudioContext.destination);
    currentDataArray = new Uint8Array(currentAnalyserNode.frequencyBinCount);
    runAnalyzerAndDrawVisual();
}

function runAnalyzerAndDrawVisual() {
    requestAnimationFrame(runAnalyzerAndDrawVisual);
    
    currentAnalyserNode.getByteFrequencyData(currentDataArray);
    let multiplier = currentGainNode.gain.value < -2 ? -currentGainNode.gain.value - 2 : 1;
    let amplitudeSum = 0;
    for (let amplitude of currentDataArray) {
        amplitudeSum += amplitude;
    }
    let amplitudeAverage = amplitudeSum / currentDataArray.length;
    let fixedAmplitudeLimit = 255 * currentAmplitudeLimit / 130;
    if (amplitudeAverage > fixedAmplitudeLimit) {
        currentGainNode.gain.value = -2 - fixedAmplitudeLimit / amplitudeAverage;
    }
    else {
        currentGainNode.gain.value = -3;
    }
    amplitudeCanvasCtx.clearRect(0, 0, amplitudeCanvas.width, amplitudeCanvas.height);
    let barWidth = amplitudeCanvas.width / currentDataArray.length * 1.5;
    let shrink = amplitudeCanvas.height / 255;
    let x = 0;
    for (let barHeight of currentDataArray)  {  
        amplitudeCanvasCtx.fillStyle = `rgba(${barHeight}, 0, 255, 0.25)`;
        amplitudeCanvasCtx.fillRect(x, amplitudeCanvas.height - barHeight * shrink, barWidth, barHeight * shrink);
        let correctedBarHeight = barHeight * multiplier;
        amplitudeCanvasCtx.fillStyle = `rgb(${correctedBarHeight}, 0, 255)`;
        amplitudeCanvasCtx.fillRect(x, amplitudeCanvas.height - correctedBarHeight * shrink, barWidth, correctedBarHeight * shrink);

        x += barWidth;
    }
    
    amplitudeCanvasCtx.strokeStyle = '#fff';
    amplitudeCanvasCtx.fillStyle = '#fff';
    amplitudeCanvasCtx.font = '20px';
    amplitudeCanvasCtx.beginPath();
    amplitudeCanvasCtx.moveTo(0, amplitudeCanvas.height - amplitudeAverage * shrink);
    amplitudeCanvasCtx.lineTo(amplitudeCanvas.width,  amplitudeCanvas.height - amplitudeAverage * shrink);
    amplitudeCanvasCtx.stroke();
    amplitudeCanvasCtx.fillText('Average Amplitude', 10, amplitudeCanvas.height - amplitudeAverage * shrink - 5);
    amplitudeCanvasCtx.beginPath();
    amplitudeCanvasCtx.moveTo(0, amplitudeCanvas.height - amplitudeAverage * multiplier * shrink);
    amplitudeCanvasCtx.lineTo(amplitudeCanvas.width,  amplitudeCanvas.height - amplitudeAverage * multiplier * shrink);
    amplitudeCanvasCtx.stroke();
    amplitudeCanvasCtx.fillText('Average Corrected Amplitude', 10, amplitudeCanvas.height - amplitudeAverage * multiplier * shrink + 10);
    amplitudeCanvasCtx.beginPath();
    amplitudeCanvasCtx.moveTo(0, amplitudeCanvas.height - fixedAmplitudeLimit * shrink);
    amplitudeCanvasCtx.lineTo(amplitudeCanvas.width, amplitudeCanvas.height - fixedAmplitudeLimit * shrink);
    amplitudeCanvasCtx.stroke();
    amplitudeCanvasCtx.fillText('Current Amplitude Limit', amplitudeCanvas.width - 120, amplitudeCanvas.height - fixedAmplitudeLimit * shrink + 10);
}

function stopCaptureTab() {
    for (let audioTrack of currentStream.getAudioTracks()) {
        audioTrack.stop();
    }
    currentAudioContext.close();
    currentStream = null;
    currentAudioContext = null;
    currentAnalyserNode = null;
    currentGainNode = null;
    currentDataArray = null;
}

async function updateAmplitudeTable() {
    let rowLength = amplitudeTable.rows.length
    for (let i = 0; i < rowLength - 1; i++) {
        amplitudeTable.deleteRow(1);
    }
    let result = await chrome.storage.local.get(null);
    let res = Object.values(result);
    for (let tabResult of res) {
        let row = amplitudeTable.insertRow(1);
        let tabName = row.insertCell(0);
        let audible = row.insertCell(1);
        let on = row.insertCell(2);
        let amplitudeLimit = row.insertCell(3);
        tabName.innerHTML = tabResult.tab.title;
        audible.innerHTML = tabResult.tab.audible;
        on.innerHTML = tabResult.on;
        amplitudeLimit.innerHTML = tabResult.amplitudeLimit;
        if (tabResult.tab.id == currentTab.id) {
            let border = '3px solid #AB47BC';
            tabName.style.border = border;
            audible.style.border = border;
            on.style.border = border;
            amplitudeLimit.style.border = border;
            row.style.boxShadow = '0 0 10px #AB47BC';
        }
    }
}