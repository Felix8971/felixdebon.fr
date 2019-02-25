"use strict";

//var pongGame = pongGame || {};

var url = window.location.href;
console.log('url='+url);
if ( url.indexOf("localhost:8080") >=0  ){ 
  var socket = io.connect('http://localhost:8080');//maison
  //var socket = io.connect('http://192.168.104.209:8080');//ifocop
  console.log('DEV');
  var home = 'http://localhost:8080';
} else {
  var socket = io.connect('https://www.felixdebon.fr:443');//prod    
  console.log('PROD');
  var home = 'https://www.felixdebon.fr';
};

//var pseudo = '';//utilisée avec ce nom dans Navigation.jade

//à declarer en dehors
var deletePost = function(id){
  socket.emit('delete-post', id);
};

var deleteMessage = function(id){
  socket.emit('delete-message', id);
};

var deleteDiscussion = function(id){
  if ( confirm('Supprimer cette discussion ? Confirmez SVP') ){
    socket.emit('delete-discussion', id);
  }
};

// (function(){
//   var x = 321;
// })();

var deleteQuiz = function(id){
  if ( confirm('Supprimer ce quiz ? Confirmez SVP') ){
    socket.emit('delete-quiz', id);
  }
}

var deleteQuestion = function(id){
  if ( confirm('Supprimer cette question ?') ){
    socket.emit('delete-question', id);
  }
}

//Le client dit au server qu'il veut ouvrir un nouveau chat avec le pseudo <cible>
var openChat = function(cible){
   console.log('cible='+cible);
   socket.emit('openNewChat', cible);
}

var closeChat = function(id){
  console.log('closeChat id='+id);
  $("#chat-window-"+id).remove();  
  socket.emit('sortirDuChat',id);
  //prevenir les participants au chat que j'ai quitté le chat _id 
  //socket.emit('delete-post', id);
}

//Reduit les fenetres de chat
var iconifyChat = function(id){
  console.log('iconifyChat');
  $(".img-iconify-chat").css('display','none');
  $(".img-expend-chat").css('display','block');
  $(".chat-window").css({"height":"30px"});
  eraseCookie('jsquiz_iconifyChat');
  createCookie('jsquiz_iconifyChat', "yes", 1);
}

//Agrandissement de toutes les fenetres de chat
var expendChat = function(id){
  console.log('expendChat');
  $(".img-iconify-chat").css('display','block');
  $(".img-expend-chat").css('display','none');
  $(".chat-window").css({"height":"300px"});
  eraseCookie('jsquiz_iconifyChat');
  createCookie('jsquiz_iconifyChat', "no", 1);
}


//pour gerer le gif de loading
$(window).load(function() {
  //$('#loading').hide();
  //Demande au serveur si il y a des messages non lus
  socket.emit('get-messages-non-lus',{});
});

//Affichage de la zone de saisie pour ajouter un ami à une discussion en cours
var addFriendToChat = function(id){
  $("#addFriend-zone-"+id).toggle();
}

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}

var createNewChatWindow = function(id, cible, option){

  //le client rejoins la room du chat 
  //socket.join(id);//nom de  room  = id du chat 
  //alert('createNewChatWindow');
  console.log('cible='+cible);

  var nbChatWindow =  $('div[id^="chat-window"]').length;
  console.log('nbChatWindow='+nbChatWindow);

  
  var element = ''
  +'<div class="chat-window" id="chat-window-'+ id +'" style="display: block;">'
    +'<div class="chat-header-zone">'
      +'<b class="cible" style="cursor:pointer;font-size:1.3em;margin:3px;">'+ cible +'<i class="fa fa-comments fa-lg" style="margin-left:6px;"></i></b>'        
      +'<img src="../../jsquiz/img/closeWhite.png" onclick="closeChat(\''+ id +'\')" title="Fermer l\'onglet" class="img-quit-chat">'
      +'<img src="../../jsquiz/img/down.png" onclick="iconifyChat(\''+ id +'\')" title="Iconifier tout" id="iconify-'+ id +'" class="img-iconify-chat">'
      +'<img src="../../jsquiz/img/up.png" onclick="expendChat(\''+ id +'\')" title="Ouvrir tout" id="expend-'+ id +'" class="img-expend-chat">'
      //+'<img src="jsquiz/img/addFriendTochatIcon3.png" onclick="addFriendToChat(\''+ id +'\')" title="Ajouter des amis à la discussion" class="img-add-friends-chat">'
    +'</div>'
    + '<div class="chat-addFriend-zone" id="addFriend-zone-'+ id +'">'
      +'<input id="inputAddFriend-' + id + '" placeholder="Ajouter des amis à cette discussion..." type="text" class="addFriend-input-zone">'
      +'<input class="btn-add-friend btn btn-info btn-xs"  type="button" value="OK" >'    
    +'</div>'
    +'<div class="chat-display-zone"></div>'
    +'<input id="inputChat-' + id + '" placeholder="Entrez un message..." type="text" class="chat-input-zone">'
  +'</div>';

  //insertion de element dans le div #chats-container
  $(element).appendTo('#chats-container');

  console.log('element='+element);
  socket.emit('entreDanRoom', id, option);


  //Une fois le html generé je peux lui associer un evenement 
  $('#inputChat-'+id).keypress(function(event){  
    if(event.which === 13) {//touche Enter 
      //var jquery_object = jQuery(dom_element);
      //var parentId = $(this).parent().attr('id');
      var text = $(this).val();
      
      var id = event.target.getAttribute('id');
      
      var idChat = (id.split('-'))[1];

      console.log(text);
      console.log(idChat);
      socket.emit('newMsgChat', idChat, text );//j'envoi au serveur le text à afficher dans la chat id
      $(this).val('');//je vide l'input 
 
    }
  });    

}

//on recoit du serveur l'id du nouveau chat et la cible pour afficher la chat window 
socket.on('createNewChatWindow', function(id, cible){
  console.log("cible:::"+cible); 
  createNewChatWindow(id, cible, true);
});

//Le client recoit une invitation a chatter 
socket.on('invitationChat', function(data){

   //console.log(data.pseudo  + ' vous invite à rejoindre le chat '+ data._id);
  if ( confirm(data.pseudo  + ' vous invite à rejoindre le chat. Confirmez SVP') ){
    createNewChatWindow(data.id , data.pseudo, true);

    //on envoit une demande de mise à jour du contenu du chat car on peut 
    //avoir envoyé un message avant que l'interlocuteur accepte le chat
    socket.emit('askMajChat',data);

  }else{
    socket.emit('refusChat',data.id);
  }
});


//Charge tous les messages du chat dans chat-display-zone
socket.on('majChat', function(docs){ 
  for (var i=0;i<docs.length;i++){
    if ( docs[i].pseudo != 'SERVER' && docs[i].display === 'yes' ){
      console.log(docs[i].pseudo + ':'+  docs[i].msg + '('+docs[i].date+')');
      $("#chat-window-"+docs[i].id + " > .chat-display-zone").append('<b>'+docs[i].pseudo+':</b> ' + docs[i].msg + '<br>');  
    }
  }
});


//un client a ajouté un message dans un chat 
socket.on('addMsgChat', function(data){   
 
  var display_zone = $("#chat-window-"+data.id + " > .chat-display-zone");
  
  //Insere le nouveau message
  display_zone.append('<b>'+data.pseudo+':</b> ' + data.msg + '<br>');  

  //Scroll vers le bas pour que le dernier message soit visible 
  display_zone.scrollTop(display_zone[0].scrollHeight);
  
});


