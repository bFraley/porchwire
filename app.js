/* app.js - Porchwire Copyright 2018 by Brett Fraley */

const express = require('express');
const http = require('http');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'dist')));
app.set('port', process.env.PORT || '3001';);

app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const server = http.createServer(app);
server.listen(port, () => console.log('Porchwire'));
