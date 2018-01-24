/* Porchwire Project Copright 2018 */

// DOM Helpers
function byId(name) { return document.getElementById(name); }
function getUserId() { return byId('user').value; }

function create_par(parent, msg) {
    var p = document.createElement('p');
    parent.appendChild(p);
    p.innerText = msg;
}

// PING for socket keepalive
function porchPing() {
    if (window.peerUser && window.peerUser.socket) {
        window.peerUser.socket.send({type: 'ping'});
        console.log('ping');
    }
    setTimeout(porchPing, 40000);
}

// 1 minute recurring update user list
function updateUserList() {
    getAllOnline();
    setTimeout(updateUserList, 40000);
}

// Toggle Jam button, for answering a call with media stream
function toggleShow(element) {
    if (element.style.display === 'none') {
        element.stye.display = 'block';
    }
    else {
        element.style.display = 'none';
    }
}

// FETCH Helpers

// Get users online
function getAllOnline() {

    let route = 'online';
    let whos_online = byId('whos-online');

    fetch(route, { method: 'get'})
        .then(function(response) { return response.json(); })
        .then(function(users) {

            if (users === undefined || users.length < 1) {
                whos_online.innerHTML = '<li>' + '0 Users Online' + '</li>';
            }
            else {
                whos_online.innerHTML = '';

                for (let i = 0; i < users.length; i++ ) {

                    let list_item = document.createElement('li');
                    list_item.className = 'list-group-item';
                    list_item.innerHTML = users[i].name;
                    whos_online.appendChild(list_item);
                }
            }
            
        });
}

let connected;
let reconnect_try_count = 0;
let HOST = 'localhost';
let PORT = 4200;

window.onload = function() {

    // Set deployment host and port
    if (window.location.href.indexOf('porchwire') > 0) {
        HOST = 'porchwire.herokuapp.com';
        PORT = '';
    }

    let sent_messages = [];
    let rec_messages = [];

    let chat_input = byId('chat-input');
    let send_button = byId('send-button');
    let conversation = byId('conversation');
    let connect = byId('connect-chat');
    let audio = byId('audio');

    // Add new sent chat message to list, and append to UI
    function addSent(msg) {
        sent_messages.push(msg);
        create_par(conversation, msg);
    }

    // Add new received chat message to list, and append to UI
    function addRec(msg) {
        rec_messages.push(msg);
        create_par(conversation, msg);
        conversation.scrollTop = conversation.scrollHeight;
    }

    // Converts stream to objectURL to play in audio element
    function streamAudio(stream) {
        audio.src = (URL || webkitURL || mozURL).createObjectURL(stream);
    }

    // User clicked Connect to initiate a call. Creates a peer to peer
    // data connection, and the call newJam to initiate media audio streams.
    function newConnection() {

        var ID = byId('connect-to').value;
        console.log(ID);
        console.log('Peer: ' + peer);

        var conn = peer.connect(ID, { reliable: true });

        // Data channel connection
        conn.on('open', function() {

            // Receive messages
            conn.on('data', function(data) {
                addRec(data);
            });

            // Send messages
            let init_msg = 'Connection established with ' + ID;
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

        navigator.getUserMedia({video:false, audio: true}, function(stream) {

            var ID = byId('connect-to').value;
            var call = peer.call(ID, stream);

            call.on('stream', function(remoteStream) {
                streamAudio(remoteStream);
            });

        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });

        //ANSWER
        peer.on('call', function(call) {

            // Get user media stream and answer the call with stream
            navigator.getUserMedia({video: false, audio: true}, function(stream) {
                call.answer(stream); // Answer the call

                call.on('stream', function(remoteStream) {
                    // converts stream to objectURL to play in audio element
                    streamAudio(remoteStream);
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

        window.peerUser = peer;

        peer.on('open', function(id) {
            console.log('Your peer ID is: ' + id);
        });

        peer.on('connection', function(conn) {

            conn.on('data', function(data){
                addRec(data);
            });

        });

        peer.on('disconnected', function(id) {
            while (reconnect_try_count < 5) {
                console.log('lost connection, attempting to reconnect');

                if (peer.reconnect()) {
                    console.log('Reconnected: ID: ' + id);
                }
                else {
                    reconnect_try_count++;
                }
            }
        });

    } // end initPeer

    // UI listeners    

    connect.addEventListener('click', function() {
        connected = newConnection();
    }, false);

    send_button.addEventListener('click', function() {
        connected.send(chat_input.value);
        chat_input.value = '';
    }, false);

    // Init peer
    initPeer()

    // Init online users
    updateUserList()

    // Init socket ping
    porchPing();
   
}
