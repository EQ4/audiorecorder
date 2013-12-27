// The HTML5 Audio middleware that does the recording in modern browsers
var Html5Audio = {
    // TODO(Bieber): Make sure the proper worker path is here after building
    WORKER_PATH: 'worker.js';
    worker: undefined

    audioContext: undefined,
    playingSources: [],

    ready: false,
    recording: false,

    init: function() {
        Html5Audio.audioContext = new AudioContext();
        navigator.getUserMedia({audio: true}, Html5Audio._useStream, function(err){});
        Html5Audio.worker = new Worker(Html5Audio.WORKER_PATH);
        Html5Audio.worker.onmessage = Html5Audio._handleMessage;
    },

    // Called by init with a MediaStream object
    _useStream: function(stream) {
        var mediaStreamSource = Html5Audio.audioContext.createMediaStreamSource(stream);
        var context = mediaStreamSource.context;

        var bufferLen = 4096;
        var numChannelsIn = 1;
        var numChannelsOut = 1;
        var node = this.context.createScriptProcessor(bufferLen, numChannelsIn, numChannelsOut);
        node.onaudioprocess = Html5Audio._handleAudio;

        Html5Audio.ready = true;
    },

    _handleAudio: function(event) {
        var buffer = event.inputBuffer.getChannelData(0);
        if (Html5Audio.recording) {
            Html5Audio.worker.postMessage({
                command: 'put',
                buffer: buffer
            });
        }
    },

    _handleMessage: function(event) {

    },

    record: function() {
        Html5Audio.recording = true;
    },

    stopRecording: function(cb) {
        if (Html5Audio.recording) {
            Html5Audio.recording = false;
            Html5Audio.worker.postMessage({
                command: 'get'
            });
            Html5Audio.clear();
        }
    },

    clear: function() {
        Html5Audio.worker.postMessage({
            command: 'clear'
        });
    }

    playClip: function(clip, inHowLong, offset) {
        var when = Html5Audio.audioContext.currentTime + inHowLong;
        var samples = clip.samples;

        // TODO(Bieber): Switch to one channel
        var newBuffer = Html5Audio.audioContext.createBuffer(2, samples[0].length, clip.sampleRate);
        newBuffer.getChannelData(0).set(samples[0]);
        newBuffer.getChannelData(1).set(samples[1]);

        var newSource = Html5Audio.audioContext.createBufferSource();
        newSource.buffer = newBuffer;

        newSource.connect(Html5Audio.audioContext.destination);
        newSource.start(when, offset);

        Html5Audio.playingSources.push(newSource);
    },

    stopPlaying: function() {
        // Stops playing all playing sources.
        // TODO(Bieber): Make sure things are removed from playingSources when they finish naturally
        for (var i = 0; i < Html5Audio.playingSources.length; i++) {
          var source = Html5Audio.playingSources[i];
          source.stop(0);
          delete source;
        }
        Html5Audio.playingSources = [];
    },

    isRecording: function() {
        return Html5Audio.ready && Html5Audio.recording;
    }
};
