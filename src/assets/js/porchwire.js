/* Porchwire Project Copright 2018 */

window.onload = function() {

    // DOM Helpers
    function byId(name) { return document.getElementById(name); }
    function byClass(name) { return document.getElementsByClassName(name); }
    
    // Initial user name field's value is wither generated in PeerComponent,
    // or is retrieved from browser local storage
    let userId = byId('user');
    function getUserId() { return userId.value; }

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

    // If 'porchwireApp' is in localStorage, if id is set,
    // reuse this name initially in edit_peerId element.
    // Execute this here right away after we have userId!
    if (tryLocalData()) {
        let id = getLocalItem('id');
        userId.value = id;
    }

    // These will move to PW.Net values
    let connected;
    let remote_initiated_connection;
    let reconnect_try_count = 0;
    let HOST = 'localhost';
    let PORT = 4200;

    // Set deployment host and port
    if (window.location.href.indexOf('porchwire') > 0) {
        HOST = 'porchwire.herokuapp.com';
        PORT = '';
    }

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
        }
        setTimeout(porchPing, 45000);
    }

    // 15sec async recursive to get all online users and update UI
    async function getAllOnline() {

        let route = 'online';
        let whos_online = byId('whos-online');

        fetch(route, { method: 'get'})
        .then(function(response) { 
            return response.json();
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

    
    /* Global Audio Values */
    let AUDIO_STREAM;
    let ACTIVE_RECORDING_TRACK;
    let ACTIVE_LOCAL_STREAM;
    let ACTIVE_REMOTE_STREAM;

    // Arrays for local and remote AudioContexts.
    // New contexts get pushed to stack, and AudioContext.close()
    // is called to prevent user browser from hitting the limit on
    // open audio contexts. When closing, we pop the context from the stack.
    let LOCAL_AUDIO_CONTEXTS = [];
    let REMOTE_AUDIO_CONTEXTS = [];

    // DOM UI elements
    let ngPeer = byId('ngPeer');
    let chat_input = byId('chat-input');
    let send_button = byId('send-button');
    let conversation = byId('conversation');
    let connect_jam = byId('connect-jam');
    let audio = byId('audio');

    let edit_peerId = byId('edit-peerId');
    let connected_as_peerId = byId('connected-as-peerId');
    let init_peer_link = byId('init-peer-link');
    let change_peerId_link = byId('change-peerId-link');
    let connect_to_wrapper = byId('connect-to-wrapper');

    // Recording UI
    let audio_wrapper = byId('audio-wrapper');

    // Enable / disable meter buttons
    let disable_local_meter_button = byId('disable-local-meter-button');
    let enable_local_meter_button = byId('enable-local-meter-button');

    let disable_remote_meter_button = byId('disable-remote-meter-button');
    let enable_remote_meter_button = byId('enable-remote-meter-button');

    // Reserves a frameId for each the local and remote meter animation frames
    let local_meter_animation, remote_meter_animation;
    
    // Start / Stop Recording buttons
    let start_record = byId('start-record');
    let stop_record = byId('stop-record');

    // Wrapper where new recording elements get appended
    let recording_session_files = byId('recording-session-files');

    // PWAudio - Audio Controls Methods and UI helpers
    let PWAudio = {

        // Converts stream to objectURL to play in audio element
        streamAudio: async function(stream_input) {
            audio.srcObject = stream_input; // TODO: rename 'audio' element id
        },

        // Initial implementation of recording local and remote audio streams,
        // outputs window.URL.createObjectURL(blobfile) to recording_session_files
        // container of audio elements

        recordAudio: async function(stream_input) {

            let blobfile;
            let chunks = [];
            let track = new MediaRecorder(stream_input);
            track.mimeType = 'audio/ogg; codecs=opus';
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
            return byId('remote-stream-meter');
        },

        // Init a WebAudio audio context - accepts 'local' or 'remote'
        // in order to push new context to LOCAL_AUDIO_CONTEXTS or REMOTE_AUDIO_CONTEXTS
        newAudioContext: function(local_or_remote_context) {

            let context = new (window.AudioContext || webkitAudioContext)();
            
            if (local_or_remote_context === 'local') {
                LOCAL_AUDIO_CONTEXTS.push(context);
            }
            else if (local_or_remote_context === 'remote') {
                REMOTE_AUDIO_CONTEXTS.push(context);
            }

            return context;
        },

        // Init a 2d canvas context, accepts the html canvs 
        // element that will visualize an audio wave
        newCanvasContext: function(htmlCanvas) {
            return htmlCanvas.getContext("2d");
        },

        // When user clicks to disable a stream meter, the animation frame's
        // request ID is passed in and canceled via window.cancelAnimationFrame
        // TODO: NOT USING THIS YET!
        disableStreamMeter: function(requestFrameId) {
            cancelAnimationFrame(requestFrameId);
        },

        //Acknowlegement: Originally based on MDN dictaphone example at:
        // https://github.com/mdn/web-dictaphone/blob/gh-pages/scripts/app.js

        // Prepare audio and call drawStreamMeter
        // initStreamMeters is the primary PWAudio method called by launchStreamMeters,
        // frameId is accepts either 'local' or 'remote' for local_meter_animation or remote_meter_animation

        initStreamMeters: async function(stream, audioContext, meterCanvas, canvasContext, frameId) {

            let streamData = audioContext.createMediaStreamSource(stream);

            let analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            let bufferLength = analyser.frequencyBinCount;
            let dataArray = new Uint8Array(bufferLength);

            streamData.connect(analyser);
            //analyser.connect(audioContext.destination);

            let WIDTH, HEIGHT, sliceWidth, x, y, v, i;
            let fill = '#008fcc';
            let stroke = 'rgb(136, 255, 0)';

            WIDTH = meterCanvas.width
            HEIGHT = meterCanvas.height;

            // Pre-render canvas background for performance
            let background_canvas = document.createElement('canvas');
            background_canvas.width = WIDTH;
            background_canvas.height = HEIGHT;

            let background_context = background_canvas.getContext('2d');

            background_context.fillStyle = fill;
            background_context.fillRect(0, 0, WIDTH, HEIGHT);

            // Call drawStreamMeter defined below
            drawStreamMeter(stream);

            // meterCanvas is html canvas node, context is the 2d context of meterCanvas,
            // Analyzer node param is analyser from createAnalyzer above,
            // dataArray from above is Uint8Array audio of audio samples

            async function drawStreamMeter(stream) {

                if (frameId === 'local') {
                    local_meter_animation = requestAnimationFrame(drawStreamMeter);
                }
                else if (frameId === 'remote') {
                    remote_meter_animation = requestAnimationFrame(drawStreamMeter);
                }

                WIDTH = meterCanvas.width
                HEIGHT = meterCanvas.height;

                // Reduces arithmetic in line drawing loop below
                let heightBy2 = HEIGHT / 2;
                let widthFloat = WIDTH * 1.0;

                sliceWidth = widthFloat / bufferLength;

                analyser.getByteTimeDomainData(dataArray);

                // Draw pre-rendered background
                canvasContext.drawImage(background_canvas, 0, 0);

                canvasContext.lineWidth = 2;
                canvasContext.strokeStyle = stroke;

                canvasContext.beginPath();

                x = 0;

                for(i; i < bufferLength; i++) {
             
                    v = dataArray[i] / 128.0;
                    y = v * heightBy2;

                    if (!i) {
                        canvasContext.moveTo(x, y);
                    }
                    else {
                        canvasContext.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                i = 0;

                canvasContext.lineTo(WIDTH, heightBy2);
                canvasContext.stroke();

            }
        },

    }; // end PWAudio

    // Local and Remote Audio Wave Meters
    let local_meter = PWAudio.local_stream_meter();
    let remote_meter = PWAudio.remote_stream_meter();

    // Wrapper around methods in PWAudio to launch the audio stream wave meters
    // frameId is either 'local' or 'remote' String
    function launchStreamMeters(stream_input, meterCanvas, frameId) {

        // This context is pushed to LOCAL/REMOTE_AUDIO_CONTEXTS
        let audio_context = PWAudio.newAudioContext(frameId); // <== 'local' or 'remote'
        let canvas_context = PWAudio.newCanvasContext(meterCanvas);

        PWAudio.initStreamMeters(stream_input, audio_context, meterCanvas, canvas_context, frameId);
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
    // data connection, and the call newJam to initiate media audio streams
    function newConnection() {

        var ID = byId('connect-to').value;
        var conn = peer.connect(ID, { reliable: true });

        // Data channel connection
        conn.on('open', function() {

            // Receive message
            conn.on('data', function(data) {
                addChatMsg(data);
            });

            conn.on('close', function() {
                swal(ID + " isn't available to jam right now");
            });

        });

        newJam();

        return conn;

    }

    // Media call is placed to remot peer after data connection
    // is established above in newConnection, this is called
    function newJam() {

        navigator.mediaDevices.getUserMedia({video: false, audio: true})
       .then(function(stream) {
        
        // CALL
            let ID = byId('connect-to').value;
            let call = peer.call(ID, stream);

            call.on('stream', function(remoteStream) {

                ACTIVE_LOCAL_STREAM = stream;
                ACTIVE_REMOTE_STREAM = remoteStream;

                AUDIO_STREAM = remoteStream; // TODO: bug, or really don't need this
                PWAudio.streamAudio(remoteStream);

                launchStreamMeters(stream, local_meter, 'local');
                launchStreamMeters(remoteStream, remote_meter, 'remote');

                audio_wrapper.className = "d-block";
            });

        })
       .catch(function(err) {
            console.log('Failed to get local stream', err);
        });

    }


    // initPeer gets called when user enters their name and clicks 'connect' button
    // and instantiates a new peerjs Peer object
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

        // Emitted when a new data connection is established from a remote peer
        peer.on('connection', function(conn) {

            connected = remote_initiated_connection = conn;

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

        // Received a jam invite (a media call)
        peer.on('call', function(call) {

            let invite = remote_initiated_connection.peer + ' invited you to jam';

            swal({
                title: "Jam Time?",
                text: invite,
                buttons: true
            })
            .then(function(accepted) {
                
                if (accepted) {

                    // Get user media stream and answer the call with stream
                    navigator.mediaDevices.getUserMedia({video: false, audio: true})
                    .then(function(stream) {
                        call.answer(stream); // Answer the call

                        call.on('stream', function(remoteStream) {

                            ACTIVE_LOCAL_STREAM = stream;
                            ACTIVE_REMOTE_STREAM = remoteStream;

                            AUDIO_STREAM = remoteStream; // TODO: bug, or really don't need this
                            PWAudio.streamAudio(remoteStream);

                            
                            launchStreamMeters(stream, local_meter, 'local');
                            launchStreamMeters(remoteStream, remote_meter, 'remote');

                            audio_wrapper.className = "d-block";

                        });

                    })
                    .catch(function(err) {
                        console.log('Failed to get local stream', err);
                    });
                    
                }
                else {
                    remote_initiated_connection.send(peer.id + " isn't available to jam right now.");
                    remote_initiated_connection.close();
                }
            });
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

        connected.send(peer.id + ': ' + sent_message);
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

    // Enable and disable audio stream meter button listeners
    disable_local_meter_button.addEventListener('click', function() {

        cancelAnimationFrame(local_meter_animation);

        let length = LOCAL_AUDIO_CONTEXTS.length;

        if (length) {
            LOCAL_AUDIO_CONTEXTS[length - 1].close();
            LOCAL_AUDIO_CONTEXTS.pop();
        }

    }, false);

    disable_remote_meter_button.addEventListener('click', function() {

        cancelAnimationFrame(remote_meter_animation);

        let length = REMOTE_AUDIO_CONTEXTS.length;

        if (length) {
            REMOTE_AUDIO_CONTEXTS[length - 1].close();
            REMOTE_AUDIO_CONTEXTS.pop();
        }

    }, false);

    enable_local_meter_button.addEventListener('click', function() {
        launchStreamMeters(ACTIVE_LOCAL_STREAM, local_meter, 'local');       
    }, false);

    enable_remote_meter_button.addEventListener('click', function() {
        launchStreamMeters(ACTIVE_REMOTE_STREAM, remote_meter, 'remote'); 
    }, false);

    // Canvas resize event listener to reset canvas WIDTH and HEIGHT values
    window.addEventListener('resize', function() {
        WIDTH = local_meter.width;
        HEIGHT = local_meter.height;
    }, true);

    //Audio Stream record and stop button UI switch
    // Accepts boolean (recordState), 1 for record, 0 for stop.
    function toggleRecordStopButtons(recordState) {

        if (recordState) {
            start_record.className = "btn-outline-secondary";
            start_record.disabled = true;

            stop_record.className = "btn-outline-danger";
            stop_record.disabled = false;
        }
        else {
            stop_record.className = "btn-outline-secondary";
            stop_record.disabled = true;

            start_record.className = "btn-outline-danger";
            start_record.disabled = false;
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

        toggleRecordStopButtons(0);

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
