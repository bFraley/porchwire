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
async function porchPing() {
    if (window.peerUser && window.peerUser.socket) {
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
    .then(function(response) { return response.json(); })
    .then(function(users) {

        if (users === undefined || users.length < 1) {
            whos_online.innerHTML = '<li class="list-group-item">' + '0 Users Online' + '</li>';
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

    setTimeout(getAllOnline, 15000);
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

    // Toggle show of 'connect as' and 'connected' elements
    // showConnected 1 to show 'connected', 0 for 'connect as'
    function toggleConnectionUI(showConnected) {
        if (showConnected) {
            connected_as_peerId.style.display = 'block';
            connect_to_wrapper.style.display = 'block';
            edit_peerId.style.display = 'none';
        }
        else {
            connected_as_peerId.style.display = 'none';
            connect_to_wrapper.style.display = 'none';
            edit_peerId.style.display = 'block';
        }
    }

    // Append new chat message to UI
    function addChatMsg(msg) {
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
        connected.send(sent_message);
        addChatMsg('You: ' + sent_message);

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
    }, false);

    // Init start get all online users
    getAllOnline();

}
