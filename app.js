/* app.js - Porchwire Copyright 2018 by Brett Fraley */

const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const port = process.env.PORT || 4200;
var ExpressPeerServer = require('peer').ExpressPeerServer;

app.use(express.static(path.join(__dirname, 'dist')));
app.set('port', port);

// Redirect http => https on production

app.all('*', function(req, res, next) {
    if (req.headers['x-forwarded-proto'] != 'https') {
        res.redirect('https://' + req.headers.host + req.url);
    }
    else {
        next();
    }
});

app.get('/', (req, res, next) => { 
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const server = http.createServer(app);

var options = {
    debug: true,
    allow_discovery: true,
    path: '/peerjs',
    key: 'porchwiredev2018'
}

var Peer = ExpressPeerServer(server, options);

app.use('/peerjs', Peer);

server.listen(port);

Peer.on('connection', () => console.log('request connected'));
