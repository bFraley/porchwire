/* Porchwire Project Copright 2018 */

function byId(name) { return document.getElementById(name); }
function getUserId() { return byId('user').value; }

function create_par(parent, msg) {
    var p = document.createElement('p');
    parent.appendChild(p);
    p.innerText = msg;
}

let connected;
let connections;
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

    let connection_list = byId('connection-list');

    let chat_input = byId('chat-input');
    let send_button = byId('send-button');
    let conversation = byId('conversation');
    let connect = byId('connect-chat');
    let jam = byId('connect-jam');
    let audio = byId('audio');

    function addSent(msg) {
        sent_messages.push(msg);
        create_par(conversation, msg);
    }

    function addRec(msg) {
        rec_messages.push(msg);
        create_par(conversation, msg);
    }

    function streamAudio(stream) {
        audio.src = (URL || webkitURL || mozURL).createObjectURL(stream);
    }

    function newChatConnection() {

        var ID = byId('connect-to').value;
        console.log(ID);
        console.log('Peer: ' + peer);

        var conn = peer.connect(ID, { reliable: true });

        console.log(conn);

        conn.on('open', function() {

            // Receive messages
            conn.on('data', function(data) {
                console.log('Received', data);
                addRec(data);
            });

            // Send messages
            conn.send('Hello!');
        });

        return conn;

    }

    function newJam() {
        // CALL
        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

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

        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        peer.on('call', function(call) {

            navigator.getUserMedia({video: false, audio: true}, function(stream) {
                call.answer(stream); // Answer the call with an A/V stream.

                call.on('stream', function(remoteStream) {
                    streamAudio(remoteStream);
                });

                }, function(err) {
                    console.log('Failed to get local stream' ,err);
            });
        });

    }

    /* Page Load - Assign Peer ID */
    var peer = new Peer(
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

    //connections = peer.listAllPeers();
    //connection_list.innerHTML = "<p>" + connections + "</p>";

    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
    });

    peer.on('connection', function(conn) {

        conn.on('data', function(data){
            // Will print 'hi!'
            console.log(data);
            addRec(data);
        });

    });

    peer.on('disconnected', function(id) {
        if (reconnect_try_count < 5) {
            console.log('lost connection, attempting to reconnect');

            if (peer.reconnect()) {
                console.log('Reconnected: ID: ' + id);
            }
            else {
                reconnect_try_count++;
            }
        }
    });

    // UI listeners    

    connect.addEventListener('touchstart click', function() {
        connected = newChatConnection();
    }, false);

    send_button.addEventListener('click', function() {
        connected.send(chat_input.value);
    }, false);

    jam.addEventListener('click', function() {
        newJam();
    }, false);

   
}
