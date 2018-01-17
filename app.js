/* app.js - Porchwire Copyright 2018 by Brett Fraley */

const express = require('express');
const http = require('http');
const path = require('path');
const app = express();

const port = process.env.PORT || '3001';
const dist = path.join(__dirname, 'dist');
const indexfile = path.join(__dirname, 'dist/index.html');

app.use(express.static(dist));

app.get('*', (req, res) => {
    res.sendFile(indexfile);
});

app.set('port', port);

const server = http.createServer(app);
server.listen(port, () => console.log('Porchwire'));
