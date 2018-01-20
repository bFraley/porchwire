/* Porchwire Project Copright 2018 */

function byId(name) { return document.getElementById(name); }
function getUserId() { return byId('user').value; }


window.onload = function() {

    function newConnection() {

        var ID = byId('connect-to').value;
        console.log(ID);
        console.log('Peer: ' + peer);

        var conn = peer.connect(ID);

        console.log(conn);



        conn.on('open', function() {

            // Receive messages
            conn.on('data', function(data) {
                console.log('Received', data);
            });

            // Send messages
            conn.send('Hello!');
        });

    }

    var peer = new Peer(
        getUserId(),
        {
            key: 'porchwiredev2018',
            host: 'localhost',
            port: 4200,
            path: '/peerjs',
            debug: 3            
        }
    );

    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
    });

    peer.on('connection', function(conn) {

        conn.on('data', function(data){
            // Will print 'hi!'
            console.log(data);
        });

    });

    let connect = byId('connect');

    connect.addEventListener('click', function() {
        newConnection();
    }, false);
}
