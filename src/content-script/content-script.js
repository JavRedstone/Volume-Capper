/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Global Variables */
let _mediaStream = null;
let _mediaStreamElements = null;

/* Event Listeners */

/**
 * Listens for a message from popup
 * 
 * @listens
 */
chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
        console.log(message.command)
        handleMessage(message);
    }
);

/* Functions */

/**
 * Handles the message provided
 * 
 * @async
 * @function
 * @param { Object } message 
 * @returns 
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
            console.log(_mediaStream)
            if (_mediaStream != null) {
                stopMediaStream(_mediaStream, _mediaStreamElements);
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
        fftSize: 2048,
        minDecibels: -130,
        maxDecibels: 0
    });
    let gainNode = audioContext.createGain();
    let dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    mediaStreamAudioSourceNode.connect(analyserNode);
    mediaStreamAudioSourceNode.connect(gainNode);
    mediaStreamAudioSourceNode.connect(audioContext.destination);
    
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

/**
 * Draws the visual on the tab page
 * 
 * @param { AnalyserNode } analyserNode 
 * @param { Uint8Array } dataArray 
 */
function drawVisual(analyserNode, dataArray) {
    requestAnimationFrame(drawVisual(analyserNode, dataArray));

    analyserNode.getByteFrequencyData(dataArray);

    console.log(dataArray)
}

/**
 * Stops the current running media stream
 * 
 * @function
 */
 function stopMediaStream() {
    for (let audioTrack of _mediaStream.getAudioTracks()) {
        audioTrack.stop();
    }
    _mediaStreamElements.audioContext.close();
    
    _mediaStream = null;
    _mediaStreamElements = null;
}