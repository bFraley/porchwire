/* Porchwire Project Copright 2018 */


// DOM Helpers
function byId(name) { return document.getElementById(name); }
function getUserId() { return byId('user').value; }

// Append a child list element and it's innerText (content) to a (parent) <ul> element
function appendListItem(parent, content) {
    let item = document.createElement('li');
    item.className = 'list-group-item';
    parent.appendChild(item);
    item.innerText = content;
}

// PING for socket keepalive
async function porchPing() {
    if (window.peerUser && !window.peerUser.socket.disconnected) {
        window.peerUser.socket.send({type: 'ping'});
        console.log('ping');
    }
    setTimeout(porchPing, 45000);
}

// 15sec async recursive to get all online users and update UI
async function getAllOnline() {

    let route = 'online';
    let whos_online = byId('whos-online');

    fetch(route, { method: 'get'})
    .then(function(response) { 
        let users = response.json;
    })
    .then(function(users) {

        whos_online.innerHTML = '';

        if (users === undefined || users.length < 1) {
            appendListItem(whos_online, '0 Users Online');
        }
        else {

            for (let i = 0; i < users.length; i++ ) {
                appendListItem(whos_online, users[i].name);
            }
        }
        
    });

    setTimeout(getAllOnline, 15000);
}

// Local Storage Helpers

let porchwireLocalStorage = {
    test: true,
    id: null
}

let pwApp = 'porchwireApp';

// Set local storage porchwireApp.keyname = val
function setLocalItem(keyname, val) {
    porchwireLocalStorage[keyname] = val;
    return localStorage.setItem(pwApp, JSON.stringify(porchwireLocalStorage));
}

// Get local storage porchwireApp.keyname
function getLocalItem(keyname) {
    let localData = JSON.parse(localStorage.getItem(pwApp));
    return localData[keyname];
}

function tryLocalData() {
    if (localStorage.getItem(pwApp))
        return true;
    else
        return false;
} 

let connected;
let reconnect_try_count = 0;
let HOST = 'localhost';
let PORT = 4200;

/* Global Audio Values */
let AUDIO_STREAM;
let ACTIVE_RECORDING_TRACK;

