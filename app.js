/* app.js - Porchwire Copyright 2018 by Brett Fraley */

const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 4200;

const PeerServer = require('peer').ExpressPeerServer;

app.use(express.static(path.join(__dirname, 'dist')));
app.use(bodyParser.json());

app.set('port', port);

let USERS_ONLINE = [];

// Redirect http => https on production
/**
app.all('*', function(req, res, next) {
    if (req.headers['x-forwarded-proto'] != 'https') {
        res.redirect('https://' + req.headers.host + req.url);
    }
    else {
        next();
    }
});
**/

// Home route - page routing handled by Angular
app.get('/', (req, res, next) => { 
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Gets list of online users
app.get('/online', (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    res.send(JSON.stringify(USERS_ONLINE));
    console.log(JSON.stringify(USERS_ONLINE));
});

// HTTP server
const server = http.createServer(app);

var options = {
    debug: true,
    allow_discovery: true,
    path: '/peerjs',
    key: 'porchwiredev2018'
}

// Peerjs server
var Peer = PeerServer(server, options);

app.use('/peerjs', Peer);

server.listen(port);

Peer.on('connection', (id) => console.log(USERS_ONLINE.push({name:id})));

Peer.on('disconnect', function(id) {

    USERS_ONLINE = USERS_ONLINE.filter(function(USERS_ONLINE) {
        return USERS_ONLINE.name !== id;
    });
})