var chatInfoMessage = function(data){
  console.log(data.msg);
  var display_zone = $("#chat-window-"+data.id + " > .chat-display-zone");
  //Insere le nouveau message
  display_zone.append('<span style="color:'+data.color+'"><b>'+data.msg+ '</b></span><br>');  
  //Scroll vers le bas pour que le dernier message soit visible 
  display_zone.scrollTop(display_zone[0].scrollHeight);
}

//message d'information du serveur dans un des chats
socket.on('infoServer', function(data){   
  chatInfoMessage(data);
});



var deleteCommentaire = function(str){
  //alert(str);
  //on determine le parent du div commentaire qui contient l'id du post
  
  var idComment = (str.split('-'))[0];
  var idParent = (str.split('-'))[1];

  console.log('idParent='+idParent);
  console.log('idComment='+idComment);
  var data = {idComment:idComment, idParent:idParent};
  socket.emit('delete-commentaire', data);
}


// on load of page  
$(function(){//on encapsule dans une fonction anonyme pour isoler le code du scope globale
    //alert('V1');//permet de tester la bonne version en debug
  
  var idSI = {};//stock les id retournés par les setInterval()
    
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
    
  var validerIdentifiants = function(pseudo, pwd){
      var msg, valid;//undefined
      var search = /^[a-zA-Z0-9]+$/gi;   
     //var pseudoOK = search.test(req.body.pseudo);
      if ( !search.test(pseudo) ){
         msg = 'Sorry, your pseudo should not contain any special characters; only letters A-Z and numbers 0-9.';
      }else if ( pseudo.length < 2 ){
         msg = 'Sorry, your pseudo must be at least 2 characters long.';
      }else if ( pseudo.length > 15 ){
         msg = 'Sorry, your pseudo must contain less than 16 characters.';
      }else if ( pwd.length < 4 ){
         msg = 'The password must be at least 6 characters long.';
      }
      if ( msg ){ valid = false; }else{ valid = true;}
      //console.log('msg:'+msg);    
      return {valid:valid, msg:msg}
  }
  
  
  //Remplace la chaine de caracteres str1 par la chaine str2 dans la chaine str
  var replaceAll = function(str, str1, str2){
      while( str.indexOf(' ') ){
          str = str.replace(' ','_'); 
      }
      return str;
  }
  
  //Au clic sur le bouton rechercher un membre ou un quiz
  /*$('#rechercher').click(function (event) {
      event.preventDefault();
      var chaine = $('#zone-recherche').val();
      socket.emit('rechercher', chaine );//j'envoi au serveur la chaine recherchée 
      //$('#zone-recherche').val('');
  });*/


  //Au clic sur le bouton add friend 
  $('.add-friend').click(function (event) {
      event.preventDefault();
      var name = event.target.getAttribute('id');
      //var chaine = $('#zone-recherche').val();
      socket.emit('friendRequest', name ); 
      //$('#zone-recherche').val('');
  });

  //Au clic sur le bouton accepter la friend request
  $('.accepter').click(function (event) {
      event.preventDefault();
      var id = event.target.getAttribute('id');
      var index = id.indexOf('-')
      var name = (id.split('-'))[1];
      socket.emit('acceptFriendRequest', name );
  });

  //Au clic sur le bouton accepter une recommandation d'ami 
  $('.accepter-reco').click(function (event) {
      //alert('accepter-reco');
      event.preventDefault();
      var id = event.target.getAttribute('id');
      var index = id.indexOf('-')
      var name = (id.split('-'))[1];
      //alert('name='+name);
      socket.emit('acceptFriendReco', name );
  });


  //Au clic sur le bouton ignorer la friend request
  $('.ignorer').click(function (event) {
      event.preventDefault();
      var id = event.target.getAttribute('id');
      var index = id.indexOf('-')
      var name = (id.split('-'))[1];
      socket.emit('ignorerFriendRequest', name );
  });

  //Au clic sur le bouton unfriend 
  $('.unfriend').click(function (event) {
      event.preventDefault();
      var name = event.target.getAttribute('id');
      socket.emit('unfriend', name );
  });


  $('.suggerer-friend').click(function (event) {
      event.preventDefault();
      var id = event.target.getAttribute('id');
      //alert(id);
      var cible = id.split('-')[0];
      var suggeredPseudo = id.split('-')[1];
      socket.emit('suggererAmiRequest', {cible:cible, suggeredPseudo:suggeredPseudo } ); 
      //socket.emit('suggererAmiRequest', {cible:suggeredPseudo, suggeredPseudo:cible  } ); 
      //une methode plus propres serait peut etre de creer une collection Recommandation
      //avec un _id suivi des pseudos des differents acteurs et c'est l'id qui serait passé au clic      
  });

  //Au clic sur le bouton supprimer ami 
  $('.supprimer-friend').click(function (event) {
      event.preventDefault();
      var id = event.target.getAttribute('id');
      //alert('id='+id);
      var membre1 = id.split('-')[0];
      var membre2 = id.split('-')[1];
      socket.emit('supprimerAmiRequestAdmin', {membre1:membre1, membre2:membre2} );      
  });

  //Actions sur le menu deroulant se trouvant dans l'entete des profils amis
  $('.select-profil-entete').on('change', function() {
    //alert( this.value ); // or $(this).val()
    $(".zone-supprimer-amis").hide();
    $(".zone-suggerer-amis").hide();

    if ( this.value.indexOf('Retirer') === 0 ){ 
      if ( confirm('confirmer SVP') ){
        var name = this.value.split(' ')[1];
        //alert('emit');
        socket.emit('unfriend', name );
        window.location.reload();
      }
    }else if (this.value === 'Suggerer des amis...'){
      $( ".zone-suggerer-amis").show();
    }else if (this.value.indexOf("Supprimer des amis") === 0  ){
      $( ".zone-supprimer-amis").show();
    }
    //Je remet le select sur Ami
    $('.select-profil-entete option').prop('selected', false).filter('[value="Ami"]').prop('selected', true);
  });

  //Au clic sur le bouton close-amis-suggeres  
  $('.close-amis-suggeres').click(function (event) {
      //event.preventDefault();
      $( ".zone-suggerer-amis" ).slideToggle( "slow", function() {
        // Animation complete.
      }); 
      //Je remet le select sur Ami
      $('.select-profil-entete option').prop('selected', false).filter('[value="Ami"]').prop('selected', true);            
  });

  //Au clic sur le bouton close-supprimer-amis 
  $('.close-supprimer-amis').click(function (event) {
      //event.preventDefault();
      $( ".zone-supprimer-amis" ).slideToggle( "slow", function() {
        // Animation complete.
      }); 
      //Je remet le select sur Ami
      $('.select-profil-entete option').prop('selected', false).filter('[value="Ami"]').prop('selected', true);            
  });
  
  //Au clic sur la zone de saisie choix-amis-discussion
  $('#choix-amis-discussion').click(function (event) {
    //if ($( ".zone-ajouter-amis-discussion" ).css('display') == 'none'){
      $( ".zone-ajouter-amis-discussion" ).slideToggle( "slow", function() {
        // Animation complete.
      });           
    //}
  });

  //Au clic sur un ami dans la liste de choix des amis pour creer une discussion 
  $('.chosen-friend').click(function (event){
    if ( this.id === 'Tous mes amis' || this.id === 'Tous les membres'){
      $('#choix-amis-discussion').html('');
    }

    $('#choix-amis-discussion').val($('#choix-amis-discussion').val() + ';' +this.id );          
  });


  //Fonction qui met à jour l'icon "nombre de demande en cours" dans le menu navigation 
  

  var majNbDemandes  = function (){
    var nbUsers = parseInt($('#nbrFriends > div').html()) - 1;
    if ( nbUsers > 0){
      $('#nbrFriends > div').empty().append(nbUsers);  
    }else{
      $('#nbrFriends').remove();  
    } 
  };


  $("#donkey").mouseenter(function() { 
    $('#left-ear').addClass('pendule-left');
    $('#right-ear').addClass('pendule-right');
  }).mouseleave(function() { 
    $('#left-ear').removeClass('pendule-left');
    $('#right-ear').removeClass('pendule-right');
  });
        
  $(window).scroll(function() {
    //console.log('scroll');
    $('#left-ear').addClass('pendule-left');
    $('#right-ear').addClass('pendule-right');
    setTimeout(function(){
      $('#left-ear').removeClass('pendule-left');
      $('#right-ear').removeClass('pendule-right');    
    },2500);
  });

  //Gestion liste d'amis ( acceptFriendRequest, ignorerFriendRequest, )
  socket.on('demandeBienRecue', function(typeDemande, cible){ 
    console.log('demandeBienRecue, cible='+cible);  
    switch(typeDemande) {
      case 'friendRequest':
       
        $('#'+cible).after('<div class="en-attente">Demande en attente...</div>');
        $('#'+cible).remove();
        //$('a[href="/profil/' + cible + '"]').after('<span class="en-attente">Demande en attente...</span>');
        break;
      case 'acceptFriendRequest':
        $('#accepter-'+cible).remove();
        $('#ignorer-'+cible).remove();
        $('a[href="/profil/' + cible + '"]').after('<span class="en-attente"> Vous êtes ami avec '+cible+' !</span>');
        $('#well-'+cible).fadeOut( 2000, function(){
          $('#well-'+cible).remove();
        });
        majNbDemandes();       
        break;
      case 'acceptFriendReco':
        $('#accepter-'+cible).remove();
        $('#ignorer-'+cible).remove();
        $('a[href="/profil/' + cible + '"]').after('<span class="en-attente"> Demande envoyée !</span>');
        $('#well-'+cible).fadeOut( 2000, function(){
          $('#well-'+cible).remove();
        });
        majNbDemandes();       
        break;

      case 'ignorerFriendRequest':
        $('#accepter-'+cible).remove();
        $('#ignorer-'+cible).remove();
        $('a[href="/profil/' + cible + '"]').after('<span class="en-attente">Bye bye '+cible+' !</span>');
        $('#well-'+cible).fadeOut( 2000, function(){
          $('#well-'+cible).remove();
        });
        majNbDemandes();
        break;
      case 'unfriend':
        $('#'+cible).remove();
        $('a[href="/profil/' + cible + '"]').after('<span class="en-attente">Bye bye '+cible+' !</span>');
        $('#well-'+cible).fadeOut( 2000, function(){
          $('#well-'+cible).remove();
        });
      case 'unfriendByAdmin':
        //J'enleve l'ami supprimé de la liste 
        $('#friend-'+cible).fadeOut( 1000, function(){
          $('#friend-'+cible).remove();
        }); 
        //J'enleve aussi cet ami dasn la zone Amis situé plus bas 
        //alert('photo-ami-'+cible);
        $('#photo-ami-'+cible).remove();
        //$('#mes-amis-nbr-amis')        
      default:
        console.log('Error');
    }
  });


  //Au clic sur le bouton supprimer-ce-profil
  $('.supprimer-ce-profil').click(function (event) {
      event.preventDefault();
      var pseudo = event.target.getAttribute('id');
      if ( confirm('Es-tu certain de vouloir supprimer le membre '+pseudo +' ? Confirme-SVP') ){
        socket.emit('supprimerProfil',pseudo); 
      }
  });

  socket.on('delete-user-success', function(pseudo) {
    alert('Le profil de '+ pseudo + ' a été supprimé !');
    window.location= home +"/rechercheMembre";
  });

  $('#zone-recherche-membre').keyup(function(event) {  
    //event.preventDefault();
    var chaine = $('#zone-recherche-membre').val();
    socket.emit('rechercherMembre', chaine );//j'envoi au serveur la chaine recherchée 
    //$('#zone-recherche').val(''); 
  }); 
  

  $('#zone-recherche-quiz').keyup(function(event) {  
    //event.preventDefault();
    var chaine = $('#zone-recherche-quiz').val();
    socket.emit('rechercherQuiz', chaine );//j'envoi au serveur la chaine recherchée 
    //$('#zone-recherche').val(''); 
  });

  $('#zone-recherche-discussion').keyup(function(event) {  
    var chaine = $('#zone-recherche-discussion').val();
    socket.emit('rechercherDiscussion', chaine );//j'envoi au serveur la chaine recherchée 
    //$('#zone-recherche').val(''); 
  }); 
  

  //Mise à jour du resultat de recherche membres et quiz
  socket.on('searchResultMembre', function(result, pseudo) {
    //console.log('result:', result);
    var nbrUsers = result.users.length; 
    $('#nbMembres').empty().append(nbrUsers);  
    $('#searched-members').empty();//vide le panel

    $.each(result.users, function(key, val) {  
      if ( val.pseudo != pseudo ){
        var element = 
        // '<div class="well text-left">' 
        //   + '<a href="/profil/'+val.pseudo+'" data-toggle="tooltip" title="pseudo">'
        //     + '<span class="list-pseudo">'+val.pseudo+'</span>'
        //     + '<span class="prenom-nom"> '
        //     + ' (<span>'+val.prenom+'</span> <span>'+val.nom+'</span>)</span>'
        //   + '</a>'
        //   + '<img id="'+val.pseudo+'" class="img-responsive add-friend add-friend-icon" style="float:right;cursor:pointer;" src="jsquiz/img/user-add-icon.png" title="Demander à etre ami" alt="Add friend icon" >'
        // +'</div>';        


        '<div style="min-height:70px;" class="well2 text-left">'
          +'<div id="photo-ami-jsquiz" class="div-photo-list-amis">'
            +'<img src="jsquiz/img/photosProfils/'+val.pseudo+'-thumbnail" alt="photo de profil" class="photo-list-amis">'
            +'<div class="textSmall text-sur-photo">' 
              +'<div id="point-vert-jsquiz" style="position:absolute;top:2px;left:2px;display:none;" title="En ligne" class="point-vert">'
              +'</div>'
            +'</div>'
          +'</div>'
            
          + '<a href="/profil/'+val.pseudo+'" data-toggle="tooltip" style="display:inline-block" title="pseudo">'
            +'<div class="list-pseudo-search-member textxMedium">'+val.pseudo+'</div>'
            +'<div class="prenom-nom-search-member">( '+val.prenom+' '+val.nom+' )</div>'
            +'<p style="margin-left:10px;" class="textMedium niveau-js">Developpeur Javascript ( niveau ' + val.niveauJS + ' )</p>'
          +'</a>'
          +'<img style="float:right;cursor:pointer;" src="jsquiz/img/user-add-icon.png" title="Demander à etre ami" id="jsquiz" alt="Add friend icon" class="img-responsive add-friend add-friend-icon friend2">'
        +'</div>';

        $('#searched-members').append(element);  
      }
    }); 
    if ( nbrUsers === 0 ){ $('#searched-members').append('Pas de résultat...');   }

    //On rajoute l'evement au clic sur le bouton add friend 
    $('.add-friend').click(function (event) {
        event.preventDefault();
        var name = event.target.getAttribute('id');
        socket.emit('friendRequest', name ); 
    });
  });
  
  //Mise à jour du resultat de recherche membres et quiz
  socket.on('searchResultQuiz', function(result) {
    //console.log('result:', result);
   
    var nbrQuizes = result.quizes.length;
    $('#nbQuizes').empty().append(nbrQuizes);  

    $('#searched-quizes').empty();//vide le panel

    $.each(result.quizes, function(key, val) {  
      var element = 
      '<div class="well text-left">' 
        + '<a href="/formulaireQuiz/'+val._id.id+'" data-toggle="tooltip" title="titre">'
          + '<span class="list-pseudo">'+val._id.titre+'</span>'
          + '<span class="prenom-nom"> '
          + ' ( Crée par <span>'+val._id.createur+'</span> )'
        + '</a>'
      +'</div>';        
      $('#searched-quizes').append(element);  
    }); 
    if ( nbrQuizes === 0 ){ $('#searched-quizes').append('Pas de résultat...');   }
  });

  //Mise à jour du resultat de recherche de discussions
  socket.on('searchResultDiscussion', function(pseudo, result) {
    console.log('result:', result);
    var nbrDiscussions = result.length; 
    var nbMyDiscussions = 0;
   
    $('#searched-own-discussions').empty();//vide le panel
    $('#searched-discussions').empty();//vide le panel

    for(var i=0;i<nbrDiscussions;i++){

      var participants = "";//result[i].createur + ", " ; 
      for(var k=0;k<result[i].guests.length;k++){
        participants += result[i].guests[k];
        console.log('k='+k);
        if ( k < result[i].guests.length - 1){
          participants += ", ";
        } 
      }

      var element = 
       '<div id="'+result[i]._id+'"" class="well text-left" style="position:relative;">'
        +'<a href="/discussion/'+result[i]._id+'" data-toggle="tooltip" title="'+result[i].titre+'">'
          +'<div class="msg-elem-titre textMedium">Titre: '+result[i].titre+ ' (' + result[i].messages.length   +' posts)' +'</div>'
          +'<div class="msg-elem-info textMedium">Ouvert par '+result[i].createur+' le '+ moment(result[i].date).format("DD/MM/YYYY à HH:mm:ss") + '</div>'
          +'<div class="msg-elem-info textMedium">Invités: '+participants+'</div>'
        +'</a>'
      +'</div>';

      

      //var msgNonLusBloc = '<a href="/discussions" id="msgNonLus" data-toggle="tooltip" title="msg non lus" style="display:inline-block;bottom: 3px;">'
      //  +'<img src="jsquiz/img/messagerie.png" alt="msg non lus" style="width:25px;margin-left:0px">'
      //  +'<div class="nb-amis-en-attente">+'+nbrMsgNonLus+'</div>'
      //+'</a>';
      ///$(element).appendTo("#indicateursAlert");
      
      if ( pseudo === 'jsquiz' || result[i].createur === pseudo ){
        //on demande au seveur le nomber de message non lu pour cette discussion 
        socket.emit('get-messages-non-lus',{_id:result[i]._id});

        $('#searched-discussions').append(element);
        nbMyDiscussions++; 
      }else{
        for(var k=0;k<result[i].guests.length;k++){
          if ( result[i].guests[k] === pseudo ){
            //on demande au seveur le nomber de message non lu pour cette discussion 
            socket.emit('get-messages-non-lus',{_id:result[i]._id});
            $('#searched-discussions').append(element);
            nbMyDiscussions++;             
          }
        }
      }
    }
    
    $('#nbMyDiscussions').empty().append(nbMyDiscussions); 
  });


  // var majTableUSers = function(users){
  //     var nbUsers = Object.keys(users).length;
  //     $('#nbrUsers').empty().append(nbUsers-1);
  //     //console.log('nbUsers='+nbUsers);
  //     $('#publicUsers').empty();//vide le champ users
  //     $.each(users, function(key, value) {  
  //       //console.log('value:'+value.pseudo);
  //       //var img;
  //       //if ( value.dispo ){ img='dispo.png'; }else{ img='indispo.png';typeTr = 'danger';}
  //       if ( pseudo != '' && value.pseudo != pseudo ){
  //           var ligneTabUsers = '<tr class="active">'
  //           + '<td><img src="img/' + value.avatar + '" alt="avatar"></td>'
  //           + '<td>' + value.pseudo + '</td>'
  //           //+ '<td><img src="img/' + img +'" alt="'+ img +'"></td>';//
            
  //           ligneTabUsers += '<td id="info">'+ value.speech +'</td>';
  //           ligneTabUsers +='</tr>';
  //           //console.log(ligneTabUsers);
  //           $('#publicUsers').append(ligneTabUsers);  
  //       }
	 //    });     
  // }

  
	// socket.on('roomDispo', function(data){ 
 //    if ( data.defiant === pseudo || data.defie === pseudo ){//si 'defié' a accepté mon defis
 //        console.log('roomDispo:'+ data.defiant + ' ' + data.defie + ' ' + data.idRoom);   
 //        $('#waitingFor-'+data.defie).remove();
 //        //$('#tableChallenges').empty();
 //        majNbrChallenge();
 //        idRoom = data.idRoom;  
 //        //alert('La partie va commencer');
 //        //Lancer la partie
 //        gameIsOpen = true;
 //        socket.emit('goInRoom', pseudo, data);
 //    }
	// });

	
  //Mise à jour du nombre de membres connectés  
  // socket.on('countMembers', function(countMembers) {
  //   console.log('countMembers:'+ countMembers);
  //   $('#countMembers').empty().append(countMembers);

  // });
	
  //Mise à jour membres connectés  (recue quand un membre se connecte ou se deconnecte)
  var idOnline;
  socket.on('connectedMembers', function(connectedMembers) {
    //console.log('connectedMembers:', connectedMembers);
    
    //Mise à jour du nombre de membres connectés  
    $('#countMembers').empty().append(Object.keys(connectedMembers).length);
    //Je cache tous les chat icon (deconnexions eventuelles)
    $('img[id^="icon-chat"]').hide();
    $('img[id^="icon-chatSP"]').hide();
    $('div[id^="enLigne"]').hide();
    $('div[id^="enLigneSP"]').hide();//smart phone
    $('div[id^="point-vert-"]').hide();

    //Puis je rend visibles les boutons de chat des membres connectés (dans l'entete du profil)
    $.each(connectedMembers, function(key, val) {  
      console.log('connectedMembers[key].pseudo=',connectedMembers[key].pseudo);
      $('#icon-chat-'+connectedMembers[key].pseudo).show();
      $('#icon-chatSP-'+connectedMembers[key].pseudo).show();
      $('#enLigne-desktop-'+connectedMembers[key].pseudo).show();
      $('#enLigne-smartphone-'+connectedMembers[key].pseudo).show();
      $('#point-vert-'+connectedMembers[key].pseudo).show();
      // var idOnline = setInterval(function(){
      //   $('#enLigne-'+connectedMembers[key].pseudo).fadeOut(1000).delay(400).fadeIn(1000); 
      // },2600);      
    });
  
    // $('div[id^="gros-point-vert"]').hide();//Je cache tous les points vert
    // $.each(connectedMembers, function(key, val) {  
    //   //console.log('connectedMembers[key].pseudo=',connectedMembers[key].pseudo);
    //   $('#gros-point-vert-'+connectedMembers[key].pseudo).show();
    // });

  });



  socket.emit('askMajCounts');

  //Mise à jour du nombre de posts crées  
  socket.on('countPosts', function(countPosts) {
    console.log('countPosts:'+ countPosts);
    $('#countPosts').empty().append(countPosts);
  });

  //Mise à jour du nombre de quiz crées  
  socket.on('countQuiz', function(countQuiz) {
    console.log('countQuiz:'+ countQuiz);
    $('#countQuiz').empty().append(countQuiz);
  });

  //Au clic sur le bouton #envoyerPost du profil 
  $('#envoyerPost').click(function (event){
      event.preventDefault();
      var text = $('#zone-ajout-post').val();
      console.log(text);
      socket.emit('ajout-post', text );//j'envoi au serveur le text à publier 
      $('#zone-ajout-post').val('');//on vide la zone de saisie du text
  });

  //Au clic sur le bouton #envoyerMessage de la page discussion.jade
  $('.envoyerMessage').click(function (event){
      event.preventDefault();
      var id = event.target.getAttribute('id');
      var idDiscussion = id.split('-')[1];
      //alert('idMsg='+idDiscussion);
      var text = $('#zone-ajout-message').val();
      //console.log(text);
      socket.emit('ajout-message-discussion',idDiscussion, text);//j'envoi au serveur le text à ajouter à la discussion idDiscussion
      $('#zone-ajout-message').val('');//on vide la zone de saisie du msg
  });


  //Ajout d'un nouveau post 
  socket.on('add-post-success', function(data) {
    //console.log('data:', data);
    var element =
    '<div id="' + data._id + '" class="well dark-gray">'
       +'<div>'
          +'<img src="../../jsquiz/img/delete20.png" style="float:right;cursor:pointer" onclick="deletePost(\''+data._id+'\')" title="Supprimer ce post" alt="supprimer">'
          +'<img src="../../jsquiz/img/photosProfils/'+ data.author.pseudo +'-thumbnail" alt="photo de profil" class="img-responsive post-photo-profil" alt="photo profil">'
          +'<div class="post-author-date">'
            +'<p class="textxMedium post-author-prenom">' + data.author.prenom +' '+ data.author.nom + ' (' + data.author.pseudo + ')' + '</p>'
            +'<p class="textxMedium post-author-nom">Le ' + data.date.date + ' à ' + data.date.time + '</p>'
          +'</div>'
          +'<p style="margin-top:10px;" class="textMedium">' + data.text + '</p>'
       +'</div>'
  
       +'<hr class="hr-profil">'
       +'<p class="textRegular">'
       +  '<span class="nbComments">' + data.commentaires.length + '</span> <span>commentaires</span>'
       +'</p>'
       +'<hr class="hr-profil">'
       +'<textarea id="add-comment-' + data._id + '" maxlength="1000" placeholder="Ajouter un commentaire..."  class="zone-ajout-commentaire form-control"></textarea>'
    +'</div>';

    //insertion dans le DOM
    $('#exprimez-vous').after(element);


    //Obligé d'ajouter ce bout de code pour que le keyup soit detecté sur les textarea qui vient d'etre ajouté à la volée 
    $('#add-comment-' +data._id ).keyup(function(e){
      
      if(e.keyCode == 13){
        //alert(this.id);//id de la zone textarea où on a saisi le commentaire 
        var postId = this.id.split('-')[2];// par construction c'est le _id du post sur lequel on veut ajouter un commentaire ( id='add-comment-#{post._id}' )  
        //alert($('#'+this.id).val());
        //console.log('postId'+postId);
        var parentId = $('#'+this.id).parent().attr('id');

        //console.log('parentId:'+parentId);
        
        var data = { postId:postId, text:$('#'+this.id).val() }
        socket.emit('ajout-commentaire', data );//j'envoi au serveur le commentaire à publier 
        $('#'+this.id).val('');
      }
    });
  });

  //Confirmation du serveur au client que le post id a été supprimé   
  socket.on('delete-post-success', function(id) {
    //console.log('delete-post-success:'+id);
    $('#'+id).slideUp(300, function(){
      $('#'+id).remove();
    });    
  });

  //Demande d'ajout d'un nouveau commentaire par le client
  $('.zone-ajout-commentaire').keyup(function(e){
    if(e.keyCode == 13){
      //alert(this.id);//id de la zone textarea où on a saisi le commentaire 
      var postId = this.id.split('-')[2];// par construction c'est le _id du post sur lequel on veut ajouter un commentaire ( id='add-comment-#{post._id}' )  
      //alert($('#'+this.id).val());
      //console.log('postId'+postId);
      var parentId = $('#'+this.id).parent().attr('id');
      //console.log('parentId:'+parentId);
      var data = { postId:postId, text:$('#'+this.id).val() }
      socket.emit('ajout-commentaire', data );//j'envoi au serveur le commentaire à publier 
      $('#'+this.id).val('');
    }
  });
  
  //Ajout d'un nouveau commentaire 
  socket.on('ajout-commentaire-success', function(data) {
    //console.log('data:::', data);
    var postId = data.postId;

    //preparation de l'element
    var element = 
    '<div class="bloc-commentaire" id="' + data.id + '">' 
    + '<img src="../../jsquiz/img/delete15.png" style="float:right;cursor:pointer" onclick="deleteCommentaire(\'' +data.id+ '-' +postId+ '\')" title="Supprimer ce commentaire" alt="delete">'
    +  '<img src="../../jsquiz/img/photosProfils/' + data.author.pseudo +'-thumbnail" alt="photo de profil" class="img-responsive comment-photo-profil" alt="photo de profil">'
    +  '<div class="comment-info-group">'
    +    '<p class="textMedium comment-author">' + data.author.prenom +' '+ data.author.nom + '(' + data.author.pseudo + ')' + '</p>'
    +    '<p class="textMedium comment-date">Le ' +data.date.date + ' à ' + data.date.time + '</p>'
    +  '</div>'
    +  '<p style="margin-top:10px;" class="textRegular">' + data.text + '</p>'
    + '<hr class="hr-profil"></div>';    

    //insertion dans le DOM
    $('#' + postId + ' .zone-ajout-commentaire').before(element);
    
    //Mise à jour de l'affichage du nombre de commentaires
    $('#'+postId +' p .nbComments').html(parseInt($('#'+postId +' p .nbComments').html()) + 1);

  });


  //Confirmation du serveur au client que le commentaire id a été supprimé   
  socket.on('delete-commentaire-success', function(id) {
    //console.log('delete-commentaire-success:'+id);
    //console.log('id:'+id);
    var parentId = $('#'+id).parent().attr('id');
    //console.log('parentId:'+parentId);
    $('#'+id).slideUp(300, function(){
      //On enleve le commentaire du DOM  
      $('#'+id).remove();
      //Mise à jour de l'affichage du nombre de commentaires 
      $('#'+parentId +' p .nbComments').html(parseInt($('#'+parentId +' p .nbComments').html()) - 1);
      
    });    
  });

  //Ajout d'un nouveau post 
  socket.on('ajout-msg-success', function(idDiscussion, data) {
    console.log('data:', data);

    var id = idDiscussion +'-'+ data._id;
    //alert(id);
    //preparation de l'element
    var element =
    '<div id="msg-'+ data._id +'" class="well2 dark-gray">'
      +'<div>'
        +'<img onclick="deleteMessage(\''+id+'\')" src="../../jsquiz/img/delete20.png" style="float:right;cursor:pointer" title="Supprimer ce message" alt="Supprimer">'
        +'<img src="../../jsquiz/img/photosProfils/'+ data.auteur +'-thumbnail" alt="photo de profil" class="img-responsive msg-photo-profil">'
        +'<div class="post-author-date">'
          +'<p class="textxMedium post-author-nom">'+ data.auteur +'</p>'
          +'<p class="textxMedium post-author-nom">'+ 'Le ' + moment(data.date).format("DD/MM/YYYY à HH:mm:ss") + '</p>'
        +'</div>'
        +'<p style="margin-top:10px;" class="textMedium">' + data.txt + '</p>'
      +'</div>'
    +'</div>';

    // //insertion dans le DOM
    $('#exprimez-vous').before(element);


    //Obligé d'ajouter ce bout de code pour que le keyup soit detecté sur les textarea qui vient d'etre ajouté à la volé 
    // $('#add-comment-' +data._id ).keyup(function(e){
      
    //   if(e.keyCode == 13){
    //     //alert(this.id);//id de la zone textarea où on a saisi le commentaire 
    //     var postId = this.id.split('-')[2];// par construction c'est le _id du post sur lequel on veut ajouter un commentaire ( id='add-comment-#{post._id}' )  
    //     //alert($('#'+this.id).val());
    //     console.log('postId'+postId);
    //     var parentId = $('#'+this.id).parent().attr('id');

    //     console.log('parentId:'+parentId);
        
    //     var data = { postId:postId, text:$('#'+this.id).val() }
    //     socket.emit('ajout-commentaire', data );//j'envoi au serveur le commentaire à publier 
    //     $('#'+this.id).val('');
    //   }
    // });
  });


  //Confirmation du serveur au client que le message a été supprimé   
  socket.on('delete-message-success', function(id) {
    console.log('delete-message-success:'+id);
    $('#msg-'+id).slideUp(300, function(){
      $('#msg-'+id).remove();
    });    
  });

  //Confirmation du serveur au client sur suggestion ami
  socket.on('suggererAmiRequestDone', function(pseudo) {
    $('#suggered-friend-'+pseudo).remove();
  });

  //Confirmation du serveur au client que le message a été supprimé   
  socket.on('delete-discussion-success', function(titre) {
    //alert(home +"/discussions");
    console.log('delete-discussion-success:'+titre);
    window.location= home +"/discussions/La discusssion "+titre+ " a bien été supprimée.";
    //window.location.reload();        
  });


	//Une fonction de compatibilité pour gérer les évènements
  var addEvent = function(element, type, listener){
    if(element.addEventListener){
      element.addEventListener(type, listener, false);
    }else if(element.attachEvent){
      element.attachEvent("on"+type, listener);
    }
  }

  //defilement images landing page 
  var tabImgUrl = ['jsScreen1.jpg','jsScreen2.jpg','jsScreen3.jpg','jsScreen4.jpg','jsScreen5.jpg','jsScreen6.jpg'];
  var curImgId = 0; 
  setInterval(function(){
       curImgId++;
       if ( curImgId > 5){ curImgId = 1;}
       $('#img-landing-page').attr('src','jsquiz/img/'+tabImgUrl[curImgId]);
  },3000);


  //le client repond à une question d'un quiz
  $('.btn-reponse, .btn-passer').click(function (event){
      event.preventDefault();
      var id = event.target.getAttribute('id');
      //on envoi la reponse choisie au serveur pour enregistrement
      socket.emit('reponse-question-quiz',id);
  });


  socket.on('indexBonneReponse', function(id, index){
    console.log('indexBonneReponse:',index);
     //id='#{index}-#{quiz.length}-#{question.id}-#{question._id}-#{indice}'
    console.log('id:'+id);
    //id='#{index}-#{quiz.length}-#{question.id}-#{question._id}-#{indice}'
    var tabInfo = id.split('-');
    //on passe à la question suivant
    var idQuestionBlock = parseInt(tabInfo[0]);
    var nbrQuestion = parseInt(tabInfo[1]);
    $("#"+idQuestionBlock).hide()
   
    var nextId = idQuestionBlock+1;
    console.log('nextId:'+nextId);
    console.log('nbrQuestion:'+nbrQuestion);
    console.log('tabInfo[4]:'+tabInfo[4]);
    if ( typeof tabInfo[4] === 'undefined'){
      var delais = 0;
    }else{
      var delais = 2000;
    }
    if (index == tabInfo[4]){//bonne reponse
      $('#bonneReponse').fadeIn(0,function() {
        $('#bonneReponse').fadeOut(delais, function() {
        });
      });
      if ( nextId <= nbrQuestion-1 ){//si on est pas encore arrivé au bout du quiz
        $("#"+nextId).show();//on montre la question suivante
      }else{
         socket.emit('ask-quiz-result', tabInfo[2]);
      }
    }else{
      $('#mauvaiseReponse').fadeIn(0, function() {
        $('#mauvaiseReponse').fadeOut(delais, function() {
        });
      });
      if ( nextId <= nbrQuestion-1 ){//si on est pas encore arrivé au bout du quiz
        $("#"+nextId).show();//on montre la question suivante
      }else{
        socket.emit('ask-quiz-result', tabInfo[2]);
      }      
    }
  });


  //Affichage resultat quiz
  socket.on('quiz-result', function(result, docs){
    //console.log('result:',result);
    //console.log('docs:',docs);
    //result = {titre: titre, nbQuestion: nbQuestion, nbBonnesReponses: nbBonnesReponses}
    
    function HtmlEncode(s){
      var el = document.createElement("div");
      el.innerText = el.textContent = s;
      s = el.innerHTML;
      return s;
    }


    // function HtmlEncode(s){
    //   if ( s.trim().length > 0 ){
    //     s = s.replace(/</ig, "&lt;").replace(/>/ig, "&gt;"); 
    //     s = s.replace(/\n/g, '<br/>');//.replace(/ /g, '&nbsp;')
    //   }
    //   return s;
    // }

    if ( result.score > 60 ){
      elem = '<img class="center img-responsive" style="margin:auto;textwidth:200px;height:200px" src="jsquiz/img/giphy.gif", alt="giphy")></img>';
    }

    var elem =
    '<h2 style="font-size:2.5em;font-weight:600;"> Votre score : ' + result.score + '%</h2>'
    +'<h2 class="text-center textLarge"> Le score moyen pour ce quiz est de ' + result.scoreMoyenAllUsers +' </h2>'
    //+ '<h2 class="text-center textLarge"> Share Your Score:...' + ' </h2>'
    //insertion dans le DOM
  
    //Resultat et correction :
    //On reprend grosso modo formulaireQuiz.jade en entourant les bonnes reponses en vert
    
    var nbQuestion = docs.length;
    for ( var i = 0; i < nbQuestion; i++){//pour chaque question du quiz id
      var m = docs[i].reponses.length;
      //console.log('id='+docs[i].id.valueOf());
      var num = i + 1; 
      elem += '<br><div class="bloc-question" id="'+i+'">';
        elem += '<div class="panel panel-info center-block" style="margin:10px">';
          
          elem += '<div class="panel-heading" >';
            elem += '<div class="panel-title textLarge" >';
              elem += '<span style="color:white"> Correction question ' + num + '/' + nbQuestion + '</span>';
            elem += '</div>';
          elem += '</div>';

          elem += '<div class="panel-body" id="searched-members" >'; 
            elem += '<pre class="textxMedium question">'+HtmlEncode(docs[i].question)+'</pre>';
               
            //console.log('m:'+m);
            for ( var j = 0; j<docs[i].reponses.length; j++){//pour chaque reponses
              //console.log(docs[i].reponses[j].val);
              var style = "";
              if (docs[i].reponses[j].val === true){//la bonne reponse
                var check = '';
                // if (docs[i].reponses[j].flag === true ){//le user à bien repondu
                //   check = '<img src="jsquiz/img/Feedbin-Icon-check.svg.png" style="width:20px;position:relative;right:-10px">'; 
                // }
                elem += '<pre class="textxMedium btn-reponse " style="border: 3px solid green;position:relative;">'+ check + HtmlEncode(docs[i].reponses[j].txt) +'</pre>';
                //elem += '<img style="display:inline-block;margin:0;height:70px;" src="jsquiz/img/lollipop-2.png" alt="lollipop" class="img-responsive">' 

              }else{
                if (docs[i].reponses[j].flag === true){//le user à mal repondu
                  elem += '<pre class="textxMedium btn-reponse " style="opacity: 0.6;border: 3px solid red">' +HtmlEncode(docs[i].reponses[j].txt) + '</pre>'; 
                }else{
                  elem += '<pre class="textxMedium btn-reponse " style="opacity: 0.6;">' +HtmlEncode(docs[i].reponses[j].txt) + '</pre>'; 
                }
              }
              //var style = docs[i].reponses[j].val === true ? 'border: 3px solid green': 'opacity: 0.5;'
              //elem += '<div class="well textxxMedium btn-reponse hvr-float" style="'+style+'">' +docs[i].reponses[j].txt + '</div>'; 
            }

            if ( docs[i].explication && docs[i].explication.trim().length > 0 ){
              elem += '<pre class="textxMedium explication">'; 
                elem += '<i class="fa fa-info-circle fa-lg"></i><b>Explication</b><br><br>';
                elem += ''+HtmlEncode(docs[i].explication)+'';
              elem += '</pre>'; 
            }

          elem += '</div>';
        elem += '</div>'; 
      elem += '</div>'; 
    }

    elem += '<a href="/formulaireQuiz/'+ docs[0].id.valueOf() + '" style="width:167px;margin:10px" class="btn btn-lg btn-info">Repasser ce quiz</a>';
    if ( result.boutonModif ){
      elem += '<a href="/editerQuiz/'+ docs[0].id.valueOf() + '" style="width:167px;margin:10px" class="btn btn-lg btn-success">Modifier ce quiz</a>';    
    }
    // <a href="/editerQuiz/56d792ec9833a3b36b13614e" style="width: 180px;margin:5px;display:inline-block;" type="button" class="btn btn-success btn-sm textxMedium">Modifier ce quiz</a>

    $('#info-quiz').after(elem);

    $('#correction').fadeIn(1000,function() {
      $('#correction').fadeOut(2500, function() {
      });
    });
    $('#info-quiz').hide();

    $('html, body').animate({scrollTop: 0},'slow');

  });

  // $('.btn-passer').click(function (event){
  //     event.preventDefault();
  //     console.log('id:'+id);
  //     var id = event.target.getAttribute('id');
  //     var idQuestionBlock = (id.split('-'))[0];
  //     $("#"+idQuestionBlock).hide()
  //     var nextId = idQuestionBlock+1;
  //     console.log('nextId:'+nextId);
  //     $("#"+nextId).show();
  //     //var name = (id.split('-'))[1];
      
  //     socket.emit('passer-question-quiz',id);//j'envoi la reponse choisie au serveur
  // });


  //à chaque rechargement de la page on fait un socket emit depuis le client pour demander au serveur les chats en cours. 
  //Le serveur va repondre et envoyer le contenu de la variable de session currentChats.
  //Le client utilisera ensuite cette variable pour reconstruire les fenetres de chats perdues lors du reload de la page.
  socket.emit('askForCurrentchats');


  //Reponse du serveur au client sur askForCurrentchats
  socket.on('currentChatsData', function(data){

    //data =  {pseudo:pseudo, listeId:currentsChatsIds[pseudo], docs:docs } 
    console.log('pseudo:',data.pseudo);
    console.log('listeId:',data.listeId);
    console.log('currentChatsData:',data.docs);

    //on reconstruit les chats windows vides
    for(var i=0;i<data.listeId.length;i++){
      createNewChatWindow(data.listeId[i], '', false);
    }

    var chatteurs = {};//sera remplie avec la listes de participants à chaque chat (sauf le client)

    //On remplit les chats windows en dispatchant les données recues dans chaque fenetre 
    for(var i=0;i<data.docs.length;i++){

      var pseudo = data.docs[i].pseudo;
      console.log('pseudo->',data.pseudo);
      var display_zone = $("#chat-window-"+data.docs[i].id + " > .chat-display-zone");

      if ( data.docs[i].display === 'yes' ){
        //Insere le nouveau message
        display_zone.append('<b>'+data.docs[i].pseudo+':</b> ' + data.docs[i].msg + '<br>');  
      }
      //Scroll vers le bas pour que le dernier message soit visible 
      //display_zone.scrollTop(display_zone[0].scrollHeight);

      if ( !chatteurs[ data.docs[i].id ] ){  chatteurs[ data.docs[i].id ] = []; }
      //On rempli le tableau des chatteurs 
      
      if ( pseudo != data.pseudo &&  pseudo != 'SERVER' && chatteurs[ data.docs[i].id ].indexOf(pseudo) < 0 ){//
        chatteurs[ data.docs[i].id ].push(pseudo);
      }
    }

    console.log('chatteurs=',chatteurs);


    for(var i=0;i<data.listeId.length;i++){
      
      var pseudo_zone = $("#chat-window-"+data.listeId[i] + " .cible");
      
      pseudo_zone.html(chatteurs[ data.listeId[i] ][0]);
      if ( chatteurs[ data.listeId[i] ].length > 1 ){
        pseudo_zone.append('...');
        //on s'arrange pour qu'au survole du 1 ere des participants au chat les autres particpants apparaissent en infobulle...  
        for (var k=0;k<chatteurs[ data.listeId[i] ].length;k++){
          pseudo_zone[0].title += ' | ' + chatteurs[ data.listeId[i] ][k];//pseudo_zone[0] donne l'objet DOM à partir de l'objet jquery
        }
      }

      var display_zone = $("#chat-window-"+data.listeId[i] + " > .chat-display-zone");
      display_zone.scrollTop(display_zone[0].scrollHeight);
    }

    //Je recupère dans les cookies l'etat (iconifié ou pas) des chat window j'iconifi ou pas suivant la valeur trouvée 
    console.log('cookie jsquiz_iconifyChat='+readCookie('jsquiz_iconifyChat'));
    var val = readCookie('jsquiz_iconifyChat');
    if ( val === null ){
      console.log('null'); 
      createCookie('jsquiz_iconifyChat', "yes", 1);
    } 
    if ( readCookie('jsquiz_iconifyChat') === 'yes' ){
      iconifyChat();
    }else{
      expendChat();
    }
   
  });

 

  var addReponse = function(obj, event){
    var id = event.target.getAttribute('id');//console.log(id);
    console.log('id='+id);
    var lastAnswer = $("#"+id).prev();//.attr('name');
   
    var question = lastAnswer.attr('id').split('-')[1];
    var response = parseInt(lastAnswer.attr('id').split('-')[2]);

    var newRep = response+1;  
    var id = question+'-'+newRep;

    var qr = question+'-'+newRep;

    var element = ''
    + '<div id="reponse-'+qr+'" style="background-color:#D3D3D3;margin-top:10px;">'
    +    '<input name="radio-'+question+'" value="'+newRep+'" style="position:relative;top:3px;left:110px;"  title="Cocher si bonne reponse" type="radio">'
    +    '<label style="margin-top:15px;margin-left:0px;">Reponse '+newRep+'</label>'
    +    '<i onclick="$(\'#reponse-'+qr+'\').remove()" style="float:right;cursor:pointer;margin-top: 8px;margin-right:-3px;" title="Supprimer cette reponse" alt="Supprimer" class="fa fa-remove fa-1g"></i>'
    +    '<textarea name="reponse-'+qr+'" placeholder="Reponse '+newRep+'..." style="border-radius:0;font-family:monospace;" required="" rows="2"   maxlength="1000" class="form-control"></textarea>'
    + '</div>';  

    lastAnswer.after(element); 
  }

  //Au clic sur le bouton servant a ajouter une reponse à une question dans un quiz 
  $('.add-reponse').click(function (event){
    console.log(this);
    addReponse(this, event);
  });



  //Au clic sur le bouton servant a ajouter une question dans un quiz 
  $('#add-question').click(function (event){
    
    var nbQuestion = $('.panel-info').length;

    if ( nbQuestion >= 100 ){
      alert('Vous avez atteint le nombre maximum de questions autorisé !');
     }else{ 
      var lastPanel = $(this).prev();
      
      console.log(lastPanel);
      var newQuestion = parseInt(lastPanel.attr('id').split('-')[1]) + 1;

      console.log(newQuestion);

      var element = ''
      +'<div id="panel-'+newQuestion+'" style="margin-top:15px" class="panel panel-info center-block">'
      +  '<div class="panel-heading">'
      +    '<div class="panel-title"><span style="color:white;font-size:1.5em">Question '+newQuestion+'</span>'
      +    '<i  onclick="$(\'#panel-'+newQuestion+'\').remove()" style="float:right;cursor:pointer;margin-right:-10px;" title="Supprimer cette question" alt="Supprimer" class="fa fa-remove fa-1g"></i>'
      +   '</div>'
      +  '</div>'
      +  '<div class="panel-body">'
      +    '<textarea required="" name="question-'+newQuestion+'" style="border:2px solid grey;font-family:monospace;" rows="2" placeholder="Tape la question ici..." maxlength="1000" class="form-control"></textarea>'
      
      +    '<div class="bloc-commentaire">'
      +      '<p style="color:grey;margin-top:5px;">Saisissez les reponses et cochez la ou les  bonne(s) reponse(s)</p>'
      
      +      '<div id="reponse-'+newQuestion+'-1" style="background-color:#D3D3D3;margin-top:10px;">'
      +        '<input name="radio-'+newQuestion+'" value="1" style="position:relative;top:3px;left:110px;"  title="Cocher si bonne reponse" type="radio">'
      +        '<label style="margin-top:15px;margin-left:0px;">Reponse 1</label>'
      +        '<i onclick="$(\'#reponse-'+newQuestion+'-1\').remove()" style="float:right;cursor:pointer;margin-top: 8px;margin-right:-3px;" title="Supprimer cette reponse" alt="Supprimer" class="fa fa-remove fa-1g"> </i>'
      +        '<textarea name="reponse-'+newQuestion+'-1" placeholder="Reponse 1..."  style="border-radius:0;font-family:monospace;" required="" rows="2"  maxlength="1000" class="form-control"></textarea>'
      +      '</div>'


      +      '<button id="add-reponse-'+newQuestion+'" style="margin-top:10px;" type="button" class="center-block btn btn-primary center-block btn-sm add-reponse"><i class="fa fa-plus"></i> Ajouter une reponse</button>'

      +      '<div id="explication-'+newQuestion+'" style="background-color:#D3D3D3;margin-top:10px;">'
      +        '<label style="margin-top:15px;margin-left:10px;">Explication (facultatif)</label>'
      +        '<textarea rows="2" placeholder="Expliquez la bonne reponse ici..." name="explication-'+newQuestion+'" maxlength="1000" style="border-radius:0;font-family:monospace;" class="form-control">'
      +        '</textarea>'
      +      '</div>'

      +    '</div>'
      +  '</div>'
      +'</div>'

      lastPanel.after(element);

      //Prise en compte du clic sur le bouton add-reponse 
      $('#add-reponse-'+newQuestion).click(function(event){
        addReponse(this, event);
      });

      //$(window).scrollTop($(document).height());
      $('html, body').animate({scrollTop: $(document).height()},'slow');

    }

  });  

  //Confirmation du serveur au client que le post id a été supprimé   
  socket.on('delete-quiz-success', function(titre) {
    console.log('delete-quiz-success:'+titre);
    window.location= home +"/rechercheQuiz/Le quiz "+titre+ " a bien été supprimé !";
  });

  //alert("Ce site est en construction et ne fonctionne pas encore à 100%, revenez plus tard SVP...")

 

  //Le serveur a envoyé le nbrMsgNonLus ( > 0 )  
  socket.on('nbrMsgNonLus', function(nbrMsgNonLus,query) {
    console.log('nbrMsgNonLus:'+nbrMsgNonLus);
  
    //if ( nbrMsgNonLus > 0 ){
      if ( $.isEmptyObject(query) ){
        var element = '<a href="/discussions" id="msgNonLus" data-toggle="tooltip" title="msg non lus" style="display:inline-block;bottom: 3px;">'
          +'<img src="jsquiz/img/messagerie.png" alt="msg non lus" style="width:25px;margin-left:0px">'
          +'<div class="nb-amis-en-attente">+'+nbrMsgNonLus+'</div>'
        +'</a>';  
        $(element).appendTo("#indicateursAlert");
      }else{
        
        var element = '<div title="msg non lus" style="width:62px;display:inline-block;position:absolute;right:5px;top:5px">'
          +'<img src="jsquiz/img/messagerie.png" alt="msg non lus" style="width:25px;margin-left:0px">'
          +'<div class="nb-amis-en-attente">+'+nbrMsgNonLus+'</div>'
        +'</div>';  
        console.log("query._id:"+query._id + ' -> nbrMsgNonLus='+nbrMsgNonLus);
        $(element).appendTo("#"+query._id);
       
      }
    //}
  });

});
