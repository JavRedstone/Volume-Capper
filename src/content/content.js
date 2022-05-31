/**
 * @author Javier Huang
 * @license CC0-1.0
 */

/* Global Variables */

let _mediaStream = null;
let _mediaStreamElements = null;
let _visualAnimationFrame = null;

/* HTML Elements */

let _visual = null;

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
            console.log(_mediaStream)
            if (_mediaStream != null) {
                stopMediaStream(_mediaStream, _mediaStreamElements);
            }
            break;
        case 'show-hide-visual':
            if (message.hiddenVisual) {
                cancelAnimationFrame(_visualAnimationFrame);
                let visuals = document.getElementsByClassName('volume-capper-visual');
                for (let i = 0; i < visuals.length; i++) {
                    visuals[i].remove();
                }
            }
            else {
                _visual = document.createElement('canvas');
                _visual.setAttribute('class', `volume-capper-visual`);
                document.body.appendChild(_visual);
                if (_mediaStreamElements != null) {
                    drawVisual(_visual, _mediaStreamElements.analyserNode, _mediaStreamElements.dataArray);   
                }
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
 * @function drawVisual
 * @param { AnalyserNode } analyserNode 
 * @param { Uint8Array } dataArray 
 */
function drawVisual(visual, analyserNode, dataArray) {
    let _visualAnimationFrame = requestAnimationFrame(
        () => {
            drawVisual(visual, analyserNode, dataArray);
        }
    );
    
    let visualCtx = visual.getContext('2d');
    visualCtx.clearRect(0, 0, visual.width, visual.height);
    
    analyserNode.getByteFrequencyData(dataArray);
    let average = findVolumeAverage(dataArray);
    let barWidth = visual.width / dataArray.length;
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
    for (let volume of dataArray) {
        sum += volume;
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
