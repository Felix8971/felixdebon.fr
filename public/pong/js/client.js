"use strict";

var url = window.location.href;
console.log('url='+url);
if ( url.indexOf("localhost:8080") >=0  ){ 
    var socket = io.connect('http://localhost:8080');//maison
    //var socket = io.connect('http://192.168.104.209:8080');//ifocop
    console.log('DEV');
}else{
    var socket = io.connect('https://www.felixdebon.fr:443');//prod    
    console.log('PROD');
}

var pseudo = '';//utilisée avec ce nom dans Navigation.jade
var speech = '';


// on load of page  
$(function(){//on encapsule dans une fonction anonyme pour isoler le code du scope globale
    //alert('V1');//permet de tester la bonne version en debug
    
    var idSI = {};//stock les id retournés par les setInterval()
    
    var validerIdentifiants = function(login, pwd){
        var msg, valid;//undefined
        var search = /^[a-zA-Z0-9]+$/gi;   
       //var loginOK = search.test(req.body.login);
        if ( !search.test(login) ){
           msg = 'Sorry, your pseudo should not contain any special characters; only letters A-Z and numbers 0-9.';
        }else if ( login.length < 2 ){
           msg = 'Sorry, your pseudo must be at least 2 characters long.';
        }else if ( login.length > 15 ){
           msg = 'Sorry, your pseudo must contain less than 16 characters.';
        }else if ( pwd.length < 4 ){
           msg = 'The password must be at least 6 characters long.';
        }
        if ( msg ){ valid = false; }else{ valid = true;}
        //console.log('msg:'+msg);    
        return {valid:valid, msg:msg}
    }
    
    //Ouvre la modal pour recuperation du pseudo de l'invité (non membre)
    $('#playAsGuestModal').on('show.bs.modal', function (event) {
      var button = $(event.relatedTarget) // Button that triggered the modal
      //var recipient = button.data('whatever') // Extract info from data-* attributes
      //alert(recipient);
      var modal = $(this)
      modal.find('.modal-title').text('Choose a pseudo');
      //modal.find('.modal-body input').val(recipient);
      $('#recipient-name').focus();
    });
    
    //Remplace la chaine de caracteres str1 par la chaine str2 dans la chaine str
    var replaceAll = function(str, str1, str2){
        while( str.indexOf(' ') ){
            str = str.replace(' ','_'); 
        }
        return str;
    }
    
	socket.on('pong.pseudoDispo', function() {
        //alert('pseudoDispo');
        $('#btnPlayAsGuest').hide();
        $('#btnDeconnexion').show();
        $('#profil').append('<img src="../img/ping_pong.png" style="height:30px" alt="avatar"><span class="pseudo" >Guest: '+pseudo+'</span>');
        alert('welcome in pong, now you can use the chat and invite people to play with you !');
        //afficher : welcome in pong you can use the chat and invite poeple to plau with you !
	});    
    
	socket.on('pong.pseudoNonDispo', function() {
        $('#ErrorMsgModal').empty();
        $('#ErrorMsgModal').append('This pseudo is already used, choose another one!');
        setTimeout(function(){$('#playAsGuestModal').modal('show')}, 500);
	});


    //Mise à jour du nombre de challenges dans l'affichage
    var majNbrChallenge = function(){
      var nbr =  $('#tableChallenges tr').length-1;
      $('#nbrChallenges').empty().append(nbr);
      //console.log('nbr='+nbr);
      if ( nbr === 0){
          $('#pasDeDefis td').empty().append("No ongoing challenges...");
      }       
    }  
    
    //Mise à jour du nombre de partie en cours dans l'affichage
    var majNbrGames = function(){
      var nbr =  $('#tableOngoingGames tr').length - 1;
      $('#nbrOngoingGames').empty().append(nbr);
      //console.log('nbr='+nbr);
      if ( nbr === 0 ){
          $('#tableOngoingGames').empty().append('<tr class="active"><td>No ongoing games...</td></tr>');
      }       
    }

    socket.on('pong.ongoingGames', function(rooms) {
        //console.log(rooms);
        $('#tableOngoingGames').empty();
        var ligne = '<thead><tr class="active"><th>PlayerLeft/PlayerRight</th><th>Scores</th></tr></thead>'
        //console.log(ligne);
        $('#tableOngoingGames').append(ligne);   
    
        for ( var i=0;i<rooms.length;i++ ){ 
            if ( rooms[i].jeuEnCours && rooms[i].nbUsersPresents === 2 ){
                if ( rooms[i].paddles[0].pseudo != '' && rooms[i].paddles[1].pseudo != '' ){
                    //console.log('value:'+rooms[i].nbUsersPresents);
                    var ligne = '<tr class="active"><td>' + rooms[i].paddles[0].pseudo + '/' + rooms[i].paddles[1].pseudo+'</td>'
                    + '<td>' + rooms[i].paddles[0].score + '/' + rooms[i].paddles[1].score+'</td></tr>'
                    //console.log(ligne);
                    $('#tableOngoingGames').append(ligne);  
                }
            }
		} 
        majNbrGames();
	}); 

    
    var majTableUSers = function(users){
        var nbUsers = Object.keys(users).length;
        $('#nbrUsers').empty().append(nbUsers-1);
        //console.log('nbUsers='+nbUsers);
        $('#publicUsers').empty();//vide le champ users
       
        $.each(users, function(key, value) {  
            //console.log('value:'+value.pseudo);
            if ( pseudo != '' && value.pseudo != pseudo ){
                var ligneTabUsers = '<tr class="active">'
                + '<td><img src="../img/' + value.avatar + '" alt="avatar"></td>'
                + '<td>' + value.pseudo + '</td>'
                
                if ( value.pseudo === 'LeServer' ){
                    if ( gameIsOpen ){//J'interdit le clic sur le bouton "challenge" du server si je suis en train de jouer 
                        ligneTabUsers += '<td><div class="btn btn-default  btn-xs inactiveBtn" value="">Playing...</div></td>';
                    }else{
                        ligneTabUsers += '<td><input id="'+value.pseudo+'" class="btn btn-primary  btn-xs braveBtn" value="Challenge"></td>';
                    }
                }else{
                    if ( value.dispo ){ 
                        ligneTabUsers += '<td><input id="'+value.pseudo+'" class="btn btn-primary  btn-xs braveBtn" value="Challenge"></td>';
                    }else{            
                        ligneTabUsers += '<td><div class="btn btn-default  btn-xs inactiveBtn" value="">Playing...</div></td>';
                    }
                }
                
                ligneTabUsers += '<td id="info">'+ value.speech +'</td>';
                ligneTabUsers +='</tr>';
                //console.log(ligneTabUsers);
                $('#publicUsers').append(ligneTabUsers);  
            }
		});
        

        $('.braveBtn').click( function() {  
            //alert('Defis lancé à ' + this.id);//dans l'id il y a le pseudo du jouer que l'on veut defier
            var defie = this.id;  
            if ( !$('#waitingFor-'+defie).length ){
                socket.emit('pong.defier', pseudo, defie);
                var ligneDefis = '<tr id="waitingFor-'+ defie +'" ><td> You challenge '+ defie +' : waiting for answer...</td><td>.</td><td>.</td></tr>'            
                $('#tableChallenges').append(ligneDefis);  
                idSI[pseudo+this.id] = setInterval(function(){//on fait clignoter la ligne à l'aide de la classe danger de bootstrap
                    if ( $('#waitingFor-'+defie+'.danger').length ){
                        $('#waitingFor-'+defie).removeClass('danger');
                    }else{
                        if ( $('#waitingFor-'+defie).length ){
                            $('#waitingFor-'+defie).addClass('danger');
                        }
                    }
                }, 350);
                majNbrChallenge();
                $('html, body').animate({scrollTop: $('#challenges').offset().top - 150}, 'slow');
            }    
        });        
    }
	
	socket.on('pong.defis', function(defiant, defie){
        if ( defie === pseudo ){//je suis la personne que defiant a defié 
            console.log('Defis recu de la part de '+ defiant);
            playBruitage('pipe');
            //$('#pasDeDefis').hide();
            var ligneDefis = '<tr id="defiFrom-'+ defiant +'" ><td>' + defiant +' challenge you :</td>'
            ligneDefis += '<td><input id="accept-'+defiant+'" class="btn btn-primary  btn-xs accept challengeBtn" value="Accept"></td>';
            ligneDefis += '<td><input id="decline-'+defiant+'" class="btn btn-primary  btn-xs decline challengeBtn" value="Decline"></td>';
            ligneDefis += '</tr>'            
            $('#tableChallenges').append(ligneDefis);
            majNbrChallenge();
             
            idSI[defiant+defie] = setInterval(function(){//on fait clignoter la ligne à l'aide de la classe danger de bootstrap
                //var element = $('#defiFrom-'+defiant+'.danger');
                if ( $('#defiFrom-'+defiant+'.danger').length ){
                    $('#defiFrom-'+defiant).removeClass('danger');
                }else{
                    if ( $('#defiFrom-'+defiant).length ){
                        $('#defiFrom-'+defiant).addClass('danger');
                    }
                }
            }, 350);  
            var offset = parseInt($('#challenges').offset().top - 150); 
            $('html, body').animate({scrollTop: offset}, 'slow');//il faut viser html et body sinon it doesn't work on Firefox 
            //Je refuse le defis de defiant
            $('#decline-'+defiant).click( function() {  
                $('#defiFrom-'+defiant).remove();
                majNbrChallenge();
                //alert('Defis refusé avec ' + defiant); 
                socket.emit('pong.defiDecline', defiant, defie );
                clearInterval(idSI[defiant+defie]);//pour arreter le clignotement
            });             
            
            //J'accepte le defis de defiant
            $('#accept-'+defiant).click( function() {  
                $('#defiFrom-'+defiant).remove();
                majNbrChallenge();
                //alert('Defis refusé avec ' + defiant); 
                socket.emit('pong.defiAccept', defiant, defie );
                clearInterval(idSI[defiant+defie]);//pour arreter le clignotement
                //Lancer la partie
                //gameIsOpen = true;
                
            });             
        }
	});    

	socket.on('pong.defiDecline', function(defiant, defie){ 
        if ( defiant === pseudo ){
            $('#waitingFor-'+defie).remove();
            majNbrChallenge();
            alert(defie + ' refused your challenge.');
        }
	});

	socket.on('pong.defiAccept', function(defiant, defie){ 
        if ( defiant === pseudo ){//si defie a accepté mon defis
            $('#waitingFor-'+defie).remove();
            playBruitage('powerUp8');
            majNbrChallenge();        
        }
	});
    
	socket.on('pong.roomDispo', function(data){ 
        if ( data.defiant === pseudo || data.defie === pseudo ){//si 'defié' a accepté mon defis
            console.log('roomDispo:'+ data.defiant + ' ' + data.defie + ' ' + data.idRoom);   
            $('#waitingFor-'+data.defie).remove();
            majNbrChallenge();
            idRoom = data.idRoom;  
            //Lancer la partie
            gameIsOpen = true;
            socket.emit('pong.goInRoom', pseudo, data);
        }
	});

	socket.on('pong.removeFromChallengeList', function(data){ 
        console.log('removeFromChallengeList:'+ data.defiant + ' ' + data.defie + ' ' + data.idRoom);   
        $('#waitingFor-'+data.defiant).remove();
        $('#defiFrom-'+data.defiant).remove();
        $('#waitingFor-'+data.defie).remove();
        $('#defiFrom-'+data.defie).remove();
        majNbrChallenge();    
	});
    
	socket.on('pong.connect', function(users){//recu des que le client accede à l'url du site 

	});
    
	$('#btnDeconnexion').click( function() {  
		socket.emit('pong.deconnexion');
        pseudo = '';
		$('#btnDeconnexion').hide();
        $('#profil').empty();
		$('#btnPlayAsGuest').show();
	});
	
    //Quelqu'un s'est deconnecté (pseudo) 
	socket.on('pong.deconnexion', function(pseudo) {
        console.log('deconnexion de '+ pseudo);
        //si il est dans mes defis en attente je l'enleve
        if ( $('#defiFrom-'+pseudo).length ){
            $('#defiFrom-'+pseudo).remove();
        }
        if ( $('#waitingFor-'+pseudo).length ){
            $('#waitingFor-'+pseudo).remove();
        }         
	});
	
	/* ---------------- PARTIE PUBLIC CHAT  --------------------------*/ 

	socket.on('pong.updatePublicUsers', function(users) {
        //console.log('updatePublicUsers');
        majTableUSers(users);
	});

	//Au clic sur le bouton envoyer un message de type "sendPublicMsg" au serveur
	$('#publicEnvoyer').click(function () {
		if ( pseudo != '' ){
			derniereActiviteeConnue = (new Date()).getTime();
			console.log($('#publicMsg').val());
			var message = $('#publicMsg').val();
			socket.emit('pong.sendPublicMsg', message );//j'envoi au serveur le contenu de l'input d'id = data 
			$('#publicMsg').val('');
		}else{
            alert('You\'re not connected !');
        }
	});
	
    
	$('#publicMsg').keypress(function(event) {  
		if(event.which === 13) {//touche enter  
			$(this).blur();//on enleve le focus à $('#privateMsg') 
			//on donne le focus au bouton et on simule un clic  
			$('#publicEnvoyer').focus().click();
		}  
	}); 	
	
	socket.on('pong.updatePublicChat', function(username, data) {
		//alert('Le serveur a un message pour vous : ' + data);
        console.log('updatePublicChat');
		if ( username.trim() !== '' && data.trim() != '' ){
			$("#publicChat").animate({ scrollTop: $('#publicChat').height()}, $('#publicConversation').height());//on scroll vers le bas pour que les messages soient tjrs visibles 
			if ( username === 'SERVER' ){
				console.log('username:'+ username + ' ' + data);
				$('#publicConversation').append('<span style="color:blue"><b>SERVER:</b> '+ data + '</span><br>');  
			}else{
				console.log('username:'+ username + ' ' + data);
				$('#publicConversation').append('<b>'+username + ':</b> ' + data + '<br>'); 
			}
		}
        
	});	
	
	
    /* ---------------- PARTIE PRIVATE CHAT  --------------------------*/ 

	//Au clic sur le bouton, envoyer un message de type "sendMessage" au serveur
	$('#privateEnvoyer').click(function () {
        if ( !pseudo ){
            alert('You\'re not connected !');
        }else{
            if ( gameIsOpen ){
                derniereActiviteeConnue = (new Date()).getTime();
                console.log($('#privateMsg').val());
                var message = $('#privateMsg').val();
                socket.emit('pong.sendPrivateMsg', message );//j'envoi au serveur le contenu de l'input d'id = data 
                $('#privateMsg').val('');
            }else{
                 alert('You have to be playing ping-pong to use this stuff... I know, you cannot chat when you are playing, but if you are losing you can always try to distract your opponent...');
            }
        }
	});

	$('#privateMsg').keypress(function(event) {  
		if(event.which === 13) {//touche Enter  
			$(this).blur();//on enleve le focus à $('#privateMsg') 
			//on donne le focus au bouton et on simule un clic  
			$('#privateEnvoyer').focus().click();
		}  
	}); 
	
	socket.on('pong.updatePrivateChat', function(username, data) {
		//console.log('data='+data + ' username='+username);//console.log('typeof data='+typeof data + ' typeof username='+ typeof username);
		if ( username.trim() !== '' && data.trim() != '' ){
			$("#chatPong").animate({ scrollTop: $('#chatPong').height()}, $('#privateConversation').height());//on scroll vers le bas pour que les messages soient tjrs visibles 
			if ( username === 'SERVER' ){
				//console.log('username:'+ username + ' ' + data);
				$('#privateConversation').append('<span style="color:gray;font-style:italic;"> SERVER: '+ data + '</span><br>');  
			}else{
				//console.log('username:'+ username + ' date:' + data);
				$('#privateConversation').append('<b>'+username + ':</b> ' + data + '<br>');
			}
		}
	});
	

    /* --------------------- PARTIE JEU PONG --------------------------*/ 
	
    var nbLine = 0;
	//var socket = io.connect('http://192.168.104.209:8080');//ifocop

	var CANVAS_WIDTH = 600;
	var CANVAS_HEIGHT = 439;//400;
	
	var gameIsOpen = false;
	var chatIsOpen = false;
    var typeOpponent = 'human';//ou 'computer'
    
    var idRoom = -1;
	
    var myPaddle = {
        Side: 0,
        X: 0,
        Y: CANVAS_HEIGHT/2-CANVAS_HEIGHT/8,
        H: CANVAS_HEIGHT/8,
        W: CANVAS_HEIGHT/25
    };
    
	var scoreLeft = 0, scoreRight = 0;
	var joueurGauche, joueurDroite;
	var derniereActiviteeConnue = (new Date()).getTime();
    var canvas, ctx;
    
	//Initialisation des objets canvas et context
	var initCanvas = function() {
		//On cree l'objet canvas et son context.
		if(typeof canvas === 'undefined'){
			canvas = document.getElementById('gameCanvas');
			if(!canvas){
				alert("Impossible de récupérer le canvas!");
				return;
			}
		}
		
		if(typeof ctx === 'undefined'){
			ctx = canvas.getContext('2d');
			if(!ctx){		
				alert("Impossible de récupérer le context du canvas!");
				return;
			}
		}
	};
	
	
	var reinitGame = function(){
		
		//pseudo = '';
        idRoom = -1;
		//myPaddle.Side = 0;
		gameIsOpen = false;
		//chatIsOpen = false;
		scoreLeft = 0; scoreRight = 0;
		myPaddle.Y = CANVAS_HEIGHT/2-CANVAS_HEIGHT/8;
		myPaddle.X = 0;
		scoreLeft = 0, scoreRight = 0;
		joueurGauche = '';
		joueurDroite = '';
		etatGame = {//va contenir les info geometriqes du jeu
			paddle:{//paddle de l'adversaire
				x : 0,
				y : CANVAS_HEIGHT/2-CANVAS_HEIGHT/8,
				h : CANVAS_HEIGHT/8,
				w : CANVAS_HEIGHT/25
			},
			
			balle:{
				x : CANVAS_WIDTH/2 - (CANVAS_HEIGHT/20)/2,
				y : CANVAS_HEIGHT/2 - (CANVAS_HEIGHT/20)/2,
				h : CANVAS_HEIGHT/20,
				w : CANVAS_HEIGHT/20
			}
		};	
        clearZone(ctx, 'black' , 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);    
	}
	
	var etatGame = {//va contenir les info geometriqes du jeu
	
		paddle:{//paddle de l'adversaire
			x : 0,
			y : CANVAS_HEIGHT/2-CANVAS_HEIGHT/8,
			h : CANVAS_HEIGHT/8,
			w : CANVAS_HEIGHT/25
		},
		
		balle:{
			x : CANVAS_WIDTH/2 - (CANVAS_HEIGHT/20)/2,
			y : CANVAS_HEIGHT/2 - (CANVAS_HEIGHT/20)/2,
			h : CANVAS_HEIGHT/20,
			w : CANVAS_HEIGHT/20
		}
	};
	
	//Centrage de a dans b (a est en position absolute), a et b sont des objets jquery de type $('#id')
	var centrage = function(a, b){
		//a.show();
		var y = b.offset().top;
		var x = b.offset().left;
		var h = b.height();
		var w = b.width();
		a.css('top', y + h/2 - a.height()/2).css('left', x + w/2 - a.width()/2);
	};
	
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

	 /* Règle le problème du requestAnimationFrame sous Safari windows*/
	(function() {
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}

		if (!window.requestAnimationFrame){
			window.requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout( function() { callback(currTime + timeToCall); }, timeToCall );
				lastTime = currTime + timeToCall;
				return id;
			};
		}
		if (!window.cancelAnimationFrame){
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			};
		}
	})();
	
	//Efface la zone de dessin
	var clearZone = function(context, color, x , y , w, h){
		if ( context ){
			context.clearRect(x, y, CANVAS_WIDTH, CANVAS_HEIGHT);
			//on redessine le jeu 
			context.fillStyle = color;
			context.fillRect(y, y, CANVAS_WIDTH, CANVAS_HEIGHT);
		}else{
			alert("context non defini!");
		}
	};	

    var fontCanvas = ' akashi-webfont';
    
	//Affiche du texte dans le canvas avec un certain nombre d'options utiles
	var afficheText = function(text, x, y, color, fontSize, opacity) {
	  if (typeof color !== 'undefined'){ ctx.fillStyle = color; }
	  if (typeof fontSize !== 'undefined'){ ctx.font = fontSize + 'px ' + fontCanvas; }
	  if (typeof opacity !== 'undefined'){ ctx.globalAlpha = opacity; }
	  ctx.fillText(text, x, y);
	  ctx.globalAlpha = 1;//on remet l'opacité à sa valeur initiale pour ne pas altérer les autres images attachées au context
	};
	
 
    var getPaddlePos = function(event){
		//Si l'échelle dans le canvas n'est pas la même que dans le DOM on introduit un facteur d'échelle
		//var facteurX = (CANVAS_WIDTH/parseFloat($('#gameCanvas').width()));
		//var facteurY = (CANVAS_HEIGHT/parseFloat($('#gameCanvas').height()));
		//mouseX = (event.clientX  - $('#gameCanvas').offset().left);
		//myMouseY = (event.clientY  - $('#gameCanvas').offset().top);
		var x = event.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft);
        var y = event.clientY + (document.body.scrollTop || document.documentElement.scrollTop);
        
        
		var x = x  - $('#gameCanvas').offset().left;
		var y = y  - $('#gameCanvas').offset().top;
		
		//Le paddle est confiné dans son coté du terrain de jeu 
		if ( y < 0 ){ 
			y = 0;
		}else if ( y >= CANVAS_HEIGHT - myPaddle.H ){ 
			y = CANVAS_HEIGHT - myPaddle.H
		};
		
		if ( myPaddle.Side === 0){//Je joue à gauche et mon adversaire à droite
			if ( x < 0 ){ 
				x = 0;
			}else {
				var xMax = CANVAS_WIDTH/2 - 3*myPaddle.W;
				if ( x > xMax ){ 
					x = xMax;
				}
			}		
		}else{//le contraire
			var xMax = CANVAS_WIDTH - myPaddle.W;
			if ( x >  xMax){ 
				x = xMax;
			}else{
				var xMin = CANVAS_WIDTH/2 + 2*myPaddle.W ;
				if ( x < xMin ){ 
					x = xMin;
				}
			}	
		}
		
		myPaddle.X = x;
		myPaddle.Y = y;   
        //console.log('x:'+ event.clientX + ' y:'+event.clientY);    
    }
 
    var t = (new Date()).getTime(), t0 = 0;
     
    //var lastPaddleX, lastPaddleY;


	//Quand on bouge la souris on envoit sa position au serveur 
	var onMousemoveEmit = function(event){
        //prv_t = t; 
        t = (new Date()).getTime();
        getPaddlePos(event);
        //if ( lastPaddleX )
        if ( t > t0 + 150){
            //console.log('t-prv_t='+(t-prv_t));
            socket.emit('pong.updatePaddle', {x:myPaddle.X, y:myPaddle.Y, side:myPaddle.Side} );
            t0 = t; 
        }
	}; 
	 
	
	//Redessine tous les objets du canvas
	var draw_all = function(){
        
		//Nettoyage du canvas
		clearZone(ctx, 'black' , 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	
		//Noms des joueurs
		afficheText(joueurGauche, 50, CANVAS_HEIGHT - 10, 'gray', 25, 1);
		afficheText(joueurDroite, CANVAS_WIDTH - 150, CANVAS_HEIGHT - 10, 'gray', 25, 1);

		//Scores
		afficheText(scoreLeft, CANVAS_WIDTH/2-110, 80, 'white', 90, 1);
		afficheText(scoreRight, CANVAS_WIDTH/2 + 55, 80, 'white', 90, 1);
		
		//Ligne de séparation milieu de terrain
		ctx.setLineDash([10, 10]);
		ctx.beginPath();
		ctx.moveTo(CANVAS_WIDTH/2,0);
		ctx.lineTo(CANVAS_WIDTH/2,CANVAS_HEIGHT+20);
		ctx.lineWidth="8";
		ctx.strokeStyle="gray";
		ctx.stroke();
		ctx.setLineDash([]);
        
		ctx.fillStyle = 'white';
		//Dessine mon paddle 
		//console.log('myPaddle:  x='+game.myPaddle.X + ' y='+game.myPaddle.Y + ' w='+game.myPaddle.W + ' h=' +game.myPaddle.H );
		ctx.fillRect(myPaddle.X, myPaddle.Y, myPaddle.W, myPaddle.H);

		//Dessine le paddle de mon adversaire 
		//console.log('hisPaddle:  x='+etatGame.paddle.x + ' y='+etatGame.paddle.y + ' w='+etatGame.paddle.w + ' h=' +etatGame.paddle.h );
		ctx.fillRect(etatGame.paddle.x, etatGame.paddle.y, etatGame.paddle.w, etatGame.paddle.h);
		
		//Dessine la balle
		//ctx.fillRect(etaGame.balle.x, etatGame.balle.y, 16, 16);
		ctx.lineWidth="0";
		ctx.beginPath();
		ctx.arc(etatGame.balle.x+etatGame.balle.w/2,etatGame.balle.y+etatGame.balle.h/2,8,0,2*Math.PI);
		ctx.fill();
	};
	
	var animation = function() {
		//Le code des animations client ici... (eventuellement sprite joué coté client)
		if ( gameIsOpen ){
			draw_all();//Redessine tous les éléments du canvas 
            if ( typeOpponent === 'computer' ){
                
            }
			requestAnimationFrame(animation);//recursivité
		}else{
            //alert("sortie de la boucle animation client");
			return 0;
		}
        //console.log('animation...');
	};
	
	var LancerJeu = function(){
		//console.log('LancerJeu');
        //alert('LancerJeu')
		$('#mire').hide();
        $('#gameCanvas').show();
		$('#gameCanvas').addClass('noCursor');
		gameIsOpen = true;
		chatIsOpen = true;
		
        $('#privateChatCadre').show();//$("#privateChatCadre").animate({ height: 'toggle' },2000);
        
		initCanvas();
		
		animation();
		//recoit l'objet game du server et met à jour l'affichage 
		//+ mise à jour en direct de la position du paddle du client avec un emit de sa position si il bouge 
		
        //if ( typeOpponent === 'human' ){
            $('#wait').hide();
            //des que le serveur envoit une mise à jour on met à jour de l'objet game 
            socket.on('pong.updateGame', function(serverEtatGame){
                //console.log('recoit updateGame');
                etatGame.balle.x = serverEtatGame.x;
                etatGame.balle.y = serverEtatGame.y;
            });
            
            //Je recois du serveur la position de mon adversaire  
            socket.on('pong.updateMouse', function(mouse, room ){
				if ( idRoom === room ){//corrige un gros bug
					//console.log('mouse.side='+mouse.side);
					//si la position de souris que je recois est celle de mon adversaire 
					//alors je mets à jour son paddle pour le voir bouger chez moi 
					if ( myPaddle.Side != mouse.side){
						etatGame.paddle.x = mouse.x;
						etatGame.paddle.y = mouse.y;
					}
				}
            });
        //}
		
	};
	
	$('#playBtn').click( function() {  
        //envoyer le clic au server
        socket.emit('pong.ClicPlay', '');
        hideAllBtn();
        $('#wait').show();//Afficher message 'wait for your opponent to clic play' si le server a enregisdter un seul clic
        $('#resignBtn').show();
        // le server devra incrementer une variable nbClicPlay, dès que nbClicPlay === 2 le 
        // server envera un emit aux clients pour dire que la partie commence
        // à reception de ce message lancer la fontion LancerJeu() qui va lancer l'animation 
	 });

	$('#SoundOnBtn').click( function() {  
		desactivateAudio = false;
        playBruitage('switch');
        desactivateAudio = true;
        $('#SoundOnBtn').hide();
		$('#SoundOffBtn').show(); 
	 });
     
	$('#SoundOffBtn').click( function() {  
        desactivateAudio = false;
        playBruitage('switch');
		$('#SoundOffBtn').hide();
		$('#SoundOnBtn').show();        
	});
    
	$('#reloadBtn').click( function() {  
 		//$('#WaitForOpponentBtn').show();
		//$('#reloadBtn').hide();
		socket.emit('pong.adduser', pseudo);
	});

	$('#resignBtn').click( function() {  

        if ( gameIsOpen ){  
            if ( confirm('Are you sure you want to resign and let your opponent win ?') ){
                //victory(Math.abs(myPaddle.Side-1));//victoire de mon adversaire
                socket.emit('pong.resign', Math.abs(myPaddle.Side-1));
                //On supprime la gestion de l'évènement click car on va 
                //rappeller la meme fonction animation au prochain niveau 
                $(document).off('mousemove');  
                //reinitGame();
                //chatIsOpen = false;
            }
        }else{
           alert('No game running...');
        }
	});
	
	var hideAllBtn = function(){
		//$('#reloadBtn').hide();
		$('#playBtn').hide();
		//$('#WaitForOpponentBtn').hide();
		$('#wait').hide();
	} 
	
	
	// -----------------------------------------------------------  
	// ------- Gestion des evenenements venant du serveur -------- 
	// ----------------------------------------------------------- 
	
	socket.on('pong.fermerPartie', function() {
        console.log('fermerPartie');
		if ( gameIsOpen ){  
            console.log('gameIsOpen fermerPartie');
            reinitGame();
            chatIsOpen = false;
            socket.emit('pong.fermerPartie');
        }
	});

	socket.on('pong.pasDeRoomDispo', function() {
		alert('The server is full, please try again in a few minutes...'); 
		hideAllBtn();
		//$('#reloadBtn').show();
	});

	socket.on('pong.pseudos', function( gauche, droite ) {
		//alert(gauche+ ' ' + droite)
		joueurGauche = gauche;
		joueurDroite  = droite;
	});
	
	socket.on('pong.readyToStartGame', function() {
		hideAllBtn();
		$('#playBtn').show();
        
        var id = $(this).attr("href");
        //var offset = $('#phraseAccueil').offset().top; 
        $('html, body').animate({scrollTop: 170}, 'slow'); 
        socket.emit('pong.indispo',pseudo);    
		//centrage($('#playBtn'),$('#gameCanvas'));
	});
		
	socket.on('pong.updateScoreLeft', function(score) {
        console.log('updateScoreLeft');
		scoreLeft = score;
	});
	
	socket.on('pong.updateScoreRight', function(score) {
        console.log('updateScoreRight');
		scoreRight = score;
	});

    
    var victory = function(winnerSide){
        //alert('gameIsOpen:'+gameIsOpen);
		if ( gameIsOpen ){
            //alert('execute victory(): winnerSide:'+winnerSide + ' myPaddle.Side=' +myPaddle.Side);
            gameIsOpen = false;//pour arreter la boucle animation
            derniereActiviteeConnue = (new Date()).getTime();
            var msg;
            if ( winnerSide === myPaddle.Side ){
                msg = 'You win the game !';
                playBruitage('victory');
            }else{
                msg = 'You lose the game !';
                playBruitage('gameOver');
            }

            //afficher WIN + 'play again' et 'Reset' du coté du joueur qui a gagné
            /*if ( winnerSide === 1 ){//Le joueur de droite a gagné
                afficheText('WIN', CANVAS_WIDTH/2 + 50 , CANVAS_HEIGHT/2, 'white', 100, 1);
            }
            if ( winnerSide === 0 ){//Le joueur de gauche a gagné
                afficheText('WIN', 100, CANVAS_HEIGHT/2, 'white', 100, 1);
            }*/
            hideAllBtn();
            alert(msg);
            reinitGame();//on remet le jeu dans son etat initial 
            //clearZone(ctx, 'black' , 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            //Retour dans le chat public
            socket.emit('pong.comeBackAfterAGame', pseudo);
            $('#resignBtn').hide();
            $('#gameCanvas').removeClass('noCursor');
            $('#gameCanvas').hide();
            $('#mire').show();
            
        }        
    }
    
	socket.on('pong.winner', function(winnerSide){
        //alert(pseudo + 'recoit winner');
        console.log(pseudo + 'recoit winner');
         $(document).off('mousemove');  
        victory(winnerSide);
        //$('#privateChatCadre').css({opacity:0.5});
        $("#privateChatCadre").hide();
        //$("#privateChatCadre").animate({ height: 'toggle' },2000);
	});
	
	//Quand les 2 joueurs ont cliqué sur play le serveur doit envoyer un startGame que l'on recoit ici
	socket.on('pong.startGame', function(room){
        if ( gameIsOpen && room === idRoom ){
            //alert('startGame');
            scoreLeft = 0; scoreRight = 0;
            //myPaddle.Side definie donc on peut initialiser l'objet game
            if ( myPaddle.Side === 0){//Je joue à gauche et mon adversaire à droite
                myPaddle.X = 30;
                //etatGame.paddle.x  = CANVAS_WIDTH - 30 - CANVAS_HEIGHT/20;
            }else{//Je joue à droite et mon adversaire à gauche
                myPaddle.X = CANVAS_WIDTH - 30 - CANVAS_HEIGHT/20;
                //etatGame.paddle.x  =  30; 
            }
            
            //myPaddle.X = myX;
            myPaddle.Y = CANVAS_HEIGHT/2-CANVAS_HEIGHT/8;
            myPaddle.H = CANVAS_HEIGHT/8;
            myPaddle.W = CANVAS_HEIGHT/25;
            
            //game etant definie je peux commencer à mettre à jour game.myPaddle si la souris bouge
            $(document).mousemove(onMousemoveEmit);
            $("#privateChatCadre").show();
            LancerJeu();
        }
	});
    
    
	//le serveur dit au client de quel coté il va jouer (droite ou  gauche) 
	socket.on('pong.side', function(side, pseudo){
		//alert('side='+side);
		console.log( ' I ' + side);
		if ( side === 'PlayOnLeft' ){
			myPaddle.Side = 0;
		}else{
			myPaddle.Side = 1;
		}
	});

	
	var bruitagesPause = false;
    var desactivateAudio = false;
    
    var playBruitage = function(id, volume){
        if ( desactivateAudio ){ return 0; }
        if ( !bruitagesPause && id ){
          if ( volume === undefined ){
              volume = 1; //console.log('volume undefined')
          }
          var myAudio = document.getElementById(id);
          if( myAudio ){
            myAudio.volume = volume*1;
            myAudio.play();
          };
      }
    };    


	//le serveur dit au client de jouer un son  
	socket.on('pong.bruitage', function(data){
        if ( gameIsOpen && data.room === idRoom ){
            //console.log('son='+son);
            playBruitage(data.son, data.volume);
        }
	});	
	
    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })

});
