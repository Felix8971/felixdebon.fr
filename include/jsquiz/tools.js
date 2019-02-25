
exports.getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
exports.getRandomArbitrary = function(min, max) {
  return Math.random() * (max - min) + min;
};
 
exports.valueInRange = function(value, min, max) {
  return (value < max) && (value > min);
};

exports.timestamp = function(){ 
  return parseInt(Math.round(+new Date()/1000));//en secondes
};

var ajouteZero = function(s){
	if ( s.toString().length <= 1 ){
		s = '0' + s;
	}
	return s;
};

exports.dateDuJour = function(){
	var now = new Date();
    
  var h = ajouteZero(now.getHours());
  var m = ajouteZero(now.getMinutes());
  var s = ajouteZero(now.getSeconds());
   
  var jour = now.getDate();
	var mois = now.getMonth()+1;
	var annee = now.getFullYear();
    
	return { date: jour+"/"+mois+"/"+annee, time: h+":"+m+":"+s };
};


exports.validerIdentifiants = function(login, pwd){
    var msg, valid;//undefined
    var search = /^[a-zA-Z0-9]+$/gi;   
   //var loginOK = search.test(req.body.login);
    if ( !search.test(login) ){
       msg = 'Sorry, your pseudo should not contain any special characters; only letters A-Z and numbers 0-9.';
    }else if ( login.length < 2 ){
       msg = 'Sorry, your pseudo must be at least 2 characters long.';
    }else if ( login.length > 15 ){
       msg = 'Sorry, your pseudo must contain less than 15 characters.';
    }else if ( pwd.length < 4 ){
       msg = 'The password must be at least 6 characters long.';
    }
    if ( msg ){ valid = false; }else{ valid = true;}
    //console.log('msg:'+msg);    
    return {valid:valid, msg:msg}
};


exports.getCollectionFieldValue = function(db, collectionName, query, field, callback){
    var collections = db.get().collection(collectionName);
    collections.find(query).toArray(function(err, documents){
        if ( !err ){       
          if ( documents.length === 1 ){   
            callback(documents[0][field]);
          }else{
            callback({});
          }
        }
    });
}

exports.getCollectionDocument = function(db, collectionName, query, callback){
  var collections = db.get().collection(collectionName);

  collections.find(query).toArray(function(err, documents){
      if ( !err ){       
        if ( documents.length >= 1 ){   
          callback(documents[0]);
        }else{
          callback(null);
        }
      }
  });
}

//Permet de recuperer un array avec la liste des membres
exports.getUsersPseudoArray = function(db, query, callback){
  var users = db.get().collection('users');
  users.find(query).toArray(function(err, allUsers){   
    if ( !err ){
      var tab = [];
      var n = allUsers.length;
      //console.log(n);
      for(var i=0;i<n;i++){
        tab.push(allUsers[i].pseudo);
      }
      callback(tab);                        
    }
  });
}


exports.getAmisAsuggerer = function( amisVisiteur, amisProfil ){               
  var amisAsuggerer = [];    
  var find = false;
  var n = amisVisiteur.length;
  var p = amisProfil.length;

  for(var i=0;i<n;i++){
      find = false;
      for(var j=0;j<p;j++){
          if ( amisVisiteur[i] === amisProfil[j].pseudo ){
              find = true;
          }
      }
      if ( !find ){
          amisAsuggerer.push(amisVisiteur[i]);
      }
  } 
  return  amisAsuggerer;
}


exports.getAmisAsuggerer2 = function( amisVisiteur, amisProfil ){               
  var amisAsuggerer = [];    
  var find = false;

  amisVisiteur.forEach(function (amiVisiteur){
    //console.log('amiVisiteur:'+amiVisiteur);
    amisProfil.forEach(function (amiProfil){
      //console.log('amiProfil:'+amiProfil.pseudo);
      if ( amiVisiteur === amiProfil.pseudo ){
        find = true;
      }
    });
    if ( !find ){ 
      amisAsuggerer.push(amisVisiteur);
      //console.log('push!!!');
    }
  }); 
  return  amisAsuggerer;
}


exports.getConfirmedFriends = function(amis){
    if ( typeof amis === 'undefined'){
        var amis = [];     
    } 
    var confirmed = [];       
    for(var i=0;i<amis.length;i++){
        if ( amis[i].statut === 'confirmed' ){
          confirmed.push(amis[i].pseudo);
        }
    }
    //console.log('getConfirmedFriends=',confirmed);
    return confirmed;
}