window.onload = function() {

    // Set deployment host and port
    if (window.location.href.indexOf('porchwire') > 0) {
        HOST = 'porchwire.herokuapp.com';
        PORT = '';
    }

    let ngPeer = byId('ngPeer');
    let chat_input = byId('chat-input');
    let send_button = byId('send-button');
    let conversation = byId('conversation');
    let connect_jam = byId('connect-jam');
    let audio = byId('audio');

    let userId = byId('user');

    // If 'porchwireApp' is in localStorage, if id is set,
    // reuse this name initially in edit_peerId element.
    // Execute this here right away after we have userId!
    if (tryLocalData()) {
        let id = getLocalItem('id');
        userId.value = id;
    }

    let edit_peerId = byId('edit-peerId');
    let connected_as_peerId = byId('connected-as-peerId');
    let init_peer_link = byId('init-peer-link');
    let change_peerId_link = byId('change-peerId-link');
    let connect_to_wrapper = byId('connect-to-wrapper');

    // Recording UI
    let audio_wrapper = byId('audio-wrapper');

    let start_record = byId('start-record');
    let stop_record = byId('stop-record');

    // Wrapper where new recording elements get appended
    let recording_session_files = byId('recording-session-files');

    // Audio Controls UI
    let PWAudio = {

        // Converts stream to objectURL to play in audio element
        streamAudio: async function(stream_input) {
            audio.src = (URL || webkitURL || mozURL).createObjectURL(stream_input);
        },


        // Initial implementation of recording local and remote audio streams,
        // outputs window.URL.createObjectURL(blobfile) to recording_session_files
        // container of audio elements

        recordAudio async function(stream_input) {

            let blobfile;
            let chunks = [];
            let track = new MediaRecorder(stream_input);
            track.mimType = 'audio/ogg; codecs=opus';
            console.log(track);

            track.start();

            track.ondataavailable = function(chunk) {
                chunks.push(chunk.data);
            }

            track.onstop = function() {
                blobfile = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
                chunks = [];
                console.log('Recording Stopped: Blob output:\n');
                console.log(blobfile);

                let file = window.URL.createObjectURL(blobfile);

                let recorded_file_element = PW.UI.newRecordedFileElement(file);
                
                recording_session_files.appendChild(recorded_file_element);
                
            }

            ACTIVE_RECORDING_TRACK = track;
        },

        // Local 'hosts' machine audio wave meter and
        // Remote peer's incoming stream audio wave meter
        // Note: this currently assumes a single local and single remote stream.

        local_stream_meter:  function() {
            return byId('local-stream-meter');
        },

        remote_stream_meter: function() {
            return byId('remote_stream_meter');
        },

        // Init a WebAudio audio context
        newAudioContext: function() {
            return new (window.AudioContext || webkitAudioContext)();
        },

        // Init a 2d canvas context, accepts the html canvs 
        // element that will visualize an audio wave
        newCanvasContext: function(htmlCanvas) {
            return htmlCanvas.getContext("2d");
        },

        //Acknowlegement: Originally based on MDN dictaphone example at:
        // https://github.com/mdn/web-dictaphone/blob/gh-pages/scripts/app.js

        // Prepare audio and call drawStreamMeter
        // initStreamMedia is the primary PWAudio method called by launchStreamMeters

        initStreamMedia: function(stream, audioContext, meterCanvas) {

            let streamData = audioContext.createMediaStreamSource(stream);

            let analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            let bufferLength = analyser.frequencyBinCount;
            let dataArray = new Uint8Array(bufferLength);

            streamData.connect(analyser);
            //analyser.connect(audioContext.destination);

            // Call drawStreamMeter defined below
            PWAudio.initStreamMedia(meterCanvas, )
        }

        drawStreamMeter: function(meterCanvas, canvasContext) {

            let WIDTH = meterCanvas.width
            let HEIGHT = meterCanvas.height;

            requestAnimationFrame(PWAudio.drawStreamMeter);

            analyser.getByteTimeDomainData(dataArray);

            canvasContext.fillStyle = 'rgb(200, 200, 200)';
            canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

            canvasContext.lineWidth = 2;
            canvasContext.strokeStyle = 'rgb(0, 0, 0)';

            canvasContext.beginPath();

            let sliceWidth = WIDTH * 1.0 / bufferLength;
            let x = 0;


            for(let i = 0; i < bufferLength; i++) {
         
                let v = dataArray[i] / 128.0;
                let y = v * HEIGHT/2;

                if(i === 0) {
                    canvasContext.moveTo(x, y);
                }
                else {
                    canvasContext.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasContext.lineTo(meterCanvas.width, meterCanvas.height/2);
            canvasContext.stroke();

        },

    }; // end PWAudio

    // Wrapper around methods in PWAudio to launch the audio stream wave meters
    function launchStreamMeters(stream_input) {
        let audio_context = PWAudio.newAudioContext();
        let canvas_context = PWAudio.newCanvasContext();

        PWAudio.initStreamMedia(stream_input, audio_context, canvas_context);
    }

    // Toggle show of 'connect as' and 'connected' elements
    // showConnected 1 to show 'connected', 0 for 'connect as'
    function toggleConnectionUI(showConnected) {
        if (showConnected) {
            connected_as_peerId.className = "d-block";
            connect_to_wrapper.className = "d-block";
            edit_peerId.className = "d-none";
        }
        else {
            connected_as_peerId.className = "d-none";
            connect_to_wrapper.className = "d-none";
            edit_peerId.className = "d-block";
        }
    }

    // Append new chat message to UI
    function addChatMsg(msg) {
        appendListItem(conversation, msg);
        conversation.scrollTop = conversation.scrollHeight;
    }

    // User clicked Connect to initiate a call. Creates a peer to peer
    // data connection, and the call newJam to initiate media audio streams.
    function newConnection() {

        var ID = byId('connect-to').value;

        var conn = peer.connect(ID, { reliable: true });

        // Data channel connection
        conn.on('open', function() {

            // Receive messages
            conn.on('data', function(data) {
                addChatMsg(data);
            });

            // Send messages
            let init_msg = 'Connection established with ' + peer.id;
            conn.send(init_msg);

        });

        newJam();

        return conn;

    }

    // Setup and define media stream on peer.all and peer.answer,
    // called above in newConnecton.
    function newJam() {

        // TODO: navigator.getUserMedia is deprecated and navigator.mediaDevices.getUserMeda
        // should be used instead. Need adapter.js and possible other browser compatibility fixes
        // to be added. Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        navigator.getUserMedia({video: false, audio: true}, function(stream) {
        
        // CALL
            var ID = byId('connect-to').value;
            var call = peer.call(ID, stream);

            call.on('stream', function(remoteStream) {

                AUDIO_STREAM = remoteStream; // TODO: bug, or really don't need this
                PWAudio.streamAudio(remoteStream);

                launchStreamMeters(remoteStream);
                audio_wrapper.className = "d-block";

            });

        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });

        // ANSWER
        peer.on('call', function(call) {

            // Get user media stream and answer the call with stream
            navigator.getUserMedia({video: false, audio: true}, function(stream) {
                call.answer(stream); // Answer the call

                call.on('stream', function(remoteStream) {

                    AUDIO_STREAM = remoteStream; // TODO: bug, or really don't need this
                    PWAudio.streamAudio(remoteStream);

                    launchStreamMeters(remoteStream);
                    audio_wrapper.className = "d-block";
                    
                });

            }, function(err) {
                console.log('Failed to get local stream' ,err);
            });
        });
    }

    function initPeer() {  

        /* Page Load - Assign Peer ID */
        let peer = new Peer(
            getUserId(),
            {
                key: 'porchwiredev2018',
                host: HOST,
                port: PORT,
                path: '/peerjs',
                debug: 3            
            }
        );

        setLocalItem('id', peer.id);

        window.peerUser = peer;

        peer.on('open', function(id) {

            ngPeer.innerText = id;
            console.log('Your peer ID is: ' + id);

            // Init async socket ping
            porchPing();
        });

        peer.on('connection', function(conn) {

            conn.on('data', function(data){
                addChatMsg(data);
            });

        });

        peer.on('disconnected', function(id) {
            while (reconnect_try_count < 5) {
                console.log('lost connection, attempting to reconnect');

                if (peer.reconnect()) {

                    reconnect_try_count = 0;
                    console.log('Reconnected: ID: ' + id);
                }
                else {
                    reconnect_try_count++;
                }
            }
        });

        return peer;

    } // end initPeer

    let peer;

    // UI listeners    

    connect_jam.addEventListener('click', function() {
        connected = newConnection();
    }, false);

    send_button.addEventListener('click', function() {

        let sent_message = chat_input.value;
        let you_sent = 'You: ' + sent_message;

        connected.send(sent_message);
        addChatMsg(you_sent);

        chat_input.value = '';
    }, false);

    // User clicks 'connect me as link ', calls initPeer
    init_peer_link.addEventListener('click', function() {
        peer = initPeer();
        toggleConnectionUI(1);
    }, false);

    // User clicks to change their peer ID,
    // destroy peer and initPeer
    change_peerId_link.addEventListener('click', function() {
        peer.destroy();
        toggleConnectionUI(0);

        // Hide Stream and Record Audio Wrapper
        audio_wrapper.className = "d-none";

    }, false);

    //Audio Stream record and stop button UI switch
    // Accepts boolean (recordState), 1 for record, 0 for stop.
    function toggleRecordStopButtons(recordState) {

        if (recordState) {
            start_record.className = "btn-outline-danger";
            start_record.disabled = false;
        }
        else {
            stop_record.className = "btn-outline-danger";
            stop_record.disabled = false;
        }
    } 

    // Start Recording Button
    start_record.addEventListener('click', function() {

        toggleRecordStopButtons(1);

        console.log(AUDIO_STREAM);
        
        if (AUDIO_STREAM) {
            PWAudio.recordAudio(AUDIO_STREAM);
        }

    }, false);

    // Stop Recording Button
    stop_record.addEventListener('click', function() {

        toggleRecordStopButtons(1);

        console.log(ACTIVE_RECORDING_TRACK);
        
        if (ACTIVE_RECORDING_TRACK) {
            ACTIVE_RECORDING_TRACK.stop();
            console.log('Recording Stopped');
        }

        recording_session_files.className = "d-block";

    }, false);


    // Init start get all online users
    getAllOnline();

}
