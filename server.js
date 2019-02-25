

"use strict";

//var http = require('http');//appel de la biblio http de nodeJS
var path = require('path');
var bodyParser = require('body-parser');

// initializing express-session middleware
var Session = require('express-session');
var SessionStore = require('session-file-store')(Session);
var session = Session({store: new SessionStore({path: __dirname+'/sessions'}), secret: 'pass', resave: true, saveUninitialized: true});

// creating new express app
var express = require('express');
var app = express();
var server = require('http').Server(app);

app.set('view engine', 'jade');

//app.use(express.static(__dirname + '/views/pong'));//permet de servir les fichiers static qui sont dans views
app.set('views', __dirname + '/views');//template engine initialization (*.jade)
app.use(express.static(__dirname + '/public'));//img, js, css, audio, etc.

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session);

// voir https://github.com/xpepermint/socket.io-express-session/tree/master/example
var ios = require('socket.io-express-session');
var io = require('socket.io')(server);
io.use(ios(session)); // session support

console.log("__dirname="+__dirname);

/*  jeu pong   */
var pong = require('./include/pong/pong.js');
pong(app, io);

/*  js quiz   */
var jsquiz = require('./include/jsquiz/jsquiz.js');
jsquiz(app, io, server);

/*  connect4  game */
var connect4 = require('./include/connect4/connect4.js');
connect4(app, io, server);


var port = process.env['PORT'] || 8080;

server.listen(port, function(){
    var addressHost = server.address().address;
    var portListen = server.address().port;
    console.log('L\'application est disponible à l\'adresse http://%s:%s', addressHost, portListen);
});

/*
 // faire 'sudo mongod' dans un terminal
 // puis 'node server' dans un autre 

 use admin;//on passe sur la base admin
 db.createUser( {user:'root', pwd:'123456', roles:['root'] });//on creer un user administrateur
 db.auth('root','123456');//on se connecte en tans que root
 use blog;//on passe sur la base blog
 db.createUser( {user:'monServerNode', pwd:'098765', roles:[{role:'readWrite',db:'blog' }] });//on creer un user qui va servir à node js pour se connecter à mongodb
 show users;
 //on peut alors fermer la fenetre mongo, par contre il faut garder ouverte la fenetre mongodb car c'est notre serveur mongodb (il ppurrait etre situé sur une autre machine)
 
 pour convertir htlm en jade :  http://html2jade.org/
 

 mettre les .jade dans views; les img , css lib et client.js dans public 

 utiliser https://jqueryui.com/effect/
 //http://code4fun.fr/creer-un-site-simple-avec-node-js-express-et-jade/


 //grep -r "mot" ./repertoire/*
 */