//Renvoit le nombre d'amis en attente en confirmation de la part de pseudo 
exports.getNbrAmisEnAttente = function(db, pseudo, callback){
  if ( pseudo ){
    var amisEnAttente = [];  
    var users = db.get().collection('users');
    users.find({pseudo:pseudo}).toArray(function(err, user){

      if ( typeof user[0].amis === 'undefined'){
        user[0].amis = [];     
      }

      var amis = user[0].amis;
      if ( !err ){
        var n = amis.length;
        console.log('n='+n);
        for(var i=0;i<n;i++){
          if ( amis[i].statut === 'en attente de confirmation' || amis[i].statut === 'recommended' ){
            amisEnAttente.push(amis[i].pseudo);
          }
        }
        console.log('amisEnAttente=',amisEnAttente);
        callback(amisEnAttente.length);                        
      }
    });
  }else{
     callback(0); 
  }
}


//Donne le statut de <pseudo> dans la liste d'ami <amis> 
exports.getFriendStatut = function(amis, pseudo){
    if ( typeof amis === 'undefined'){
        var amis = [];     
    }        
    for(var i=0;i<amis.length;i++){
        if ( amis[i].pseudo === pseudo ){
          return amis[i].statut;
        }
    }
    return null; 
}



// exports.getNbrCommentaires = function(commentaires){
//     if ( typeof commentaires === 'undefined'){
//         var commentaires = [];     
//     }        
//     var nbrCommentaires = 0;
//     for(var i=0;i<commentaires.length;i++){
//       nbrCommentaires++;
//     }
//     return nbrAmis;
// }



var nodemailer = require('nodemailer');


//on ajoute 2 callback onSuccess et onFail qui vont servir à faire un res.render() 
//different suivant que le mail est envoyé ou non
exports.envoyerMailPwdReset = function(email, pseudo, password, onSuccess, onFail ){ 
    // create reusable transporter object using SMTP transport 
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'felix8971@gmail.com',
            pass: 'galak7545'
        }
    });
     
    // NB! No need to recreate the transporter object. You can use 
    // the same transporter object for all e-mails 
     
    // setup e-mail data with unicode symbols 
    var mailOptions = {
        from: 'JS Quiz ✔ <noreply@jsquiz.com>', // sender address 
        to: email, // list of receivers 
        subject: 'Mot de passe provisoire ', // Subject line 
        text: '', // plaintext body 
        html: 'Bonjour <b>' + pseudo +  '</b>, une demande de reinitialisation de mot de passe a été faite sur jsquiz.</br>' 
        + ' Si vous n\'êtes pas l\'auteur de cette demande vous pouvez ignorer ce mail.</br>' 
        + ' Si vous en êtes l\'auteur votre mot de passe provisoire est: <b>'+password + '</br>'
        + ' Ce mot de passe n\'est valable que pendant 5 minutes,</br>'
        + ' pensez donc à en créer un nouveau une fois connecté !' // html body 
    };
     
    // send mail with defined transport object 
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
          console.log(error);
          console.log('ERROR');
          onFail();
        }else{
          console.log('Message sent: ' + info.response);
           onSuccess();
        }
    });
};


//Permet d'envoyer tout type de mail 
exports.envoyerMail = function(emailCibles, subject, html, onSuccess, onFail ){ 
    // create reusable transporter object using SMTP transport 
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'felix8971@gmail.com',
            pass: 'galak7545'
        }
    });
     
    // NB! No need to recreate the transporter object. You can use 
    // the same transporter object for all e-mails 
     
    // setup e-mail data with unicode symbols 
    var mailOptions = {
        from: 'JS Quiz ✔ <noreply@jsquiz.com>', // sender address 
        to: emailCibles, // list of receivers 
        subject: subject , // Subject line 
        text: '', // plaintext body 
        html: html 
    };
    // send mail with defined transport object 
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
          console.log(error);
          console.log('ERROR');
          onFail();
        }else{
          console.log('Message sent: ' + info.response);
           onSuccess();
        }
    });
};


//Pour copier de fichier
var fs = require("fs");

exports.copyFile = function(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}


exports.getAmisEnCommun = function(liste1, liste2){
    
    var communs = [];//array des amis en commun 

    for(var i=0;i<liste1.length;i++){
        for(var j=0;j<liste2.length;j++){
            if ( liste1[i] === liste2[j]){
               communs.push(liste2[j]);
            }
        }
    }
    return communs;
}


exports.accesQuiz = function(val, isCreateur, isFriend){
  if ( isCreateur || ( val === 'Tous les membres' ) || (isFriend && (val === 'Moi et mes amis')) ){
      return true;
  }else{
      return false;
  }  
}