/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Global Variables */
let _stream = null;
let _streamElements = null;

/* Event Listeners */

/**
 * Listens for messages coming from popup
 * 
 * @listens
 */
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        handleMessage(message);
        sendResponse({});
        return true;
    }
);

/* Functions */

/**
 * 
 * @param {  } tabId 
 * @returns 
 */
function handleMessage() {
    switch (message.command) {
        case 'tab-media-stream':
            _stream = getMediaStream(message.streamId);
            _streamElements = getStreamElements(_stream);
            break;
        case 'stop-media-stream':
            stopMediaStream(_stream, _streamElements);
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
    let stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        }
    });
    return stream;
}

/**
 * Gets the stream elements from a given stream
 * 
 * @function getStreamElements
 * @param { MediaStream } stream 
 * @returns { Object }
 */
function getStreamElements(stream) {
    let audioContext = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 44100
    });
    let streamSource = audioContext.createMediaStreamSource(stream);
    let analyserNode = new AnalyserNode(audioContext, {
        fftSize: 2048,
        minDecibels: -130,
        maxDecibels: 0
    });
    let gainNode = audioContext.createGain();
    let dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    streamSource.connect(analyserNode);
    streamSource.connect(gainNode);
    streamSource.connect(audioContext.destination);
    analyserNode.connect(audioContext.destination);
    gainNode.connect(audioContext.destination);
    return {
        audioContext,
        streamSource,
        analyserNode,
        gainNode,
        dataArray
    };
}

/**
 * Stops the current running media stream
 * 
 * @param { MediaStream } stream 
 * @param { Object } streamElements 
 */
function stopMediaStream(stream, streamElements) {
    for (let audioTrack of stream.getAudioTracks()) {
        audioTrack.stop();
    }
    streamElements.audioContext.close();
    
    stream = null;
    streamElements = null;
}

function drawVisual(analyserNode, dataArray) {
    requestAnimationFrame(drawVisual(analyserNode, dataArray));

    analyserNode.getByteFrequencyData(dataArray);

    console.log(dataArray)
}