/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Constants */

const FREQUENCY_CUT_OFF = 0.7125;

/* Global Variables */

let _mediaStream = null;
let _mediaStreamElements = null;

let _visualAnimationFrame = null;
let _visual = null;
let _visualCtx = null;

/* Event Listeners */

/**
 * Listens for a message from popup
 * 
 * @listens
 */
chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
        handleMessage(message);
    }
);

/* Functions */

/**
 * Handles the message provided
 * 
 * @async
 * @function handleMessage
 * @param { Object } message 
 */
async function handleMessage(message) {
    switch (message.command) {
        case 'tab-media-stream':
            if (_mediaStream == null) {
                _mediaStream = await getMediaStream(message.mediaStreamId);
            }
            _mediaStreamElements = getMediaStreamElements(_mediaStream);
            break;
        case 'stop-media-stream':
            if (_mediaStream != null && _mediaStreamElements != null) {
                stopMediaStream(_mediaStream, _mediaStreamElements);
            }
            break;
        case 'show-hide-visual':
            if (_visual != null) {
                _visual.remove();
                _visual = null;
            }
            if (message.hiddenVisual) {
                cancelAnimationFrame(_visualAnimationFrame);
            }
            else {
                _visual = document.createElement('canvas');
                _visual.setAttribute('id', 'volume-capper-visual');
                document.body.append(_visual);
                _visualCtx = _visual.getContext('2d');
                startVisual(_visual, _visualCtx);
            }
            break;
    }
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
 * Returns the media stream when given the stream id
 * 
 * @async
 * @function getMediaStream
 * @param { string } streamId 
 * @returns { MediaStream }
 */
async function getMediaStream(streamId) {
    return await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        }
    });
}

/**
 * Gets the media stream elements from a given media stream
 * 
 * @function getMediaStreamElements
 * @param { MediaStream } mediaStream 
 * @returns { Object }
 */
function getMediaStreamElements(mediaStream) {
    let audioContext = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 44100
    });
    let mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(audioContext, {
        mediaStream: mediaStream
    });
    let analyserNode = new AnalyserNode(audioContext, {
        fftSize: 1024,
        minDecibels: -130,
        maxDecibels: 0
    });
    let gainNode = new GainNode(audioContext, {
        gain: -2
    });
    let dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    mediaStreamAudioSourceNode.connect(audioContext.destination);
    mediaStreamAudioSourceNode.connect(analyserNode);
    mediaStreamAudioSourceNode.connect(gainNode);

    analyserNode.connect(audioContext.destination);

    gainNode.connect(audioContext.destination);
    
    return {
        audioContext,
        mediaStreamAudioSourceNode,
        analyserNode,
        gainNode,
        dataArray
    };
}

function startVisual(visual, visualCtx) {
    setTimeout(
        () => {
            if (_mediaStreamElements != null) {
                drawVisual(visual, visualCtx, _mediaStreamElements.analyserNode, _mediaStreamElements.dataArray);   
            }
            else {
                startVisual(visual, visualCtx, _mediaStreamElements);
            }
        }
    )
}

/**
 * Draws the visual on the tab page
 * 
 * @function drawVisual
 * @param { HTMLCanvasElement } visual
 * @param { CanvasRenderingContext2D } visualCtx
 * @param { AnalyserNode } analyserNode 
 * @param { Uint8Array } dataArray 
 */
function drawVisual(visual, visualCtx, analyserNode, dataArray) {
    _visualAnimationFrame = requestAnimationFrame(
        () => {
            drawVisual(visual, visualCtx, analyserNode, dataArray);
        }
    );
    visualCtx.clearRect(0, 0, visual.width, visual.height);
    
    analyserNode.getByteFrequencyData(dataArray);
    let average = findVolumeAverage(dataArray);
    let barWidth = visual.width / dataArray.length / FREQUENCY_CUT_OFF * 2;
    let x = 0;
    for (let volume of dataArray) {
        let barHeight = volume * visual.height / 255;
        visualCtx.fillStyle = '#4285F4';
        visualCtx.fillRect(x, visual.height - barHeight, barWidth, barHeight);
        x += barWidth - 1;
    }
}

/**
 * Finds the average of the volumes when given a data array
 * 
 * @function findVolumeAverage
 * @param { Uint8Array } dataArray
 * @returns { Uint8Array }
 */
function findVolumeAverage(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length * FREQUENCY_CUT_OFF; i++) {
        sum += dataArray[i];
    }
    return sum / dataArray.length;
}

/**
 * Stops the current running media stream
 * 
 * @function stopMediaStream
 */
 function stopMediaStream() {
    for (let audioTrack of _mediaStream.getAudioTracks()) {
        audioTrack.stop();
    }
    _mediaStreamElements.audioContext.close();
    
    _mediaStream = null;
    _mediaStreamElements = null;
}
