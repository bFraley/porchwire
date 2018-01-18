/* app.js - Porchwire Copyright 2018 by Brett Fraley */

const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const port = process.env.PORT || '3001';

var peerserver = require('peer').ExpressPeerServer;

app.use(express.static(path.join(__dirname, 'dist')));
app.set('port', port);

app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const server = http.createServer(app);
server.listen(port, () => console.log('Porchwire'));

app.use('/porch', peerserver(server));

server.on('connection', () => console.log('peer at /connect'));
