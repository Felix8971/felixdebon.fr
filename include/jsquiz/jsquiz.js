module.exports = function(app, io, server){
	
	var home = __dirname;
	
	var db = require('./db');//module à part pour gerer les acces bdd

	var multer = require('multer');
	var mongo = require('mongodb');//utile pour creer les objectID mongo
	var moment = require('moment');
	var passwordHash = require('password-hash');
	var fs = require("fs");
	var easyimg = require('easyimage');//pour creer les thumbnail

	var tools = require('./tools');//mes petits outils
	// Connection URL
	var url_JsQuiz = 'mongodb://localhost:27017/jsquiz';//27017 est le port par defaut pour mongodb si on ne le precise pas, on peut passer plusieurs hotes pour acceder à des bases sur plusieurs serveurs


	console.log(tools.dateDuJour());

	
	//Lance le callback si le user est connecté sinon affiche une page 404 
	var ifIsConnected = function(req,res,txt,callback){
	    if ( req.session.estConnecte ){
	        callback();
	    }else{
	        if ( txt === '' ){ txt = 'Te conduire vers cette page je ne puis...'; }
	        res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : txt});        
	    }
	}

	//-------------------------------- Routage  --------------------------------- 
	app.get(['/','/jsquiz'],function (req,res) {
	    req.session.uid = Date.now();
	    //console.log('req.session.uid='+req.session.uid);
	    tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	        //console.log('amis:',amis);
	        //puis affiche le template index
	        tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){
	            rechercher(db,'quiz::1', '', function(result){
	                res.render('jsquiz/index', {
	                    estConnecte: req.session.estConnecte,
	                    pseudo: req.session.pseudo,
	                    //amis:amis,//contiendra la liste d'ami de req.session.pseudo
	                    home:home,
	                    msg:'',
	                    nbrAmisEnAttente:nbrAmisEnAttente,
	                    nbrQuizes:result.quizes.length,
	                    quizes:result.quizes,               
	                });//index .jade            
	            });
	        });           
	    });     


	    // var collections = db.get().collection('quiz');
	    // collections.update({titre:'Mongo DB'}, { $set: { createur:'tof'} },{ multi: true },function(error, result) {
	    //     if ( error ){ 
	    //         console.log('error on update');
	    //     }else{
	    //        console.log('ok ');
	    //     }
	    // }); 
		
	});

	app.get('/about',function (req,res) {
	    tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){
		   res.render('jsquiz/about', {estConnecte: req.session.estConnecte, pseudo: req.session.pseudo, msg:'',nbrAmisEnAttente:nbrAmisEnAttente} );
	    });
	});

	app.get('/infoMessage', function (req,res){
	    res.render('jsquiz/infoMessage');
	});

	// Fonction de recherche d'une sous-chaine en base, on recherche soit 
	// - sur les champs pseudo, prenom et nom de la collection user
	// - sur le titre de la collection quiz
	// - sur titre et pseudo de la collection discussions
	var rechercher = function(db, what, sousChaine, callback){
	   
	    if ( what === 'membre' ){
	        var users = db.get().collection('users');
	        var queryUsers = { 
	            $or: [ 
	                { pseudo: new RegExp(sousChaine,'i') },
	                { nom: new RegExp(sousChaine,'i') }, 
	                { prenom: new RegExp(sousChaine,'i') }
	            ] 
	        };
	        //users.find({pseudo: new RegExp(sousChaine,'i')}).limit(10).toArray(function(err, docUsers){
	        users.find(queryUsers).limit(1000).toArray(function(err, docUsers){    
	            //console.log('nbrUsers='+ docUsers.length);
	            //console.log('docUsers=',docUsers);
	            var result = {users:docUsers};
	            callback(result);
	        });   
	    }

	    if ( what.indexOf('quiz') >= 0 ){
	        var quiz = db.get().collection('quiz');
	        // quiz.distinct('titre', function(err, docQuizes) {
	        //     console.log('docQuizes=',docQuizes);
	        //     var result = {users:docUsers, quizes:docQuizes};
	        //     callback(result);
	        // });
	       
	        //on peut ajouter en option un pseudo en plus pour afficher les quiz d'un seul membre
	        var options = what.split(':');

	        if ( options[1] != undefined && options[1] != '' ){    
	            var query = { createur : options[1] };
	        }else{
	            var query = {};
	        }
	        //on peut trier les quiz par date de creation croissante(-1) ou decroissante(1) 
	        if ( options[2] != undefined && options[2] != '' ){    
	            var sort = { date : parseInt(options[2]) };
	        }else{
	            var sort = {date:-1};
	        }        
	        // var Value_match =  new RegExp(sousChaine,'i');
	        // console.log('value_match='+Value_match);
	        // Value_match = '/qu/';
	        quiz.aggregate([ 
	            { $match: query },
	            { $sort: sort },
	            { $group: {_id: {id:'$id', titre:'$titre', createur:'$createur' }, "count": { $sum: 1 } } } ]).toArray(function(err, docQuizes) {
	            //assert.equal(null, err);
	            //console.log('docQuizes=', docQuizes);

	            var docQuizesFiltre = [];
	            
	            var re = new RegExp(sousChaine, 'ig');

	            for(var i=0;i<docQuizes.length;i++){
	                if ( docQuizes[i]._id.titre.match(re) ){
	                    docQuizesFiltre.push(docQuizes[i]);
	                }
	            }
	            //console.log('docQuizesFiltre=', docQuizesFiltre);
	            var result = {quizes:docQuizesFiltre};
	            callback(result);
	        });        
	    }    


	    if ( what === 'discussion' ){
	        var discussions = db.get().collection('discussions');
	   
	        var sousChaine = sousChaine.replace(/\*/ig,'');//J'enleve les * car sinon le regExp plante

	        //var query = { titre: new RegExp(sousChaine,'i') };
	        var query = { 
	            $or: [ 
	                { titre: new RegExp(sousChaine,'i') }, 
	                { createur: new RegExp(sousChaine,'i') }
	            ] 
	        }

	        discussions.find(query).limit(1000).toArray(function(err, docs){    
	            //console.log('nbrDocs='+ docs.length);
	            callback({discussions:docs});     
	        }); 
	    }
	}


	// Fonction de recherche d'une sous-chaine en base sur les champs
	// pseudo, prenom et nom de la collection user et sur le titre de la collection quiz
	// var rechercher = function(db, sousChaine, callback){
	   
	//     var users = db.get().collection('users');
	//     var quiz = db.get().collection('quiz');
	//     var queryUsers = { 
	//         $or: [ 
	//             { pseudo: new RegExp(sousChaine,'i') },
	//             { nom: new RegExp(sousChaine,'i') }, 
	//             { prenom: new RegExp(sousChaine,'i') }
	//         ] 
	//     };
	//     //users.find({pseudo: new RegExp(sousChaine,'i')}).limit(10).toArray(function(err, docUsers){
	//     users.find(queryUsers).limit(1000).toArray(function(err, docUsers){    
	//         console.log('nbrUsers='+ docUsers.length);
	//         console.log('docUsers=',docUsers);
	//         // quiz.distinct('titre', function(err, docQuizes) {
	//         //     console.log('docQuizes=',docQuizes);
	//         //     var result = {users:docUsers, quizes:docQuizes};
	//         //     callback(result);
	//         // });
	       
	//         // var Value_match =  new RegExp(sousChaine,'i');
	//         // console.log('value_match='+Value_match);
	//         // Value_match = '/qu/';
	        
	//         quiz.aggregate([ 
	//             { $match: {  } },
	//             { $group: {_id: {id:'$id', titre:'$titre', createur:'$createur' }, "count": { $sum: 1 } } } ]).toArray(function(err, docQuizes) {
	//           //assert.equal(null, err);
	//             console.log('docQuizes=', docQuizes);

	//             var docQuizesFiltre = [];
	            
	//             var re = new RegExp(sousChaine, 'ig');

	//             for(var i=0;i<docQuizes.length;i++){
	//                 if ( docQuizes[i]._id.titre.match(re) ){
	//                     docQuizesFiltre.push(docQuizes[i]);
	//                 }
	//             }
	//             console.log('docQuizesFiltre=', docQuizesFiltre);
	//             var result = {users:docUsers, quizes:docQuizesFiltre};
	//             callback(result);
	//         });

	//    // [ { _id: { id: 568573497f9acbd95aff9b77, titre: 'quiz 1', createur: 'Vador' }, count: 2 },
	//    //   { _id: { id: 568573497f9acbd95aff9b85, titre: 'Les bases du JavaScript', createur: 'Felix' }, count: 2 } ]

	//     });   
	// }



	app.get(['/rechercheMembre','/rechercheMembre/:msg'], function (req,res){
	    ifIsConnected(req,res,'', function(){
	        rechercher(db,'membre', '', function(result){
	            //on recupere la liste d'ami de req.session.pseudo dans la collection users
	            tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	                
	                if ( typeof amis === 'undefined'){ var amis = []; }

	                //console.log('amis=',amis);
	                //puis affiche le template recherche.jade
	                tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){
	                    res.render('jsquiz/rechercheMembre', {
	                        nbrUsers:result.users.length, 
	                        users:result.users,
	                        nbrAmisEnAttente:nbrAmisEnAttente, 
	                        amis:amis,//contiendra la liste d'ami de req.session.pseudo
	                        estConnecte: req.session.estConnecte,
	                        pseudo: req.session.pseudo, 
	                        msg:req.params.msg} 
	                    );
	                });                 
	            }); 
	        });
	    });
	});

	// var obj = { a: 145454 };
	// var copy = Object.assign({}, obj);
	// console.log(copy.a);

	app.get(['/rechercheQuiz','/rechercheQuiz/:msg'], function (req,res){ 
	    var txt = 'Te connecter tu dois pour participer aux quizz';
	    //console.log('req.params.msg=', req.params.msg);
	    //ifIsConnected(req,res,txt,function(){
	        rechercher(db,'quiz::-1', '', function(result){
	            res.render('jsquiz/rechercheQuiz', {
	                nbrQuizes:result.quizes.length,
	                quizes:result.quizes,
	                estConnecte: req.session.estConnecte,
	                pseudo: req.session.pseudo,
	                msg:req.params.msg
	            });
	        });
	    //});
	});

	app.get('/mesAmis', function (req,res){
	    ifIsConnected(req,res,'',function(){
	        rechercher(db,'membre' ,'', function(result){
	            //on recupere la liste d'ami de req.session.pseudo dans la collection users
	            tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	                res.render('jsquiz/mesAmis', {
	                    nbrAmis: tools.getConfirmedFriends(amis).length, 
	                    amis:amis,//contiendra la liste d'ami de req.session.pseudo
	                    estConnecte: req.session.estConnecte,
	                    pseudo: req.session.pseudo } 
	                );                
	            }); 
	        });
	    });    
	});

	//Affiche la page qui me donne les friendRequest en attente de confirmation et les invitations en cours
	app.get('/friendRequest', function (req,res){
	    ifIsConnected(req,res,'',function(){
	        rechercher(db, 'membre', '', function(result){
	            //on recupere la liste d'ami de req.session.pseudo dans la collection users
	            tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	               
	                if ( typeof amis === 'undefined'){
	                    var amis = [];     
	                }    
	                //console.log('amis===',amis);
	                //puis affiche le template recherche
	                tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){
	                    res.render('jsquiz/friendRequest', {
	                        nbrUsers:result.users.length, 
	                        //nbrQuizes:result.quizes.length,
	                        users:result.users, 
	                        //quizes:result.quizes,
	                        nbrAmisEnAttente:nbrAmisEnAttente,
	                        amis:amis,//contiendra la liste d'ami de req.session.pseudo
	                        estConnecte: req.session.estConnecte,
	                        pseudo: req.session.pseudo } 
	                    );
	                });                 
	            }); 
	        });
	    });
	});



	var onglets = ['/profil/:pseudo', '/info/:pseudo', '/amis/:pseudo','/quizes/:pseudo'];

	//Affiche le profil d'un utilisateur (c à dire son mur)
	app.get(onglets,function (req,res) {
	    console.log('req=',req.path);
	    console.log('pseudo='+req.params.pseudo);
	    ifIsConnected(req,res,'',function(){
	        
	        //on va verifier que req.params.pseudo est dans la liste d'ami de req.session.pseudo...
	        tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis',function(amis){
	            
	            var statut = tools.getFriendStatut(amis, req.params.pseudo);
	            //console.log('statut:'+statut);
	            //on recuperer les infos de req.params.pseudo en base 
	            tools.getCollectionDocument(db,'users',{pseudo:req.params.pseudo},function(userOwner){   
	            //var collections = db.get().collection('users');
	            //var cursor = collections.find({pseudo:req.params.pseudo}).toArray(function(err, documents){
	                //console.log('user=',user);
	                //console.log("userOwner=",userOwner);
	                if ( typeof userOwner != 'undefined' && userOwner != null ){    

	                    if ( typeof userOwner.amis === 'undefined' ){ userOwner.amis = []; }

	                    userOwner.nbrAmis = tools.getConfirmedFriends(userOwner.amis).length; 
	                    userOwner.age = parseInt((new Date()).getFullYear()) - parseInt(userOwner.anneeNaissance);
	                    // req.session.pseudo peut etre different de userOwner.pseudo
	                    //j'enregistre en session le proprietaire du profil visité (ca va servir pour ajouter des posts)
	                    req.session.profilOwner = req.params.pseudo;
	                    //console.log("userOwner.nbrAmis=",userOwner.nbrAmis);
	                    //Je recupere les posts de profilOwner en affichant les derniers postés en premier
	                    var collections = db.get().collection('posts');  
	                    var cursor = collections.find({profilOwner:req.params.pseudo}).sort( { date: -1 } ).toArray(function(err, posts){
	                        //J'affiche la page profil
	                        
	                        //console.log('posts=',posts);
	                        for(var i=0;i<posts.length;i++){
	                            if ( posts[i].text != null ){
	                                posts[i].text = posts[i].text.replace(/\n/g, '<br>'); 
	                            }
	                        }
	                        //console.log('posts=',posts);
	                        //si je suis sur mon profil ou celui d'un ami confirmé ou que je suis l'admnistrateur alors accesPosts === true
	                        var accesPosts = ( req.session.pseudo === 'jsquiz' || statut === 'confirmed' || req.session.pseudo === req.params.pseudo ) ? true : false;
	                       
	                        var amisConfirmedVisiteur = tools.getConfirmedFriends(amis);
	                        //var amisConfirmedEnCommun = tools.getAmisEnCommun(tools.getConfirmedFriends(amis),tools.getConfirmedFriends(userOwner.amis))
	                        //console.log('amisConfirmedVisiteur=',amisConfirmedVisiteur);
	                       
	                        //console.log('amisConfirmedVisiteur=',amisConfirmedVisiteur);
	                        //console.log('userOwner.amis=',userOwner.amis);

	                        //console.log('userOwner.amis=',userOwner.amis);

	                        var page = 'jsquiz/'+ req.path.split('/')[1];
	                        console.log('page:'+page)

	                        //Je recupere au passage la liste des tous les users au (cas amis à suggerer par administrateur)
	                        tools.getUsersPseudoArray(db,{}, function(allUsersTab){
	                            
	                            var amisAsuggerer = [];

	                            if ( req.session.pseudo === 'jsquiz' ){
	                                amisAsuggerer = tools.getAmisAsuggerer( allUsersTab, userOwner.amis);                              
	                            }else{
	                                amisAsuggerer = tools.getAmisAsuggerer( amisConfirmedVisiteur, userOwner.amis);                           
	                            }

	                            //J'enleve req.params.pseudo de la liste des amis à suggerer
	                            amisAsuggerer.splice(amisAsuggerer.indexOf(req.params.pseudo), 1);
	                            //console.log('amisAsuggerer=', amisAsuggerer);

	                            tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){
	                                //console.log('amis en attente pour felix=',nbrAmisEnAttente);
	                                rechercher(db,'quiz:'+req.params.pseudo, '', function(result){ 
	                                    res.render(page, { 
	                                        estConnecte: req.session.estConnecte,
	                                        accesPosts: accesPosts,
	                                        pseudo: req.session.pseudo,
	                                        statut: statut,
	                                        nbrAmisEnAttente:nbrAmisEnAttente,//utilisé pour afficher l'icon rouge dans la barre de navigation 
	                                        amisAsuggerer: amisAsuggerer,
	                                        pronom: ( userOwner.genre === 'Homme' ) ? 'il' : 'elle',
	                                        profilOwner: req.params.pseudo,
	                                        profilOwnerIsConnected: connectedMembers[req.params.pseudo] != undefined ? true:false,
	                                        data: {user:userOwner, posts:posts},
	                                        amis: tools.getConfirmedFriends(userOwner.amis), //used for delete friend (admin only)
	                                        quizes: result.quizes,
	                                        nbrQuizes:result.quizes.length
	                                    });
	                                });
	                            });                            
	                        });
	                    });
	                }else{//user === null
	                    //console.log("req.session.pseudo=",req.session.pseudo);
	                    res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Te conduire vers ce profil je ne puis...'});
	                }
	            });
	        });
	    });
	});

	// tools.getAmisEnAttente(db, 'Felix', function(tab){
	//     console.log('amis en attente pour felix=',tab);
	// });

	//Affiche la liste des discussions que j'ai ouvert et celles auquelles je participe comme guest
	app.get(['/discussions','/discussions/:msg'],function (req,res) {
	    //console.log('req=',req.path);
	    //console.log('req.params.msg=', req.params.msg);
	    ifIsConnected(req,res,'',function(){
	        //var collections = db.get().collection('discussions');  
	        //collections.find({}).toArray(function(err, discussions){
	        //console.log("discussions=",discussions);    
	        tools.getNbrAmisEnAttente(db, req.session.pseudo, function(nbrAmisEnAttente){

	            res.render('jsquiz/discussions', { 
	                estConnecte: req.session.estConnecte,
	                pseudo: req.session.pseudo,
	                nbrAmisEnAttente:nbrAmisEnAttente,
	                //Nouvelle facon de faire: 
	                //Je passe un objet vide puis à l'ouverture de discussion.jade je ferai un socket.emit('rechercherDiscussion','')
	                //afin de mettre à jour la page (evite de dupliquer le meme code à 2 endroits)
	                discussions: {},//discussions, 
	                msg:req.params.msg
	            });
	        });
	        //});
	    });
	});




	//Affiche  la page d'une discussion particuliere 
	//(Si le user connait l'id c'est qu'il a acces à cette discussion, voir discussions.jade)
	app.get('/discussion/:id',function (req,res) {
	    //console.log('req=',req.path);
	    var _id = new mongo.ObjectId(req.params.id);
	    //console.log('_id mongo discussion='+_id);
	    ifIsConnected(req,res,'',function(){
	        var collections = db.get().collection('discussions');  
	        collections.find({_id:_id}).toArray(function(err, discussions){
	            if(err){
	               res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Cette discussion n\'existe pas...'});
	            }else{
	                //console.log("discussion=",discussions[0]); 
	                if ( discussions[0] ){
	                    var nbMsg =  discussions[0].messages.length;
	                    for(var i=0;i<nbMsg;i++){
	                        discussions[0].messages[i].txt = discussions[0].messages[i].txt.replace(/\n/g, '<br>'); 
	                    }

	                    console.log('nbMsg='+nbMsg);
	                    //le user a ouvert la page donc on considere qu'il a lu les msg
	                    var nbrMsgLusParUser = discussions[0].nbrMsgLusParUser
	                    

	                    nbrMsgLusParUser[req.session.pseudo] = nbMsg;

	                    var collections = db.get().collection('discussions');
	                    collections.update({_id:_id}, { $set: { nbrMsgLusParUser:nbrMsgLusParUser } }, function(error, result) {
	                        if ( error ){ 
	                            console.log('error on update');
	                        }else{
	                           console.log('update nbrMsgLusParUser done for '+req.session.pseudo);
	                        }
	                    }); 

	                    res.render('jsquiz/discussion', { 
	                        estConnecte: req.session.estConnecte,
	                        pseudo: req.session.pseudo,
	                        moment: moment,
	                        discussion: discussions[0]
	                    });
	                }else{
	                    res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Cette discussion n\'existe pas...'});
	                }
	            }
	        });
	    });
	});


	app.get('/formulaireQuiz/:id',function (req,res) {

	    if ( req.params.id.length != 24 ){
	        res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	    }else{
	        var id = new mongo.ObjectId(req.params.id);
	        //console.log('req=',req.path);console.log('id mongo ='+id);
	        var txt = 'Te connecter tu dois pour participer aux quizz';

	        //ifIsConnected(req,res,txt,function(){
	        if( req.session.estConnecte ){    
	            var collections = db.get().collection('quiz');  
	            collections.find({id:id}).toArray(function(err, quiz){
	                if(err){
	                   res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	                }else{
	                    //console.log("quiz=",quiz); 
	                    if ( quiz.length ){
	                        //on va verifier les droits d'accces de req.session.pseudo sur ce quiz
	                        var createur = quiz[0].createur;
	                        var lastModifiedBy = typeof quiz[0].lastModifiedBy != 'undefined'?quiz[0].lastModifiedBy:'';
	                        //console.log('createur=',createur);
	                        tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis',function(amis){
	                            //console.log('amis:'+amis);
	                            var isAdmin = (req.session.pseudo === 'jsquiz' ) ? true:false;
	                            var isCreateur = (createur === req.session.pseudo || isAdmin ) ? true:false;
	                            var isFriend = (tools.getFriendStatut(amis, createur) === 'confirmed' || isAdmin) ? true:false;
	                            //console.log('isCreateur:'+isCreateur);console.log('isFriend:'+isFriend);
	                            //console.log('quiz[0].visiblePar:'+quiz[0].visiblePar);console.log('quiz[0].modifiablePar:'+quiz[0].modifiablePar);

	                            var visible = tools.accesQuiz(quiz[0].visiblePar, isCreateur, isFriend);
	                            var modifiable = tools.accesQuiz(quiz[0].modifiablePar, isCreateur, isFriend);
	                            //console.log('visible:'+visible);console.log('modifiable:'+modifiable);

	                            if ( visible ){
	                                //var randomImg = tools.getRandomInt(0,1);//console.log("randomImg=",randomImg); 
	                                //remplacer < par &lt; et  &gt; par >    
	                                // for (var i=0;i<quiz.length;i++) {
	                                //     //console.log('quiz(i)===',quiz[i]);
	                                //     console.log('question='+quiz[i].question);
	                                //     //quiz[i].question = quiz[i].question.replace(/</ig, "<br>;"); 
	                                //     for (var j=0;j<quiz[i].reponses.length;j++) {
	                                //         //console.log('rep=========',quiz[i].reponses[j].txt);
	                                //         quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/</ig, "&lt;"); 
	                                //         quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/>/ig, "&gt;"); 
	                                //         quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/\n/g, '<br/>')
	                                //         ////quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/ /ig, "&nbsp;"); 
	                                //     }
	                                // }
	                                

	                                var scoreMoyenAllUsers = 0;
	                                var scoreMaxAllUsers = 0;
	                                var meilleurPseudo = '';
	                                //Recherche score moyen et score max
	                                var scores = db.get().collection('scores');
	                                var cursor = scores.find({id:id}).toArray(function(err, documents){
	                                    var nbrDoc = documents.length;

	                                    console.log('nbrDoc=',nbrDoc);   
	                                    for(var i=0;i<nbrDoc;i++){//pour chaque discussions
	                                       scoreMoyenAllUsers += documents[i].score;
	                                       if ( documents[i].score > scoreMaxAllUsers ){
	                                            scoreMaxAllUsers = documents[i].score;
	                                            meilleurPseudo = documents[i].pseudo;
	                                       }
	                                    }               
	                                    //console.log('scoreMoyenAllUsers=',scoreMoyenAllUsers);  
	                                    scoreMoyenAllUsers = parseInt(10*scoreMoyenAllUsers/nbrDoc)/10;
	                                    //console.log('scoreMoyenAllUsers=',scoreMoyenAllUsers);  
	                                    res.render('jsquiz/formulaireQuiz', { 
	                                        estConnecte: req.session.estConnecte,
	                                        pseudo: req.session.pseudo,
	                                        quiz: quiz,
	                                        idQuiz : id,
	                                        modifiable:modifiable,
	                                        moment: moment,
	                                        scoreMoyenAllUsers: scoreMoyenAllUsers,
	                                        scoreMaxAllUsers: scoreMaxAllUsers,
	                                        meilleurPseudo:meilleurPseudo
	                                        //randomImg:tools.getRandomInt(0,1)//affiche une image fun aleatoirement en debut de page               
	                                    });                                    
	                                });

	                            }else{
	                                res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz est en accès limité'});
	                            }
	                        });

	                    }else{
	                        res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	                    }
	                }
	            });
	        }else{//);
	            res.redirect('/visualiserQuiz/'+ req.params.id);
	        }
	    }
	});

	app.get('/visualiserQuiz/:id',function (req,res) {
	    var id = new mongo.ObjectId(req.params.id);
	    //console.log('req=',req.path);console.log('id mongo ='+id);
	    var collections = db.get().collection('quiz'); 
	    collections.find({id:id}).toArray(function(err, quiz){
	        if(err){
	           res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	        }else{
	            //console.log("quiz=",quiz); 
	            if ( quiz.length ){
	                //on va verifier les droits d'accces de req.session.pseudo sur ce quiz
	                var createur = quiz[0].createur;
	                //console.log('createur=',createur);
	                //console.log('quiz[0].visiblePar:'+quiz[0].visiblePar);//console.log('quiz[0].modifiablePar:'+quiz[0].modifiablePar);
	                if ( quiz[0].visiblePar === 'Tous les membres' ){
	                    //var randomImg = tools.getRandomInt(0,1);//console.log("randomImg=",randomImg); 
	                    // for (var i=0;i<quiz.length;i++) {
	                    //     //console.log('quiz(i)===',quiz[i]);
	                    //     for (var j=0;j<quiz[i].reponses.length;j++) {
	                    //         //console.log('rep==',quiz[i].reponses[j].txt);
	                    //         quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/</ig, "&lt;"); 
	                    //         quiz[i].reponses[j].txt = quiz[i].reponses[j].txt.replace(/>/ig, "&gt;"); 
	                    //     }
	                    // }
	                    res.render('jsquiz/visualiserQuiz', { 
	                        estConnecte: req.session.estConnecte,
	                        pseudo: req.session.pseudo,//pour la barre de navigation                
	                        quiz: quiz,
	                        moment: moment,
	                        randomImg:tools.getRandomInt(0,1)//affiche une image fun aleatoirement en debut de page              
	                    });
	                }else{
	                    res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz est en accès limité'});
	                }
	            }else{
	                res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	            }
	        }
	    });
	});
	/*

	db.discussions.insert( { titre:'Le javascript', date:new Date(), createur:'Felix', guests:["Vador","Luc"], messages:[{ _id: new ObjectId(), auteur:"Felix",date:new Date(),txt:"bla bla bla bla", 
	commentaires:[{auteur:'Vador',txt:"bli bli bli blo blo",date:new Date()}] },{ _id: new ObjectId(), auteur:"Luc",date:new Date(),txt:" dd  m em elkemle lmek", commentaires:[{auteur:'Vador',txt:"slkdf smlfksmlf mlfkm",date:new Date()}] } ] });
	db.discussions.insert( { titre:'Meteor', date:new Date(), createur:'Felix', guests:["Vador","Luc"], messages:[{_id: new ObjectId(), auteur:"Felix",date:new Date(),txt:"bla bla bla bla", commentaires:[{auteur:'Vador',txt:"bli bli bli blo blo",date:new Date()}] }] });
	db.discussions.insert( { titre:'socket.io', date:new Date(), createur:'Bob', guests:["Vador","Luc"], messages:[{_id: new ObjectId(), auteur:"Bob",date:new Date(),txt:"bla bla bla bla", commentaires:[{auteur:'Vador',txt:"bli bli bli blo blo",date:new Date()}] }] });
	db.discussions.insert( { titre:'Jquery', date:new Date(), createur:'Bob', guests:["Vador","Luc", "Felix"], messages:[{_id: new ObjectId(), auteur:"Bob",date:new Date(),txt:"bla bla bla bla", commentaires:[{auteur:'Vador',txt:"bli bli bli blo blo",date:new Date()}] }] });


	//db.quiz.update({_id:ObjectId("5689957eddd1bcf44354e1ed")}, { $addToSet : { results:{"pseudo":"aaa", "reponse":1 }  } })

	db.quiz.update({_id:ObjectId("5689957eddd1bcf44354e1ed")}, { $addToSet : { results:{"pseudo":"Toto", "rep":1 , date:new Date()}  } })

	db.quiz.insert( 
	{ 
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Parmi ces bouts de code, lequel permet de déclarer une fonction nommée maFonction ?", 
	  reponses:[
	    {txt:"new function (){ name: maFonction;<br>&nbsp;&nbsp;alert('bonjour');<br> }",val:false },
	    {txt:"function maFonction(){<br>&nbsp;&nbsp;alert('bonjour');<br> }", val:true },
	    {txt:"maFonction function(){<br>&nbsp;&nbsp;alert('bonjour');<br> }", val:false } 
	  ],
	  results:[
	    {pseudo:'Vador', reponse:0, date:new Date()},
	    {pseudo:'Felix', reponse:1, date:new Date()}
	  ]
	});

	db.quiz.insert({ 
	  id:ObjectId("568573497f9acbd95aff9b85"),  
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Pour inserer du code JavaScript dans le code HTML, dans quelle balise doit-on le placer ?", 
	  reponses:[
	    {txt:"&lt;script&gt;",val:true },
	    {txt:"&lt;javascript&gt;", val:false },
	    {txt:"&lt;js&gt;", val:false } 
	  ]
	});

	db.quiz.insert( 
	{ 
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Comment déclare-t-on une variable n correpondant à l'entier 5 ?", 
	  reponses:[
	    {txt:'int n = 5;',val:false },
	    {txt:'var n = 5;', val:true },
	    {txt:'n := 5;',val:false } 
	  ]
	});



	db.quiz.insert( 
	{ 
	  id:ObjectId("568573497f9acbd95aff9b77"), 
	  titre:"quiz 1",
	  date:new Date(), 
	  createur:"Vador",
	  question:"sfzjrkf ?", 
	  reponses:[
	    {txt:'int n = 5;',val:false },
	    {txt:'var n = 5;', val:true },
	    {txt:'n := 5;',val:false } 
	  ]
	});

	db.quiz.insert( 
	{ 
	  id:ObjectId("568573497f9acbd95aff9b77"), 
	  titre:"quiz 1",
	  date:new Date(), 
	  createur:"Vador",
	  question:"s45454 ?", 
	  reponses:[
	    {txt:'int n = 5;',val:false },
	    {txt:'var n = 5;', val:true },
	    {txt:'n := 5;',val:false } 
	  ]
	});

	----------------------------------------------------

	db.quiz.insert({ 
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Si le code JavaScript est présent dans le code HTML, dans quelle balise doit-il être placé ?", 
	  reponses:[
	    {txt:"&lt;script&gt;",val:true },
	    {txt:"&lt;javascript&gt;", val:false },
	    {txt:"&lt;js&gt;", val:false } 
	  ]
	});

	db.quiz.insert({ 
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Comment déclare-t-on une variable valant le chiffre 2 ?", 
	  reponses:[
	    {txt:"int monChiffre = 2;",val:false },
	    {txt:"Number monChiffre = 2;", val:false },
	    {txt:"var monChiffre = 2;", val:true } 
	  ]
	});

	db.quiz.insert({ 
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Parmi ces syntaxes, laquelle permet d'écrire une condition qui vérifie que la variable a est égale à 2 ?", 
	  reponses:[
	    {txt:"if(a = 2)",val:false },
	    {txt:"if(a == 2)", val:true },
	    {txt:"if a=2", val:false } 
	  ]
	});

	db.quiz.insert({  
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Un fichier \".js\" ne doit pas contenir :", 
	  reponses:[
	    {txt:"de document.getElementById",val:false },
	    {txt:"de balise &lt;script&gt;", val:true },
	    {txt:"de variable globale", val:false } 
	  ]
	});

	db.quiz.insert({  
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Quel type de commentaire n'est pas un commentaire JavaScript ?", 
	  reponses:[
	    {txt:"&lt;!-- Commentaire --&gt;",val:true },
	    {txt:"\/* Commentaire *\/", val:false },
	    {txt:"\/\/Commentaire", val:false } 
	  ]
	});

	db.quiz.insert({   
	  id:ObjectId("568573497f9acbd95aff9b85"), 
	  titre:"Les bases du JavaScript",
	  date:new Date(), 
	  createur:"Felix",
	  question:"Comment concatène-t-on deux chaînes de caractères ?", 
	  reponses:[
	    {txt:"\"ma \" . \"chaine\"",val:false },
	    {txt:"\"ma \" + \"chaine\"", val:true },
	    {txt:"\"ma \" || \"chaine\"", val:false } 
	  ]
	});



	db.quiz.insert({   
	  id:ObjectId("568573497f9acbd95aff9b86"), 
	  titre:"Jquery",
	  date:new Date(), 
	  createur:"Julie",
	  question:"omfkzmefkzmfkml efzmefk zmeflkze fzlfk zemflk ?", 
	  reponses:[
	    {txt:"\"ma \" . \"chaine\"",val:false },
	    {txt:"\"ma \" + \"chaine\"", val:true },
	    {txt:"\"ma \" || \"chaine\"", val:false } 
	  ]
	});


	db.quiz.insert({   
	  id:ObjectId("568573497f9acbd95aff9b86"), 
	  titre:"Jquery",
	  date:new Date(), 
	  createur:"Julie",
	  question:"od r f rf rerf rk ?", 
	  reponses:[
	    {txt:"erfe",val:false },
	    {txt:"erfreer", val:true },
	    {txt:"erferf", val:false } 
	  ]
	});



	db.quiz.insert({   
	  id:ObjectId("568573497f9acbd95aff9b87"), 
	  titre:"Les closures",
	  date:new Date(), 
	  createur:"Felix",
	  question:"od r f edefzerf rerf rk ?", 
	  reponses:[
	    {txt:"erfe",val:false },
	    {txt:"erfreer", val:true },
	    {txt:"erferf", val:false } 
	  ]
	});


	6.  Comment concatène-t-on deux chaînes de caractères ?
	"ma " . "chaine"
	"ma " + "chaine"
	"ma " || "chaine"

	7.  Comment déclare-t-on une chaine de caractères ?
	var chaine = "ma chaine";
	var chaine = 'ma chaine';
	Les deux versions sont équivalentes.


	8.  Parmi ces syntaxes, laquelle permet de construire un tableau ?
	var monTableau = {"élément1", "élément2", "élément3"};
	var monTableau = ["élément1", "élément2", "élément3"];
	var monTableau = [0: "élément1", 1: "élément2", 2: "élément3"];

	9.  Parmi ces syntaxes, laquelle permet d'inclure un script externe à la page HTML ?
	<script langage="javascript" src="xxx.js">
	<script type="text/javascript" src="xxx.js">
	<script type="text/javascript" name="xxx.js">

	10.  Parmi ces syntaxes, laquelle permet de déclarer une fonction nommée maFonction ?


	new function (){ name: maFonction;  
	   alert('bonjour');                
	}

	function maFonction(){  
	   alert('bonjour');
	}

	maFonction function (){  
	   alert('bonjour');
	}


	*/



	app.get(['/creerDiscussion','/creerDiscussion/:cible'],function (req,res) {
	    ifIsConnected(req,res,'',function(){
	        var cible = typeof req.params.cible != 'undefined' ? req.params.cible : '';
	        //on recupere la liste d'ami de req.session.pseudo dans la collection users
	        tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	            res.render('jsquiz/creerDiscussion', { 
	                estConnecte: req.session.estConnecte,
	                pseudo: req.session.pseudo,
	                amis:tools.getConfirmedFriends(amis),
	                cible:req.params.cible
	            });
	        });
	    });
	});



	app.get('/formulaireConnexion', function (req,res){
	    if ( req.session.estConnecte ){ 
	        res.render('jsquiz/index', {estConnecte: req.session.estConnecte, pseudo: req.session.pseudo, msg:'You are already connected!' });
	    }else{
	        res.render('jsquiz/formulaireConnexion', { estConnecte: req.session.estConnecte});
	    }
	});


	app.get('/motDePassePerdu', function (req,res){
	    if ( req.session.estConnecte ){   
	        res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Te conduire vers cette page je ne puis...'});
	    }else{
	        res.render('jsquiz/motDePassePerdu'); 
	    }
	});

	app.get('/majPassword', function (req,res){
	    ifIsConnected(req,res,'',function(){
	        res.render('jsquiz/majPassword',{estConnecte: req.session.estConnecte,pseudo: req.session.pseudo});
	    });
	});


	//Modification du mot de passe
	app.post('/majPassword', function(req, res){ 
	    //console.log('majPassword');console.log(req.body); //form fields
	    if (!req.body) { 
	        console.log("probleme au post");
	        return res.sendStatus(400);
	    }else{
	        var collections = db.get().collection('users'), msg;//, search = /^[a-zA-Z0-9]+$/gi;
	        //on verifie que le pseudo req.body.pseudo est dispo
	        var cursor = collections.find({pseudo:req.session.pseudo}).toArray(function(err, documents){
	            //var nbrDoc = documents.length; console.log('nbrDoc='+nbrDoc); 

	            var passwordOK = passwordHash.verify(req.body.pwd, documents[0].pwd);
	            var pwdRecoveryOK = passwordHash.verify(req.body.pwd, documents[0].pwdRecovery);
	            
	            if ( passwordOK || pwdRecoveryOK ){
	                //console.log('pseudo:'+req.body.pseudo);console.log('pwdverif:'+req.body.pwdverif);console.log('pwd:'+req.body.pwd);
	                if ( req.body.newpwdverif != req.body.newpwd ){
	                   msg = 'Password and confirmation password not equal after submit !';
	                   res.render('jsquiz/majPassword', { pseudo: req.session.pseudo, msg:msg, data:data});
	                }else{ 
	                    var validator = tools.validerIdentifiants(req.session.pseudo, req.body.newpwd);
	                    if ( !validator.valid ){
	                        res.render('jsquiz/majPassword', { pseudo: req.session.pseudo, msg:validator.msg });    
	                    }else{  
	                        collections.update({ _id: documents[0]._id }, { $set: { 'pwd': passwordHash.generate(req.body.newpwd)} }, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme au update");
	                                return res.sendStatus(400);
	                            }else{
	                                console.log("Update pwd into the users collection.");
	                                var msg = 'Votre mot de passe a été modifié';
	                                res.render('jsquiz/index', {estConnecte: req.session.estConnecte, pseudo: req.session.pseudo, msg:msg } );
	                            }
	                        }); 
	                    }
	                }  
	            }else{
	                msg = 'Password incorrect!';
	                res.render('jsquiz/majPassword', { pseudo: req.session.pseudo, msg:msg});
	            }
	        });  
	    }
	});

	          
	app.post('/motDePassePerdu',function(req, res){ 
	     if (!req.body) { 
	        console.log("probleme au post");
	        return res.sendStatus(400);
	     }else{
	        //req.session.test = 12;
	        //console.log( db);
	        var collections = db.get().collection('users');

	        var query = { email: req.body.email };
	        var cursor = collections.find(query).toArray(function(err, documents){

	            if ( documents.length === 1){//si l'email existe en base

	                var pseudo = documents[0].pseudo;
	                //Envoyer un mail avec un mot de passe provisoire      
	                var password = String(new mongo.ObjectId());//'A' + tools.getRandomInt(100000000, 900000000);

	                var pwdHash = passwordHash.generate(password);
	                console.log(pwdHash);
	                
	                var id = documents[0]._id;
	                //console.log('_id='+id);    
	                
	                collections.update({ _id: id }, { $set: { 'pwdRecovery': pwdHash, 'timestampPwd':tools.timestamp()} }, function(error, result) {
	                    if ( error ){ 
	                        console.log("probleme au update");
	                        return res.sendStatus(400);
	                    }else{
	                        console.log("Update a document into the users collection.");
	                    }
	                }); 
	                
	                        
	                var retour = tools.envoyerMailPwdReset([req.body.email], pseudo, password,
	                    function(){
	                        console.log('Message sent');
	                        res.render('jsquiz/infoMessage',{ msg:{type:'success', txt:'Email envoyé !'} });
	                    },
	                    function(){
	                        var msg = 'Erreur à l\'envoie.';
	                        res.render('jsquiz/infoMessage',{ msg:{type:'error', txt:'Erreur: email non envoyé !'} });
	                    }                   
	                );

	            }else{
	              var msg = 'Cet email n\'est pas repertorié sur ce site. Si vous avez oublié aussi votre email vous pouvez recreer un nouveau compte.';
	              res.render('jsquiz/motDePassePerdu', { estConnecte: req.session.estConnecte, msg:msg});
	            }
	        });
	     }
	}); 



	//sert à la fois pour formulaireSignIn et formulaireInfoComplementaires
	var data = {
	    pseudo:'', pwd:'', email:'',
	    nom:'', prenom:'', genre:'', anneeNaissance:'', rue:'', codePostal:'', ville:'',
	    pays:'', presentation:'', uploadMsg:'', photo:false, date:''
	};  

	app.get('/formulaireSignIn', function (req,res){
		res.render('jsquiz/formulaireSignIn', { estConnecte: req.session.estConnecte, data:data});
	});


	app.get(['/formulaireInfoComplementaires/:pseudo','/formulaireInfoComplementaires'], function (req,res){
	    if ( req.session.estConnecte ){ 
	        var profilOwner = req.session.pseudo === 'jsquiz' ? req.params.pseudo : req.session.pseudo;
	        //console.log('profilOwner=',profilOwner);
	        //on recuperer les info du user en base pour pré-remplir les champs du formulaire
	        var collections = db.get().collection('users');
	        collections.find({'pseudo': profilOwner }).toArray(function(err, documents){
	            if ( documents.length === 1){ 
	                res.render('jsquiz/formulaireInfoComplementaires', { 
	                    estConnecte: req.session.estConnecte,
	                    pseudo: req.session.pseudo, // Attention !: utilisé dans navigation.jade
	                    profilOwner: profilOwner,
	                    data:documents[0],
	                    ajoutActionPost:'Admin'
	                });
	            }
	        });
	    }else{
	        res.render('jsquiz/404', { estConnecte: req.session.estConnecte});
	    }
	});


	app.get('/inscriptionOK', function (req,res){
		res.render('jsquiz/inscriptionOK'); 
	});



	//var limit = { limits: { fieldNameSize: 100, fileSize:2097152, files: 1, fields: 15 } };

	app.post('/signIn', function(req, res){ 
		//console.log('signIn');
		console.log(req.body); //form fields

	    if (!req.body) { 
			console.log("probleme au post");
			return res.sendStatus(400);
		}else{
	        //console.log('req.body.pseudo:'+req.body.pseudo);
	        var collections = db.get().collection('users');
	        var msg;//, search = /^[a-zA-Z0-9]+$/gi;
	        //console.log('pseudo:'+req.body.pseudo);
	       
	        var validator = tools.validerIdentifiants(req.body.pseudo, req.body.pwd);
	   
	        var data = {
	            pseudo:req.body.pseudo, pwd:passwordHash.generate(req.body.pwd), email:req.body.email,
	            nom:'', prenom:'', genre:'Homme', anneeNaissance:'1920', rue:'', codePostal:'75001', ville:'Paris',
	            pays:'France', presentation:'Coming soon...', photo:false, date:tools.dateDuJour()
	        };    

	        //On attribu une photo par defaut au user
	        var target = home +'/public/jsquiz/img/photosProfils/'+req.body.pseudo+'-thumbnail';
	        if ( !fs.existsSync(target) ) {//console.log("pas de photo definie !");
	            var source = home +'/public/jsquiz/img/photosProfils/nobody-thumbnail';
	            tools.copyFile(source, target, function(){
	                //console.log('Copie photo ok');
	            });
	        } 

	        if ( !validator.valid ){
	            res.render('jsquiz/formulaireSignIn', { estConnecte: false, msg:validator.msg, data:data});    
	        }else{   
	            //on verifie que le pseudo req.body.pseudo est dispo
	            var cursor = collections.find({pseudo:req.body.pseudo}).toArray(function(err, documents){
	                //var nbrDoc = documents.length; console.log('nbrDoc='+nbrDoc); 
	                if ( documents.length > 0 ){
	                    msg =  'Another account already uses the pseudo you entered. Please choose a different one, be original !';
	                    res.render('jsquiz/formulaireSignIn', { estConnecte: false, msg: msg, data:data});
	                }else{

	                    //on verifie que l'email est dispo
	                    var cursor = collections.find({email:req.body.email}).toArray(function(err, documents){
	                        //var nbrDoc = documents.length; console.log('nbrDoc='+nbrDoc); 
	                        if ( documents.length > 0 ){
	                            msg =  'Another account already uses the email you entered !';
	                            res.render('jsquiz/formulaireSignIn', { estConnecte: false, msg: msg, data:data});
	                        }else{

	                            //console.log('pseudo:'+req.body.pseudo);console.log('pwdverif:'+req.body.pwdverif);console.log('pwd:'+req.body.pwd);
	                            if ( req.body.pwdverif != req.body.pwd ){
	                               msg = 'Password and confirmation password not equal after submit !';
	                               res.render('jsquiz/formulaireSignIn', { estConnecte: false, msg:msg, data:data});
	                            }else{ 
	                                
	                                //var document = {pseudo: req.body.pseudo, pwd: req.body.pwd, date:tools.dateDuJour()};
	                                //console.log('document='+document);
	                                collections.insertOne(data, function(err, documents){
	                                    if ( err ){
	                                        res.render('jsquiz/erreurConnexion', {});
	                                    }else{
	                                        //console.log("Inserted 1 documents into the users collection.");

	                                        //On connecte le nouveau membre 
	                                        req.session.estConnecte = true;
	                                        req.session.pseudo = req.body.pseudo;
	                                      
	                                        //On propose au membre de completer son profil  
	                                        //console.log('data:'+data);
	                                        res.render('jsquiz/formulaireInfoComplementaires', { 
	                                            estConnecte: req.session.estConnecte, 
	                                            pseudo: data.pseudo,
	                                            profilOwner: data.pseudo,
	                                            msg:{type:'info', txt:'Hello ' +req.session.pseudo+ '! Vous pouvez completez votre profil.'}, 
	                                            data:data, firstAccess :true,
	                                            ajoutActionPost:''
	                                        });    
	                                        
	                                    }
	                                });
	                            }
	                        }
	                    });
	                }      
	            });  
	        }
		}
	});

	//Permet de verifer que le fichier image uploadé est conforme (prend l'objet req.file issu du post en argument)
	var imgUploadValidator = function(file){
	    var typeMime = ['image/jpeg','image/gif','image/png'];
	    //console.log(file); //form files
	    if ( typeMime.indexOf(file.mimetype) < 0 ) {
	        return {valid:false, msg: file.originalname + ' : Type de fichier non autorisé'};
	    }else{
	        if ( file.size > 2097152 ){
	          return {valid:false, msg:'Fichier image trop volumineux (> 2 Mo)'};  
	        }else{
	            return {valid:true, msg:'File is ok)'}
	        }
	    }
	}


	// for ( var prop in data) {
	//     console.log(prop + ':' + data[prop])
	//     if ( data[prop] === '' ){
	//         data[prop]= 'non fournie';
	//     }     
	// }

	//https://www.npmjs.com/package/multer
	//Mise à jour (en base) des infos de profil d'un utilisateur 
	app.post(['/infoComplementaires','*/infoComplementairesAdmin'], multer({ dest: './uploads/'}).single('upl'), function(req, res){ 

	    ifIsConnected(req,res,'',function(){
	        //console.log('post infoComplementaires -------------------------------');
	        //console.log(req.body); //form fields
	        //console.log(req.file);

	        if ( req.session.pseudo === 'jsquiz' && req.path.indexOf("Admin") > 0 ){//cas modif profil d'un autre membre par l'administrateur
	           //seul l'admin peut modifier le profil d'un autre membre 
	            var modifMyProfil = false;
	            var profilOwner = req.body.pseudo;
	        }else{
	            var profilOwner = req.session.pseudo;
	            var modifMyProfil = true;
	        }

	        //console.log('--- profilOwner=',profilOwner);  

	        if (!req.body) { 
	            console.log("probleme au post");
	            return res.sendStatus(400);
	        }else{

	            //On verifie que l'image est ok
	            var retourUpload =  {valid:true, msg:''} //si pas d'image valid=true car pas d'image donc pas de probleme...
	            //console.log('req.file='+req.file);
	            if (req.file){//si un fichier image a été proposé au post
	                var retourUpload = imgUploadValidator(req.file);
	            }

	            //Objet à ecrire en base
	            var data = {
	                nom:req.body.nom, prenom:req.body.prenom,genre:req.body.genre,
	                anneeNaissance:req.body.anneeNaissance, rue:req.body.rue, 
	                codePostal:req.body.codePostal, ville:req.body.ville, pays:req.body.pays,
	                presentation:req.body.presentation, niveauJS:req.body.niveauJS ,photo:retourUpload.valid 
	            };


	            var collections = db.get().collection('users');
	            var cursor = collections.find({'pseudo': profilOwner }).toArray(function(err, documents){
	                if ( documents.length === 1){
	                    var id = documents[0]._id;
	                    //console.log('_id='+id);    
	                    collections.update({ _id: id }, { $set: data }, function(error, result) {
	                        if ( error ){ 
	                            console.log("probleme au update");
	                            return res.sendStatus(400);
	                        }else{
	                            console.log("Update a document into the users collection.");
	                        }
	                    }); 
	                  
	                    if ( !retourUpload.valid ){
	                        //console.log(retourUpload.msg);

	                        if ( modifMyProfil ){
	                            var ajoutActionPost = '';
	                        }else{
	                            var ajoutActionPost = 'Admin';
	                        }

	                        res.render('jsquiz/formulaireInfoComplementaires', { 
	                            estConnecte: req.session.estConnecte,
	                            pseudo: req.session.pseudo,
	                            profilOwner: profilOwner,
	                            msg:{type:'danger', txt:retourUpload.msg},
	                            data:data,
	                            ajoutActionPost: ajoutActionPost
	                        }); 
	                    }else{
	                        
	                        if (req.file){//si un fichier image a été proposé au post
	                            var tmp_path = req.file.destination + req.file.filename;
	                            // set where the file should actually exists - in this case it is in the "images" directory
	                            var target_path = './public/jsquiz/img/photosProfils/' + profilOwner;
	                            // move the file from the temporary location to the intended location
	                            //console.log('tmp_path='+tmp_path);
	                            //console.log('target_path='+target_path);
	                            fs.rename(tmp_path, target_path, function(err) {
	                                if (err) throw err;
	                                // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
	                                fs.unlink(tmp_path, function(){
	                                    if (err) {
	                                       throw err;
	                                    }else{

	                                        //Voir doc https://www.npmjs.com/package/easyimage 
	                                        easyimg.info(target_path).then(
	                                              function(file) {
	                                                //console.log(file);
	                                                var max = Math.max(file.width,file.height);

	                                                var ratio = file.width/file.height;
	                                                if ( ratio > 1 ){
	                                                    var h = 200;
	                                                    var w = 200*ratio;
	                                                }else{
	                                                    var w = 200;
	                                                    var h = 200*ratio;
	                                                }

	                                                easyimg.rescrop({
	                                                    src: target_path , dst:target_path + '-thumbnail',
	                                                    width:w, height:h,
	                                                    cropwidth:200, cropheight:200,
	                                                    fill:true
	                                                    // x:parseInt((w-200)*0.5), y:parseInt((h-200)*0.5)
	                                                }).then(
	                                                    function(image) {
	                                                        console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
	                                                    },
	                                                    function (err) {
	                                                        console.log(err);
	                                                    }
	                                                );                                           
	                                              
	                                              }, function (err) {
	                                                console.log(err);
	                                              }
	                                        );
	                                    }
	                                   
	                                });
	                            });

	                        }else{
	                            //si pas de photo definie on attribu une photo par defaut au user
	                            var target = home +'/public/jsquiz/img/photosProfils/'+profilOwner+'-thumbnail';
	                            if ( !fs.existsSync(target) ) {
	                                
	                                //console.log("pas de photo definie !");
	                                var source = home +'/public/jsquiz/img/photosProfils/nobody-thumbnail';
	                                
	                                //fs.createReadStream(file).pipe(fs.createWriteStream(cible));
	                                tools.copyFile(source, target, function(){
	                                    //console.log('Copie photo ok');
	                                });
	                            }                        
	                        }
	                        var msg = 'Informations de profil modifiées';
	                        res.redirect('/profil/'+profilOwner);
	                        //res.render('profil/'+profilOwner, {estConnecte: req.session.estConnecte, pseudo: req.session.pseudo, msg:msg } );//index .jade
	                    } 

	                }else{
	                    console.log('error 547');
	                }
	            }); 
	        }
	    });
	});


	//Au post du formulaire de connexion ( formulaireConnexion.jade action='connexion' )
	app.post('/connexion',function(req, res){ 
		 if (!req.body) { 
			console.log("probleme au post");
			return res.sendStatus(400);
		 }else{
	        //req.session.test = 12;
	        //console.log( db);
			var collections = db.get().collection('users');

	        var query = {pseudo: req.body.pseudo };
	        var cursor = collections.find(query).toArray(function(err, documents){

	            if (documents.length === 1){//si le pseudo existe

	                var data = documents[0];

	                //On compare avec le mot de passe principal
	                var passwordOK =  passwordHash.verify(req.body.pwd, data.pwd);

	                //On compare aussi avec le mot de passe provisoire
	                var passwordRecoveryOK = false;
	                if ( typeof data.pwdRecovery != 'undefined' && typeof data.timestampPwd != 'undefined'){
	                    //console.log('data.pwdRecovery exite et vaut :'+ data.pwdRecovery); //console.log('typeof data.pwdRecovery = ' + typeof data.pwdRecovery); //console.log('req.body.pwd = ' + req.body.pwd);           
	                    if (  tools.timestamp() - parseInt(data.timestampPwd) < 300){//pwdRecovery pas encore périmé
	                        var passwordRecoveryOK = passwordHash.verify(req.body.pwd, data.pwdRecovery);      
	                    }else{
	                        console.log('Le mot de passe provisoire est périmé.'); 
	                    }
	                    // console.log('tools.timestamp() :' + tools.timestamp());// console.log('data.timestampPwd :' + data.timestampPwd);// console.log('Wrong password !'); 
	                }

	                if ( passwordOK || passwordRecoveryOK ){//si l'un des 2 passwords est correct
	                    //bon pseudo / mot de passe
	                    req.session.estConnecte = true;
	                    req.session.pseudo = req.body.pseudo;

	                    var msg = 'Bonjour ' +req.body.pseudo  + ' ! Vous êtes connecté.'
	                    if ( passwordRecoveryOK ){
	                        msg = msg + 'Vous utilisez un mot de passe provisoire, changer le avant qu\'il ne soit perimé';
	                    }
	                    
	                    tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis', function(amis){
	                        //console.log('amis===',amis);
	                        res.redirect('/'); 
	                        //res.render('index', {estConnecte: req.session.estConnecte, amis:amis, pseudo: req.session.pseudo, msg:msg } );   
	                    });
	                }else{
	                    var msg = 'Wrong password !';
	                    res.render('jsquiz/formulaireConnexion', { estConnecte: req.session.estConnecte, msg:msg});
	                }                 
	            }else{
	              var msg = 'That account doesn\'t exist!';
	              res.render('jsquiz/formulaireConnexion', { estConnecte: req.session.estConnecte, msg:msg});
	            }
	        });
		 }
	});	

	app.get('/deconnexion', function (req,res) {
	   //io.sockets.emit('updatePublicChat', 'SERVER', req.session.pseudo + ' has disconnected');  
	   delete connectedMembers[req.session.pseudo];
	   delete currentsChatsIds[req.session.pseudo];
	   req.session.estConnecte = false;    
	   req.session.pseudo = '';
	   res.redirect('/'); 
	});


	app.post(['/creerDiscussion','/creerDiscussion/*'],function(req, res){
	     if (!req.body) { 
	        console.log("probleme au post");
	        return res.sendStatus(400);
	     }else{
	        ifIsConnected(req,res,'',function(){    
	            var collections = db.get().collection('discussions');
	            //console.log('req.body',req.body);
	            //console.log('guests=',req.body.guests.split(';'));
	            var guests = req.body.guests.split(';');//.map(x=>x.trim());
	            //console.log(guests);
	            for(var i=0;i<guests.length;i++){
	                guests[i] = guests[i].trim();
	            }

	            tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis',function(amis){   
	                
	                //Je recupere au passage la liste des tous les users (util dans la cas administrateur)
	                tools.getUsersPseudoArray(db,{}, function(allUsersTab){            
	                
	                    if ( guests.indexOf("Tous mes amis") >= 0){
	                        guests = tools.getConfirmedFriends(amis);
	                        //console.log('guests==',guests);
	                    }else if ( guests.indexOf("Tous les membres") >= 0){
	                        if ( req.session.pseudo === 'jsquiz' ){//l'admin peut ouvrir une discussion avec tous le monde
	                            guests = ["Tous les membres"];//allUsersTab;
	                        }else{
	                            guests = [];
	                        }
	                    }else{    
	                        //J'enleve les pseudo vides ou qui ne correspondent pas à des amis confirmés
	                        for(var i=0;i<guests.length;i++){
	                            if ( tools.getFriendStatut(amis, guests[i]) != 'confirmed' || guests[i] === '' ){
	                                guests.splice(i,1);
	                            }
	                        } 
	                    }
	                   
	                    //objet qui va indiquer le nombre de msg lu pour chaque user en temps reel
	                    var nbrMsgLusParUser = {};
	                    for(var i=0;i<guests.length;i++){
	                        nbrMsgLusParUser[guests[i]] = 0;
	                    }
	                    nbrMsgLusParUser[req.session.pseudo] = 0;//ajout du createur de la discussion

	                    var data = { 
	                        titre: req.body.titre, 
	                        date:new Date(),
	                        createur:req.session.pseudo,
	                        nbrMsgLusParUser:nbrMsgLusParUser,
	                        guests:guests,
	                        messages:[]
	                    };
	                    //console.log('guests=',guests);

	                    collections.insertOne( data , function(err, document){
	                        if ( err ){
	                            return res.sendStatus(400);
	                        }else{
	                            //console.log('document.ops[0]._id=',document.ops[0]._id);
	                            res.redirect('/discussion/'+document.ops[0]._id);//permet de changer l'url à la difference de res.render 
	                        }
	                    });
	                });
	            });
	        });
	    }
	 });                  

	app.get('/creerQuiz', function (req,res){
	    ifIsConnected(req,res,'',function(){    
	        res.render('jsquiz/creerQuiz',{
	            estConnecte: req.session.estConnecte,
	            pseudo: req.session.pseudo
	        }); 
	    });
	});

	app.post('/creerQuiz',function(req, res){
	     if (!req.body) { 
	        console.log("probleme au post");
	        return res.sendStatus(400);
	     }else{
	        ifIsConnected(req,res,'',function(){    
	            var quiz = db.get().collection('quiz');
	            //console.log('req.body',req.body);
	            var titre = (req.body.titre).trim();
	            if ( titre != '' ){
	                //quiz.find({titre:req.body.titre}).toArray(function(err, documents){
	                    //console.log('documents:::',documents.length);
	                    //if ( documents.length === 0 ){//Le titre n'existe pas
	                        var id = new mongo.ObjectId();
	                        //console.log('id',id);
	                        
	                        //var i = 1;
	                        var nbQuestion = 0;
	                        for(var i=1;i<100;i++){//100 questions autorisées au maximum 
	                        //while ( typeof req.body['question-'+i] != 'undefined'){
	                            if ( typeof req.body['question-'+i] != 'undefined' ){

	                                nbQuestion++;
	                                var question = req.body['question-'+i]

	                                var reponses = [];
	                                //console.log('question:'+question);

	                                var cochee =  parseInt(req.body['radio-'+i]);
	                                //console.log('cochee:'+cochee);
	                                
	                                var explication = req.body['explication-'+i];
	                                
	                                var nbReponse = 0;
	                                for (var j=1;j<10;j++){//10 reponses max par question
	                                    var resp = req.body['reponse-'+i+'-'+j];
	                                    if( typeof resp === "string" ){     
	                                       reponses.push({ txt:resp, val:(cochee===j)});
	                                       nbReponse++;     
	                                   }
	                                }

	                                if ( question.trim().length > 0 ){
	                                    var data = { 
	                                        id: id,
	                                        titre: req.body.titre, 
	                                        date: new Date(),
	                                        createur: req.session.pseudo,
	                                        lastModifiedBy: req.session.pseudo,
	                                        visiblePar: req.body.visiblePar,
	                                        modifiablePar: req.body.modifiablePar,
	                                        niveauJS: req.body.niveauJS,
	                                        presentation: req.body.presentation,
	                                        question: question,
	                                        reponses: reponses,
	                                        explication: explication,
	                                        results: []
	                                    }; 
	                                    //console.log('data=',data);

	                                    quiz.insertOne(data, function(err, document){
	                                        if ( err ){
	                                            return res.sendStatus(400);
	                                        }
	                                    });
	                                }
	                            }
	                            //i++; 
	                        }
	                        //console.log('document.ops[0].id=',id);
	                        res.redirect('/formulaireQuiz/'+id);//redirect permet de changer l'url à la difference de res.render 
	                     
	                    //}
	                //});
	            }else{

	            }
	        });
	    }
	 });             



	app.get('/editerQuiz/:id',function (req,res) {
	    //console.log('req=',req.path);
	    var id = new mongo.ObjectId(req.params.id);
	    //console.log('id mongo ='+id);
	    var txt = 'Te connecter tu dois pour participer aux quizz';
	    ifIsConnected(req,res,txt,function(){
	        var collections = db.get().collection('quiz');  
	        collections.find({id:id}).toArray(function(err, quiz){
	            if(err){
	               res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	            }else{
	                //console.log("quiz=",quiz); 
	                if ( quiz.length ){
	                    //on va verifier que req.session.pseudo a le droit de modifier ce quiz
	                    var createur = quiz[0].createur;
	                    //console.log('createur=',createur);
	                    tools.getCollectionFieldValue(db,'users',{pseudo:req.session.pseudo},'amis',function(amis){
	            
	                        //console.log('amis:'+amis);
	                        var isAdmin = (req.session.pseudo === 'jsquiz' ) ? true:false;
	                        var isCreateur = (createur === req.session.pseudo || isAdmin ) ? true:false;
	                        var isFriend = (tools.getFriendStatut(amis, createur) === 'confirmed' || isAdmin) ? true:false;

	                        // console.log('isCreateur:'+isCreateur);
	                        // console.log('isFriend:'+isFriend);

	                        // console.log('quiz[0].visiblePar:'+quiz[0].visiblePar);
	                        // console.log('quiz[0].modifiablePar:'+quiz[0].modifiablePar);

	                        var visible = tools.accesQuiz(quiz[0].visiblePar, isCreateur, isFriend);
	                        var modifiable = tools.accesQuiz(quiz[0].modifiablePar, isCreateur, isFriend);
	                        
	                        //console.log('visible:'+visible);
	                        //console.log('modifiable:'+modifiable);

	                        if ( visible && modifiable ){
	                            
	                            //req.session.currentQuizId = id;
	                            //req.session.currentQuestion = 1; 
	                            
	                            res.render('jsquiz/editerQuiz', { 
	                                estConnecte: req.session.estConnecte,
	                                pseudo: req.session.pseudo,
	                                quiz: quiz,
	                                idQuiz : id,
	                                modifiable:modifiable,
	                                moment: moment              
	                            });
	                        }else{
	                            res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz est en accès limité'});
	                        }
	                    });

	                }else{
	                    res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Ce quiz n\'existe pas...'});
	                }
	            }
	        });
	    });
	});



	app.post('*/modifierQuiz/:id',function(req, res){
	    //console.log("modifierQuiz");
	    if (!req.body) { 
	        console.log("probleme au post");
	        return res.sendStatus(400);
	    }else{
	        ifIsConnected(req,res,'',function(){    
	            var id = new mongo.ObjectId(req.params.id);
	            //console.log('id quiz='+id);
	            var quiz = db.get().collection('quiz');

	            //console.log('req.body',req.body);
	            var titre = (req.body.titre).trim();
	            if ( titre ){
	                quiz.find({id:id}).toArray(function(err, documents){
	                
	                    var createur = documents[0].createur;        
	                    //console.log('documents:',documents.length);
	                    //if ( documents.length > 0 ){

	                    //Je supprime le quiz
	                    quiz.remove({id:id}, function(error, result) {
	                        if ( error ){ 
	                            console.log("probleme pour effacer le quiz "+ id);
	                        }                  
	                    });

	                    //puis je recreer le quiz avec les nouvelles valeurs (en gardant le meme id)
	                    var nbQuestion = 0;
	                    for(var i=1;i<100;i++){//100 questions autorisées au maximum 
	                   
	                        if ( typeof req.body['question-'+i] != 'undefined' ){

	                            nbQuestion++;
	                            var question = req.body['question-'+i];

	                            var reponses = [];
	                            //console.log('question:'+question);

	                            var cochee =  parseInt(req.body['radio-'+i]);
	                            //console.log('cochee:'+cochee);
	                            
	                            var nbReponse = 0;
	                            for (var j=1;j<10;j++){//10 reponses max par question
	                                var resp = req.body['reponse-'+i+'-'+j];

	                                if( typeof resp === "string" ){     
	                                   reponses.push({ txt:resp, val:(cochee===j)});
	                                   nbReponse++;     
	                               }
	                            }
	                            
	                            var explication = req.body['explication-'+i];

	                            if ( question.trim().length > 0 ){
	                                var data = { 
	                                    id: id,
	                                    titre: titre, 
	                                    date: new Date(),
	                                    createur: createur,
	                                    lastModifiedBy:req.session.pseudo,
	                                    visiblePar: req.body.visiblePar,
	                                    modifiablePar: req.body.modifiablePar,
	                                    niveauJS: req.body.niveauJS,
	                                    presentation: req.body.presentation,
	                                    question: question,
	                                    explication:explication,
	                                    reponses: reponses,
	                                    results: []
	                                }; 
	                                //console.log('data=',data);
	                                quiz.insertOne(data, function(err, document){
	                                    if ( err ){
	                                        return res.sendStatus(400);
	                                    }
	                                });
	                            }
	                        }
	                        
	                    }
	                    //console.log('id=',id);
	                    res.redirect('/formulaireQuiz/'+id);//redirect permet de changer l'url à la difference de res.render 

	                });

	            }else{
	                console.log('titre non valide !');
	            }
	        });
	    }
	 });       


	// app.get('/404', function (req,res,next) {
	//   //next();// L'appel à next() indique qu'on souhaite continuer la chaîne des middlewares
	//   // Si on interrompt ici cette chaîne, sans avoir renvoyé de réponse au client, il n'y aura
	//   // pas d'autres traitements, et le client verra simplement une page mouliner dans le vide...
	// });

	//Gestion des erreurs 
	//Dans le code suivant, situé après toutes les autres routes, nous créons une erreur 
	//dans le cas d'une url non présente puis nous ajoutons l'en-tête 404 avant de faire le rendu de la page 404 créée par ailleurs.
	app.use(function (req, res, next) {
		//res.status(404);

		//réponse avec une page html
		if (req.accepts('html')){
	        res.render('jsquiz/404',{estConnecte: req.session.estConnecte, pseudo:req.session.pseudo, txt : 'Te conduire vers cette page je ne puis...'});        
			return;
		}

		//réponse avec du json
		if (req.accepts('json')){
			res.send({error: 'Fichier absent'});
			return;
		} 
		
		//réponse avec du js
		if (req.accepts('js')){
			res.send({error: 'Fichier absent'});
			return;
		} 
		//réponse avec un fichier texte
		res.type('txt').send('Pas de réponse');
	     
	});

	db.connect(url_JsQuiz, function(err){
	    if (err) {
	        console.log('Impossible de se connecter à la base de données JsQuiz.');
	        process.exit(1);
	    }

	});


	//socket.emit(type de l'évenement, data1, data2) : envoie juste au client connecté un événement (une chaine) et deux paramètres pouvant contenir des données

	//io.sockets.emit(type de l'évenement, data1, data2) : envoie à tous les clients connectés un événement (une chaine) et deux paramètres pouvant contenir des données

	//socket.broadcast.emit(type de l'évenement, data1, data2) : envoie à tous les clients connectés sauf au client courant (l'emetteur) un événement (une chaine) et deux paramètres 

	//socket.join('room 1') : pour rejoinre la room "room 1"    (à faire coté serveur)

	//socket.join('room 1') : pour quiter la room "room 1" (à faire coté serveur)

	//io.to('room 1').emit('an event name',{ room:'room 1', msg:'coucou' }) : envoyer un message vers la room "room 1" (sauf au client courant (l'emetteur)) 
	// io.in <==> io.to 

	//socket.broadcast.to('room1').emit('an event name', 'data1', 'data2') : envoyer un message vers la room "room 1" à tous les participants


	// Chargement de socket.io (connexion "temps réel" pour ouvrir un tunnel via les WebSockets grâce à socket.io)
	//var io = require('socket.io').listen(httpServer);


	//Car Math.sign n'existe que sous firefox
	var sign = function(x) {
		if ( x >= 0 ){ return 1; }else{ return -1;}
	};


	//Renvoi 1 si on lui fournie 0 et 0 si on lui fournie 1
	//Permet donc de determiner dans tous les cas l'indice de l'advesraise (il y a un joueur 0 et un joueur 1)
	var opponentOf = function(k){
	    return Math.abs(k-1);
	}

	var recallDelay = 20;// en ms

	var step = 2;

	var emitCountPosts = function(socket, db){
	    var collection = db.get().collection('posts');
	    var cursor = collection.find({}).toArray(function(err, documents){
	       //console.log('post:::'+documents.length);
	       socket.emit('countPosts',documents.length);
	    });      
	}

	var emitCountQuiz = function(socket, db){
	    var quiz = db.get().collection('quiz');
	    quiz.distinct('id', function(err, docs) {
	       //console.log('nbr Quiz=',docs.length);
	       socket.emit('countQuiz',docs.length);
	    });    
	     
	}

	var countVisitors = 0;

	//objet qui va contenir la liste des membres connectés sur le site
	var connectedMembers = {};

	//On garde coté serveur un objet qui contient le contenu des chats en cours pour chaque user 
	var currentsChatsIds = {};


	//Listen to socket connections and get the socket as provided by socket.io, together with either the session or an error
	//on se prépare à recevoir des requêtes du client via socket.io.  
	io.on('connection', function (socket){

	    //updateCountConnexions(socket, 1);
	   
	    //Mise à jour objet connectedMembers si un membre se connecte
	    if ( socket.handshake.session.pseudo ){//si membre connecté
	        connectedMembers[socket.handshake.session.pseudo] = { pseudo:socket.handshake.session.pseudo, sid:socket.id };
	    }    
	    
	    socket.on('askMajCounts', function(){
	        //Envoi le nombre de post total vers le client
	        emitCountPosts(socket, db);
	        //Meme chose pour les quiz
	        emitCountQuiz(socket, db);
	    }); 
	    

	    //console.log("connection de :", socket.handshake.session.pseudo);

	    //socket.emit('session', "Session id: " + socket.handshake.session.uid); 
	    //console.log('socket.handshake.session.uid='+ socket.handshake.session.uid);
	    //console.log('socket.handshake.session.test='+ socket.handshake.session.test);
	    //console.log('Un visiteur est arrivé sur le site !' + '( socket.id='+ socket.id + ')');// Quand un client se connecte, on le note dans la console
	    
	    //si un utilisateur se deconnecte     
	    socket.on('disconnect', function(){ 
	       if ( socket.handshake.session.pseudo ){//si membre connecté
	           //deconnexion(socket.pseudo, socket.room);
	           //console.log('deconnexion: ' + '( socket.id='+ socket.id + ')');
	           //updateCountConnexions(socket, -1);
	           //console.log("déconnection de :", socket.handshake.session.pseudo);
	           delete connectedMembers[socket.handshake.session.pseudo];
	           io.sockets.emit('connectedMembers', connectedMembers );
	       }
	    });

	    //Envoi à tous les clients la liste des membres connectés 
	    setTimeout(function(){
	        io.sockets.emit('connectedMembers', connectedMembers );
	    },1000);  
	    //console.log("connectedMembers=",connectedMembers);
	    
	    //si un membre recherche un autre membre
	    socket.on('rechercherMembre', function(chaine){   
	      
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	           //console.log('rechercher: ' + '( socket.id='+ socket.id + ')');
	           //console.log("chaine :", chaine);
	           //console.log("rechercher de :", socket.handshake.session.pseudo);      
	           rechercher(db,'membre',chaine, function(result){
	                //console.log('result(1)=',result);
	                socket.emit('searchResultMembre', result, socket.handshake.session.pseudo); 
	           });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });    

	    //si un membre recherche un quiz 
	    socket.on('rechercherQuiz', function(chaine){   
	        //if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	           // console.log('rechercher: ' + '( socket.id='+ socket.id + ')');
	           // console.log("chaine :", chaine);
	           // console.log("rechercher de :", socket.handshake.session.pseudo);      
	           rechercher(db,'quiz' ,chaine, function(result){
	                //console.log('result=',result);
	                socket.emit('searchResultQuiz', result); 
	           });
	        //}else{
	        //    console.log('tentative d\'acces non autorisée!')
	        //}
	    });    

	    //si un utilisateur fait une recherche de discussion
	    socket.on('rechercherDiscussion', function(chaine){   
	        var pseudo = socket.handshake.session.pseudo;
	        if ( pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            //console.log('rechercher: ' + '( socket.id='+ socket.id + ')');
	            //console.log("chaine :", chaine);
	            //console.log("rechercher faite par :", pseudo);      
	            rechercher(db, 'discussion' ,chaine, function(result){
	                //console.log('result=',result);
	                socket.emit('searchResultDiscussion', pseudo, result.discussions); 
	           });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });    


	    //le client demande si il y a des msg non lus pour lui
	    socket.on('get-messages-non-lus', function(query){  
	        //console.log("get-messages-non-lus");
	        //console.log("query:",query);
	        if ( typeof query._id != "undefined" ){
	            var _id = new mongo.ObjectId(query._id);
	            query = { _id:_id };
	        }

	        var pseudo = socket.handshake.session.pseudo;
	        if ( pseudo ){
	            var nbrMsgNonLus = 0;
	            var collections = db.get().collection('discussions');
	            collections.find(query).toArray(function(err, discussions){
	                var N = discussions.length;
	                //console.log('N=',N);   
	                for(var i=0;i<N;i++){//pour chaque discussions
	                    //on regarde si pseudo est dans la discussion i
	                    if ( typeof discussions[i].nbrMsgLusParUser[pseudo] != 'undefined' ){
	                        var nbrMsg = discussions[i].messages.length;
	                        nbrMsgNonLus = nbrMsgNonLus + ( nbrMsg - discussions[i].nbrMsgLusParUser[pseudo]);
	                        //if ( nbrMsgNonLus < 0 ){ nbrMsgNonLus = 0; }
	                    }
	                }
	                //console.log("nbrMsgNonLus=",nbrMsgNonLus);
	                if ( nbrMsgNonLus ){
	                    socket.emit('nbrMsgNonLus',nbrMsgNonLus,query); 
	                }
	            });
	        }
	    });

	    //si un utilisateur demande à ajouter un nouveu post sur un profil
	    socket.on('ajout-post', function(text){   
	        console.log('text:',text);
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('ajout-post: ' + '( socket.id='+ socket.id + ')');
	            // console.log("text :"+text);
	            
	            var  author = socket.handshake.session.pseudo;
	            var  profilOwner = socket.handshake.session.profilOwner;
	            console.log("ajout post par "+ author);  
	            console.log("sur le profil de "+ profilOwner);

	            //Verifier que author est dans la liste d'ami de owner...
	            tools.getCollectionFieldValue(db,'users',{pseudo:profilOwner},'amis',function(amis){   
	                var statut = tools.getFriendStatut(amis, author);
	                //si je suis sur mon profil ou celui d'un ami confirmé
	                if ( statut === 'confirmed' || author === profilOwner || author === 'jsquiz' ){  
	                    //console.log('Autorisé');

	                    tools.getCollectionDocument(db,'users',{pseudo:author},function(doc){   
	                        //var text2 = text.replace(/\n/g, '<br>'); 
	                        
	                        //objet à enregistrer en base 
	                        var data = {
	                            author:{ pseudo:author, prenom:doc.prenom, nom:doc.nom , email:doc.email }, 
	                            profilOwner:profilOwner,
	                            text:text,
	                            commentaires:[],
	                            date:tools.dateDuJour()
	                        };
	                                            
	                        var collections = db.get().collection('posts');
	                        collections.insertOne( data , function(err, documents){
	                            if ( err ){
	                                res.render('jsquiz/erreurConnexion', {});
	                            }else{  

	                                //Objet à envoyer au client
	                                //On fait une copie de data (et on remplace les sauts de ligne par des balises <br>)
	                                var data2 =  JSON.parse(JSON.stringify(data));//marche si il n'y a pas de function dans l'objet à copier 
	                                data2.text = data2.text.replace(/\n/g, '<br>');                               
	                                //console.log("Inserted 1 documents into the posts collection.");                                
	                                socket.emit('add-post-success', data2); 
	                                
	                                //Si l'auteur ecrit sur le mur d'un ami j'envois un mail à cet ami pour le prevenir 
	                                if ( author != profilOwner ){
	                                    //Envoi d'un mail au proprietaire du profil
	                                    var subject =  author + ' a ecrit sur ton mur JsQuiz';
	                                    var html = '<b>' + author + '</b> a ajouté un post sur ton mur<br>'
	                                    + 'Pour le lire, connecte-toi au site www.felixdebon.fr' 
	                                    tools.getCollectionFieldValue(db,'users',{pseudo:profilOwner},'email',function(email){
	                                        tools.envoyerMail(email, subject, html,              
	                                            function(){ console.log('Message sent'); },
	                                            function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                                        ); 
	                                    });
	                                }             
	                            }
	                        });
	                    });
	                }
	            });            

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });    

	    //si un utilisateur clic sur le bouton de suppression d'un post
	    socket.on('delete-post', function(id){ 
	        var _id = new mongo.ObjectId(id);
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            //console.log('id post='+id);
	                      
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut effacer le post
	            var  profilOwner = socket.handshake.session.profilOwner;//le proprietaire du profil
	            
	            //on determine l'auteur du post _id que effaceur veut effacer
	            tools.getCollectionDocument(db,'posts',{_id:_id},function(post){  
	                if ( post ){
	                    if ( post.author.pseudo === effaceur || effaceur === profilOwner || effaceur === 'jsquiz' ){
	                        //on efface le post
	                        //console.log('on efface le post');
	                        var collections = db.get().collection('posts');
	                        collections.remove({_id:_id}, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme pour supprimmer le post");
	                                return res.sendStatus(400);
	                            }else{
	                                //console.log("Post supprimé.");
	                                socket.emit('delete-post-success',id); 
	                            }                       
	                        });                        

	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    }); 

	    //si un utilisateur demande à ajouter un commentaire sur un post 
	    socket.on('ajout-commentaire', function(data){   
	        //data.postId;//data.text;
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            console.log('ajout-post: ' + '( socket.id='+ socket.id + ')');
	            console.log("data:",data);
	            
	            var  author = socket.handshake.session.pseudo;
	            var  profilOwner = socket.handshake.session.profilOwner;//owner du profil
	            console.log("ajout commentaire par "+ author);
	            console.log("sur le post "+ data.postId);
	           
	            //Verifier que author est dans la liste d'ami de owner...
	            tools.getCollectionFieldValue(db,'users',{pseudo:profilOwner},'amis',function(amis){   
	                var statut = tools.getFriendStatut(amis, author);
	                //si je suis mon profil ou celui d'un ami confirmé
	                if ( statut === 'confirmed' || author === profilOwner || author === 'jsquiz'){    
	                    console.log('Autorisé');
	                    //Pour chopper les nom et prenom de l'auteur du commentaire    
	                    tools.getCollectionDocument(db,'users',{pseudo:author},function(user){
	                        //Pour recuperer le tableau des commentaires du post data.postId
	                        //console.log('data.postId='+data.postId);
	                        var _id = new mongo.ObjectId(data.postId);
	                        tools.getCollectionDocument(db,'posts',{_id:_id},function(post){

	                            var _id2 = new mongo.ObjectId();//on genere un _id pour le commentaire
	                            var commentaires = post.commentaires;
	                            //console.log('commentaires=',commentaires);
	                            var newCommentaire = {
	                                id:_id2,
	                                postId:data.postId,
	                                author:{ pseudo:author, prenom:user.prenom, nom:user.nom, email:user.email }, 
	                                text:data.text,//contenu du commentaire
	                                date:tools.dateDuJour()
	                            };
	                            commentaires.push(newCommentaire);

	                            var collections = db.get().collection('posts');
	                            collections.update({_id:_id}, { $set: { commentaires: commentaires } }, function(error, result) {
	                                if ( error ){ 
	                                    console.log("probleme au update");
	                                    return res.sendStatus(400);
	                                }else{
	                                    //console.log("Ajout commentaires fait.");
	                                    
	                                    socket.emit('ajout-commentaire-success',newCommentaire); 

	                                    //Envoi d'un mail au proprietaire du profil + à l'auteur du post + aux auteurs des commentaires
	                                    var cibles = [profilOwner];
	                                    if ( profilOwner != post.author.pseudo ){
	                                        cibles.push(post.author.pseudo);
	                                    }
	                                    for(var k=0;k<commentaires.length;k++){
	                                        if ( cibles.indexOf(commentaires[k].author.pseudo) < 0){
	                                            cibles.push(commentaires[k].author.pseudo);
	                                        }
	                                    }

	                                    for (var i=0;i<cibles.length;i++){
	                                        if ( cibles[i] != author ){
	                                            //console.log('cibles[i]='+cibles[i]);
	                                            if ( cibles[i] === profilOwner ){
	                                                var subject = 'Un nouveau commentaire sur ton mur !';
	                                                var html = 'Il y a eu un nouveau commentaire sur ton mur.<br>'
	                                                + '<a href="www.felixdebon.fr/profil/'+profilOwner+'" target="_blank">Voir le commentaire</a>';
	                                            }else{
	                                                var subject = 'Un nouveau commentaire sur un post auquel tu participes !';
	                                                var html = 'Il y a eu un nouveau commentaire à un post auquel tu participes sur le mur de '+ profilOwner +'.<br>'
	                                                + 'Pour le lire, connecte-toi au site www.felixdebon.fr/jsquiz' 
	                                            }

	                                            tools.getCollectionFieldValue(db,'users',{pseudo:cibles[i]},'email',function(email){
	                                                tools.envoyerMail(email, subject, html,              
	                                                    function(){ console.log('Message sent'); },
	                                                    function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                                                ); 
	                                            });
	                                        }
	                                    }                                  
	                                }                       
	                            }); 
	                        });                        
	                    });
	                }
	            });            
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });    

	    //si un utilisateur clic sur le bouton de suppression d'un commentaire
	    socket.on('delete-commentaire', function(data){ 
	        
	        var _idPost = new mongo.ObjectId(data.idParent);
	        var idComment = data.idComment;

	        //console.log('_idPost:'+_idPost);
	        //console.log('idComment:'+idComment);

	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            //console.log('id post='+_idPost);
	                      
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut effacer le commentaire
	            var  profilOwner = socket.handshake.session.profilOwner;//le proprietaire du profil

	            var author = '';
	            tools.getCollectionDocument(db,'posts',{_id:_idPost},function(post){  
	                if ( post ){
	                    var commentaires = post.commentaires;
	                    //console.log('commentaires:',commentaires);
	                    for (var i=0;i<commentaires.length;i++){
	                        //console.log('commentaires.id='+commentaires[i].id);
	                        if ( commentaires[i].id == idComment){
	                            
	                            author = commentaires[i].author.pseudo; 
	                            commentaires.splice(i,1);
	                            //console.log('splice !'); 
	                        }
	                    }
	                    // console.log('effaceur:'+effaceur);
	                    // console.log('profilOwner:'+profilOwner);
	                    // console.log('author:'+author); 
	                    if ( author === effaceur || effaceur === profilOwner || effaceur === 'jsquiz'){
	                        //on efface le commentaire
	                        //console.log('on efface le commentaire');
	                      
	                        var collections = db.get().collection('posts');
	                        collections.update({_id:_idPost}, { $set: { commentaires: commentaires } }, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme au update");
	                                return res.sendStatus(400);
	                            }else{
	                                //console.log("Commentaires supprimé.");
	                                socket.emit('delete-commentaire-success',idComment); 
	                            }                       
	                        });                       

	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    }); 

	    //var query = {pseudo:'Linux'};
	    // tools.getCollectionFieldValue(db,'users',{pseudo:'Linux'},'email',function(value){
	    //     var email = value;  
	    //     console.log('email======'+ email);   
	    // });
	    
	    //si un utilisateur demande à ajouter un nouveu message à la discussion id
	    socket.on('ajout-message-discussion', function(id, text){   
	        // console.log('text:',text);
	        // console.log('idDiscussion:',id);
	        
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('ajout-message-discussion');
	            // console.log("text :"+text);
	            
	            var  auteur = socket.handshake.session.pseudo;
	            
	            //console.log("ajout msg par "+ auteur); 

	            var _id = new mongo.ObjectId(id);
	            tools.getCollectionDocument(db,'discussions',{_id:_id},function(discussion){

	                var _id2 = new mongo.ObjectId();//on genere un id pour le nouveau msg 
	                var messages = discussion.messages;
	                var newMsg = {
	                    _id: _id2,
	                    auteur: auteur, //{ pseudo:auteur, prenom:user.prenom, nom:user.nom }, 
	                    date:new Date(),
	                    txt:text//contenu du msg
	                };

	                messages.push(newMsg);

	                //l'auteur a creer un message donc il l'a lu
	                var nbrMsgLusParUser = discussion.nbrMsgLusParUser;

	                //var nbrMsgLusParUser =  JSON.parse(JSON.stringify(discussion.nbrMsgLusParUser));
	                console.log('nbrMsgLusParUser=',nbrMsgLusParUser);
	                console.log('nbrMsgLusParUser[auteur]=',nbrMsgLusParUser[auteur]);

	                nbrMsgLusParUser[auteur]++;// = nbrMsgLusParUser[auteur] + 1; 

	                var collections = db.get().collection('discussions');
	                collections.update({_id:_id}, { $set: { messages: messages, nbrMsgLusParUser:nbrMsgLusParUser } }, function(error, result) {
	                    if ( error ){ 
	                        console.log("probleme au update de la discussion");
	                        return res.sendStatus(400);
	                    }else{
	                        //console.log("Ajout msg effectué.");
	                        //On fait une copie de newMsg (et on remplace les sauts de ligne par des balises <br>)
	                        var newMsg2 =  JSON.parse(JSON.stringify(newMsg));//marche si il n'y a pas de function dans l'objet à copier 
	                        newMsg2.txt = newMsg.txt.replace(/\n/g, '<br>');
	                        //on envoit le message au client pour l'afficher
	                        socket.emit('ajout-msg-success',id,newMsg2); 

	                        //Envoi d'un mail
	                        var subject =  auteur + ' t\'a ecrit sur JsQuiz';

	                        for (var i=0;i<discussion.guests.length;i++){
	                            var html = '<b>' + discussion.guests[i] + '</b>,'  
	                            + ' tu as reçu un message de <b>' + auteur + '</b>.<br>'
	                            + 'Pour le lire, connecte-toi au site www.felixdebon.fr' 
	                            tools.getCollectionFieldValue(db,'users',{pseudo:discussion.guests[i]},'email',function(email){
	                                tools.envoyerMail(email, subject, html,              
	                                    function(){ console.log('Message sent'); },
	                                    function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                                ); 
	                            });
	                        }
	                    }                       
	                }); 
	            }); 

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    }); 

	    //si un utilisateur clic sur le bouton de suppression d'un message d'une discussion
	    socket.on('delete-message', function(ids){ 

	        //console.log('delete-message '+ ids);            
	        var id_discussion = ids.split('-')[0];
	        var id_message    = ids.split('-')[1];

	        var _id_discussion = new mongo.ObjectId(id_discussion);
	        var _id_message    = new mongo.ObjectId(id_message);
	        
	        //console.log('_id_message ='+ _id_message);    
	        
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	                   
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut effacer le message
	            //console.log('effaceur: '+ effaceur);        
	            //on determine l'auteur du message _id_message que effaceur veut effacer
	            tools.getCollectionDocument(db,'discussions',{_id:_id_discussion},function(discussion){  
	                if ( discussion ){
	                    //console.log('discussion existe');        
	                    var nbrMsg = discussion.messages.length
	                    var auteurMsg = null;
	                    //on va chercher l'auteur du message dans l'array messages de l'objet discussion
	                    for(var i=0;i<nbrMsg;i++){
	                        //console.log('discussion.messages[i]._id='+ discussion.messages[i]._id); 
	                        if ( JSON.stringify(discussion.messages[i]._id) === JSON.stringify(_id_message) ){
	                            auteurMsg =  discussion.messages[i].auteur;
	                            var indice = i;
	                            //console.log('indice:'+indice); 
	                            break;
	                        }
	                    }
	                           
	                    //check des autorisations pour effacer le message, [discussion.createur, auteurMsg, 'jsquiz'].indexOf(effaceur) >=0
	                   
	                    if ( auteurMsg && (effaceur === discussion.createur || effaceur === auteurMsg || effaceur === 'jsquiz') ){
	                    //var autorized = [discussion.createur, auteurMsg, 'jsquiz'];
	                    //if ( auteurMsg && autorized.indexOf(effaceur) >=0 (effaceur === discussion.createur || effaceur === auteurMsg || effaceur === 'jsquiz') ){

	                        //on efface le message
	                        //console.log('on efface le message');

	                        var messages = discussion.messages;
	                        messages.splice(indice, 1);

	                        var collections = db.get().collection('discussions');
	                        collections.update({_id:_id_discussion}, { $set: { messages: messages } }, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme pour effacer le message de la discussion :"+ ids);
	                            }else{
	                                console.log("Message supprimé.");
	                                socket.emit('delete-message-success',id_message); 
	                            }                       
	                        });                      
	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    }); 


	    //si un utilisateur clic sur le bouton de suppression d'une discussion
	    socket.on('delete-discussion', function(id){ 

	        //console.log('delete-discussion '+ id);            
	        var _id_discussion = new mongo.ObjectId(id);
	        
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	                   
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut supprimer la discussion
	            //console.log('effaceur: '+ effaceur);        
	            //on determine le createur de la discussion _id_discussion que effaceur veut effacer
	            tools.getCollectionDocument(db,'discussions',{_id:_id_discussion},function(discussion){  
	                if ( discussion ){
	                    //console.log('La discussion existe');        
	                           
	                    //check des autorisations pour effacer la dicussion
	                    if ( effaceur === discussion.createur || effaceur === 'jsquiz' ){
	                        //on efface le message
	                        //console.log('on supprime la discussion');

	                        var collections = db.get().collection('discussions');
	                        collections.remove({_id:_id_discussion}, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme pour effacer la discussion "+ id);
	                            }else{
	                                console.log("Discussion supprimée.");
	                                socket.emit('delete-discussion-success',discussion.titre);
	                            }                       
	                        });                      
	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    }); 



	    //Utilisé pour les demandes/acceptations/retrait de la liste d'ami 
	    //Si le parametre statut est vide on retire cible de la liste d'ami de demandeur et de la cible
	    var majFriendList = function(db, demandeur, cible, statut, envoyerMail, onSuccess){
	        var collections = db.get().collection('users'), msg;

	        //on regarde dans la liste d'ami du demandeur
	        collections.find({pseudo:demandeur}).toArray(function(err, documents){
	            //documents[0].amis;
	            if ( err ){ 
	                //onFail();
	                console.log('error');
	                return;
	            }

	            var amis = [];
	            //Si une liste d'amis existe deja on la recopie dans l'objet amis
	            if ( typeof documents[0].amis !== 'undefined'){
	                //console.log('typeof documents[0].amis !== undefined');
	                amis = documents[0].amis;
	            }

	            //On recherche la position de cible dans l'array amis
	            var indice = -1;
	            for (var i = 0; i < amis.length; i++){ 
	               if ( amis[i].pseudo === cible ){
	                  indice = i;
	                  break;
	               }              
	            }
	            

	            if ( statut != '' ){//cas ajout ami ou mise à jour 
	                //Si la cible n'est pas encore dans la liste d'ami on l'ajoute
	                //sinon on met à jour son statut
	                if ( indice < 0 ){//Ajout nouvel ami
	                    amis.push({'pseudo':cible, statut:statut });
	                }else{//Mise à jour ami existant
	                    amis[indice].statut = statut;
	                }
	            }else{//cas retrait de la liste d'ami
	                //console.log('cas retrait de la liste d\'ami, indice=',indice);
	                if ( indice >= 0 ){
	                    amis.splice(indice, 1);
	                }
	            }
	            
	            //console.log('amis=',amis);
	           
	            
	            collections.update({pseudo:demandeur}, { $set: { amis: amis } }, function(error, result) {
	                if ( error ){ 
	                    console.log("probleme au update");
	                    //onFail();               
	                }else{
	                    console.log("Update amis into the users collection.");
	                    onSuccess();
	                    if ( envoyerMail ){
	                        tools.getCollectionFieldValue(db,'users',{pseudo:cible},'email',function(email){
	                            
	                            //console.log('email======'+ email);
	                            var subject =  demandeur + ' veut etre ton ami !';
	                            var html = 'Bonjour <b>' + demandeur +  '</b> veut etre votre ami sur jsQuiz!<br>'
	                            +'Pour repondre à sa demande, connecte-toi au site <a href="www.felixdebon.fr" target="_blank">JsQuiz</a>'                        
	                            tools.envoyerMail(email, subject, html,              
	                                function(){ console.log('Message sent'); },
	                                function(){ console.log('Erreur à l\'envoie.'); }                   
	                            );
	                        });                    
	                    }
	                }            
	            });
	        });    

	    }

	    //Demande d'ajout de cible dans ma liste d'ami 
	    socket.on('friendRequest', function(cible){   
	      
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('id: ' + '( socket.id='+ socket.id + ')');
	            // console.log("cible :", cible);
	            // console.log("emetteur:", socket.handshake.session.pseudo);
	            var demandeur =  socket.handshake.session.pseudo;

	            majFriendList(db, demandeur, cible, 'invitation en cours', true, function(){
	                //console.log('emit demandeBienRecue');
	                socket.emit('demandeBienRecue','friendRequest',cible);
	            });

	            majFriendList(db, cible, demandeur, 'en attente de confirmation', false, function(){});

	        }else{
	            console.log('tentative d\'acces non autorisée!');
	        }
	    });  

	    //Acceptation d'une demande d'ajout en liste d'ami
	    socket.on('acceptFriendRequest', function(cible){   
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('id: ' + '( socket.id='+ socket.id + ')');
	            // console.log("cible :", cible);
	            // console.log("emetteur:", socket.handshake.session.pseudo);
	            var demandeur =  socket.handshake.session.pseudo;

	            majFriendList(db, demandeur, cible, 'confirmed',false,function(){
	                //console.log('emit demandeBienRecue');
	                socket.emit('demandeBienRecue','acceptFriendRequest',cible);
	            });

	            majFriendList(db, cible, demandeur, 'confirmed',false,function(){});      

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });  


	    //Acceptation d'une recommandation d'ami 
	    socket.on('acceptFriendReco', function(cible){   
	        
	        console.log('acceptFriendReco, cible='+cible);
	        var pseudo = socket.handshake.session.pseudo;
	        if ( pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	          
	            //On verifier dabord si cible a deja accepté la reco (statu ==== "accepted")
	            
	            tools.getCollectionFieldValue(db,'users',{pseudo:cible},'amis',function( amisCible){//je choppe liste d'amis de cible              
	                var statut = tools.getFriendStatut(amisCible, pseudo);//Donne le statut de pseudo dans la liste d'ami amisCible 
	                //console.log('amisCible =',amisCible);
	                if ( statut === 'accepted' ){//si cible a deja accepté la reco alors mettre le statut à "confirmed" des deux cotés
	                
	                    majFriendList(db, pseudo, cible, "confirmed", false, function(){
	                        //Envoi d'un mail au proprietaire du profil
	                        console.log("envoi mail");
	                        var subject =  'Vous êtes ami avec ' + pseudo;
	                        var html = 'Félicitation ! Vous etes à present ami avec ' + pseudo  + '<br>'
	                        + 'Pour lui dire bonjour connectez-vous au site www.felixdebon.fr'; 
	                        tools.getCollectionFieldValue(db,'users',{pseudo:cible},'email',function(email){
	                            tools.envoyerMail(email, subject, html,              
	                                function(){ console.log('Message sent'); },
	                                function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                            ); 
	                        }); 
	                    });

	                    majFriendList(db, cible , pseudo, "confirmed", false, function(){
	                        //Envoi d'un mail au proprietaire du profil
	                        var subject =  'Vous êtes ami avec ' + cible;
	                        var html = 'Félicitation ! Vous etes à present ami avec ' + cible  + '<br>'
	                        + 'Pour lui dire bonjour connectez-vous au site www.felixdebon.fr'; 
	                        tools.getCollectionFieldValue(db,'users',{pseudo:pseudo},'email',function(email){
	                            tools.envoyerMail(email, subject, html,              
	                                function(){ console.log('Message sent'); },
	                                function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                            ); 
	                        }); 
	                    });
	                    //console.log("ok ok"); 

	                    socket.emit('demandeBienRecue','acceptFriendRequest',cible);   
	                }else{//sinon on met le statu de cible à "accepted' dans les amis de pseudo 
	                    
	                    tools.getCollectionFieldValue(db,'users',{pseudo:pseudo},'amis',function( amisPseudo){//je choppe la liste d'amis de pseudo 
	                        
	                        //On recherche la position de cible dans l'array amis
	                        var indice = -1;
	                        for (var i = 0; i < amisPseudo.length; i++){ 
	                           if ( amisPseudo[i].pseudo === cible ){
	                              indice = i;
	                              break;
	                           }              
	                        }
	                        if ( indice ){   
	                            amisPseudo[indice] = { pseudo:cible, statut: 'accepted' };                   
	                            var collections = db.get().collection('users');
	                            collections.update({pseudo:pseudo}, { $set: { amis: amisPseudo } }, function(error, result) {
	                                if ( error ){ 
	                                    console.log("probleme au update");             
	                                }else{                        
	                                    console.log("update done!");    
	                                }
	                            });
	                        }else{
	                            console.log('error: indice < 0 !');
	                        }
	                    });
	                    socket.emit('demandeBienRecue','acceptFriendReco',cible);
	                }               
	            });     

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    }); 


	    //Ignorer une demande d'ajout en liste d'ami
	    socket.on('ignorerFriendRequest', function(cible){   
	      
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('id: ' + '( socket.id='+ socket.id + ')');
	            // console.log("cible :", cible);
	            // console.log("emetteur:", socket.handshake.session.pseudo);
	            var demandeur =  socket.handshake.session.pseudo;

	            majFriendList(db, demandeur, cible, '',false,function(){//retrait de la liste d'ami
	                //console.log('emit ignorerFriendRequest');
	                socket.emit('demandeBienRecue','ignorerFriendRequest',cible);
	            });

	            majFriendList(db, cible, demandeur, '',false,function(){});     

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });  

	    socket.on('unfriend', function(cible){   
	      
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('id: ' + '( socket.id='+ socket.id + ')');
	            // console.log("cible :", cible);
	            // console.log("emetteur:", socket.handshake.session.pseudo);
	            var demandeur =  socket.handshake.session.pseudo;

	            majFriendList(db, demandeur, cible, '', false,function(){
	                //console.log('emit unfriend');
	                socket.emit('demandeBienRecue','unfriend',cible);
	            });
	            majFriendList(db, cible, demandeur, '', false,function(){});

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    });  


	    socket.on('supprimerAmiRequestAdmin', function(data){   
	        var pseudo = socket.handshake.session.pseudo;

	        if ( pseudo === 'jsquiz' ){//evite les socket emit en mode console des visiteurs non connectés
	            // console.log('id: ' + '( socket.id='+ socket.id + ')');
	            // console.log("membre1:", data.membre1);
	            // console.log("membre2:", data.membre2);
	            majFriendList(db, data.membre1, data.membre2, '', false,function(){
	                //console.log('emit unfriend');
	                socket.emit('demandeBienRecue','unfriendByAdmin',data.membre2);
	            });
	            majFriendList(db, data.membre2, data.membre1, '', false,function(){});

	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }
	    }); 

	    var suggererAmiRequest = function(db, cible, suggeredPseudo, socket, entremetteur){
	        //On ajouter suggeredPseudo à la liste d'ami de cible avec le statut 'recommanded'
	        tools.getCollectionFieldValue(db,'users',{pseudo:cible},'amis',function(amis){
	            //var amis =  JSON.parse(JSON.stringify(amisdata));//marche si il n'y a pas de function dans l'objet à copier 
	            amis.push({pseudo:suggeredPseudo, statut:'recommended', by:entremetteur});
	            var collections = db.get().collection('users');
	            collections.update({pseudo:cible}, { $set: { amis: amis } }, function(error, result) {
	                if ( error ){ 
	                    console.log("probleme au update");             
	                }else{
	                    socket.emit('suggererAmiRequestDone',suggeredPseudo);

	                    //Mail envoyé à celui à qui on fait la recommandation  
	                    tools.getCollectionFieldValue(db,'users',{pseudo:cible},'email',function(email){
	                        //console.log('email', email);
	                        var subject =  entremetteur + ' vous a fait une recommandation d\'ami!';
	                        var html = 'Bonjour, <b>' + entremetteur 
	                        + '</b> vous a recommandé un nouvel ami. Il s\'agit de <b>' 
	                        + ' ' + suggeredPseudo +'</b>.' //mettre un lien vers le site 
	                        + ' Pour le découvrir connecte-toi au site <a href="www.felixdebon.fr" target="_blank">JsQuiz</a>';          
	                        tools.envoyerMail(email, subject, html,              
	                            function(){ console.log('Message sent'); },
	                            function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                        );
	                    });
	                    //Mail envoyé à celui qui a fait la recommandation  
	                    tools.getCollectionFieldValue(db,'users',{pseudo:entremetteur},'email',function(email){
	                        //console.log('email', email);
	                        var subject =  'Envoie d\'une recommandation d\'ami!';
	                        var html = 'Bonjour, vous avez proposé à '+ cible + ' d\'ajouter ' + suggeredPseudo+ ' à sa liste d\'amis. Votre recommandation a bien été envoyée à '+ cible + '.' 
	                        tools.envoyerMail(email, subject, html,              
	                            function(){ console.log('Message sent'); },
	                            function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	                        );
	                    });                                                                      
	                }    
	            });   
	        });   
	    }


	    //Recommandation (suggestion) d'un ami 
	    socket.on('suggererAmiRequest', function(data){// data = {cible:cible, suggeredPseudo:suggeredPseudo }
	      
	        var entremetteur = socket.handshake.session.pseudo;
	        if ( entremetteur ){//evite les socket emit en mode console des visiteurs non connectés
	            //Securité: ajouter une verif que socket.handshake.session.pseudo est un ami de suggeredPseudo et cible
	            

	            suggererAmiRequest(db, data.cible, data.suggeredPseudo, socket, entremetteur);
	            suggererAmiRequest(db, data.suggeredPseudo, data.cible, socket, entremetteur);


	            // //On ajouter suggeredPseudo à la liste d'ami de cible avec le statut 'recommanded'
	            // tools.getCollectionFieldValue(db,'users',{pseudo:data.cible},'amis',function(amis){
	            //     //var amis =  JSON.parse(JSON.stringify(amisdata));//marche si il n'y a pas de function dans l'objet à copier 
	            //     amis.push({pseudo:data.suggeredPseudo, statut:'recommended', by:socket.handshake.session.pseudo});
	            //     var collections = db.get().collection('users');
	            //     collections.update({pseudo:data.cible}, { $set: { amis: amis } }, function(error, result) {
	            //         if ( error ){ 
	            //             console.log("probleme au update");             
	            //         }else{
	            //             socket.emit('suggererAmiRequestDone',data.suggeredPseudo);

	            //             //Mail envoyé à celui à qui on fait la recommandation  
	            //             tools.getCollectionFieldValue(db,'users',{pseudo:data.cible},'email',function(email){
	            //                 //console.log('email', email);
	            //                 var subject =  socket.handshake.session.pseudo + ' vous a fait une recommandation d\'ami!';
	            //                 var html = 'Bonjour, <b>' + socket.handshake.session.pseudo 
	            //                 + '</b>, vous a recommandé un nouvel ami. Il s\'agit de <b>' 
	            //                 + ' ' + data.suggeredPseudo +'</b>.' //mettre un lien vers le site 
	            //                 + ' Pour le découvrir connecte-toi au site <a href="www.felixdebon.fr" target="_blank">JsQuiz</a>';          
	            //                 tools.envoyerMail(email, subject, html,              
	            //                     function(){ console.log('Message sent'); },
	            //                     function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	            //                 );
	            //             });
	            //             //Mail envoyé à celui qui a fait la recommandation  
	            //             tools.getCollectionFieldValue(db,'users',{pseudo:socket.handshake.session.pseudo},'email',function(email){
	            //                 //console.log('email', email);
	            //                 var subject =  'Envoie d\'une recommandation d\'ami!';
	            //                 var html = 'Bonjour, vous avez proposé à '+ data.cible + ' d\'ajouter ' +data.suggeredPseudo+ ' à sa liste d\'amis". Votre recommandation a bien été envoyée à '+ data.cible + '.' 
	            //                 tools.envoyerMail(email, subject, html,              
	            //                     function(){ console.log('Message sent'); },
	            //                     function(){ console.log('Erreur à l\'envoie du mail.'); }                   
	            //                 );
	            //             });                                                                      
	            //         }    
	            //     });   
	            // });   

	        }else{
	            console.log('tentative d\'acces non autorisée!');
	        }
	    });  



	    socket.on('openNewChat', function (cible) {
	        //console.log('cible='+cible);

	        var pseudo =  socket.handshake.session.pseudo;
	        if ( pseudo ){//evite les socket emit en mode console des visiteurs non connectés      
	            
	            //on re-verifie que cible est bien dans la liste d'amis de pseudo  
	            tools.getCollectionFieldValue(db,'users',{pseudo:pseudo},'amis',function(amis){   
	                var statut = tools.getFriendStatut(amis, cible);
	                //si je suis mon profil ou celui d'un ami confirmé
	                if ( statut === 'confirmed' || pseudo === 'jsquiz'){

	                    //Je creer un id unique pour representer le nouveau chat en base
	                    var id = String(new mongo.ObjectId());
	                    
	                    //console.log('id=',id);
	                    var data = { id:id, pseudo:pseudo, msg:'Ouverture d\'un nouveau chat par ' +pseudo, date:tools.timestamp() , display:'no'}

	                    //Rem: on met à no sur certains messages pour qu'ils ne soient pas affichés dans le chat

	                    var collections = db.get().collection('chats');  
	                    collections.insert(data, function(err, documents){
	                        if ( err ){
	                            console.log("Error on insertOne in chats collection");
	                        }else{
	                            console.log("Inserted 1 documents into the chats collection.");

	                            //mettre à jour le tableau des chats en cours pour le user 
	                            if ( !currentsChatsIds[pseudo] ){
	                                //initialisation si l'objet est vide
	                                currentsChatsIds[pseudo] = [];
	                            }

	                            var pos = currentsChatsIds[pseudo].indexOf(id);
	                            //console.log('typeof id:'+typeof id);
	                            if ( pos < 0 ){
	                                currentsChatsIds[pseudo].push(id);
	                            }
	                            //console.log(pseudo + ': currentsChatsIds=', currentsChatsIds[pseudo]);
	                            
	                            //on envoit à socket.handshake.session.pseudo l'id du nouveau chat et l'interlocuteur pour afficher le chat window 
	                            socket.emit('createNewChatWindow', id, cible);

	                            //on envoit une invitation au pseudo cible pour qu'il puisse rejoindre le chat      
	                            var sidCible = connectedMembers[cible].sid;//on connait son id de socket ! 
	                            //console.log('sidCible='+sidCible);
	                            io.to(sidCible).emit("invitationChat",{id:id, pseudo:pseudo });

	                            setTimeout(function(){ 
	                                socket.emit('infoServer', {id:id , color:'blue', msg:cible +' n\'as pas encore accepté la conversation. Veuillez patienter svp...'});
	                            },300);    
	                            //pseudo entre le 1er dans la room qu'il a créée
	                            socket.join(id); 

	                            var data = { id:id, pseudo:cible, msg:'---', date:tools.timestamp() , display:'no'}
	                            collections.insert(data, function(err, documents){
	                                if ( err ){
	                                    console.log("Error on insertOne in chats collection");
	                                }
	                            });
	                            //ici effacer les messages du chat vieux de plus de 15 jours... ?

	                        }
	                    });
	                }
	            });
	        }
	    });



	    //Le joueur invité a accepté d'entrer dans la room
	    socket.on('entreDanRoom', function (id, option){
	        var pseudo =  socket.handshake.session.pseudo;
	        if ( pseudo ){

	            //On previent ceux qui sont dans la room que pseudo est entré 
	            if ( option ){
	                io.to(id).emit('infoServer', {id:id, color:'green', msg: pseudo + ' a rejoint la conversation !'});
	            }
	            //socket.handshake.session.pseudo entre dans la room
	            socket.join(id);  
	            
	            //console.log(pseudo + ' a rejoint la room ' + id);

	            //mettre à jour le tableau des chats en cours pour le user 
	            if ( !currentsChatsIds[pseudo] ){
	                currentsChatsIds[pseudo] = [];
	            }
	            
	            //console.log('typeof id:'+typeof id);
	            var pos =  currentsChatsIds[pseudo].indexOf(id);
	            if ( pos < 0 ){
	                 currentsChatsIds[pseudo].push(id);
	            }
	            //console.log(pseudo + ': currentsChatsIds=', currentsChatsIds[pseudo]);

	            //Add the client's username to the room's list 
	            //rooms[socket.room].users[pseudo] = socket.pseudo;
	        }
	    });

	     

	    //Un client pseudo veut quitter la room id
	    socket.on('sortirDuChat', function (id){
	        var pseudo =  socket.handshake.session.pseudo;
	        if ( pseudo ){

	            //pseudo sort de la room id
	            socket.leave(id); 

	            if ( currentsChatsIds[pseudo] ){
	                //console.log('typeof id:'+typeof id);
	                var pos =  currentsChatsIds[pseudo].indexOf(id);
	                //Je retire l'id du chat 
	                if ( pos >= 0 ){
	                     currentsChatsIds[pseudo].splice(pos,1);
	                }
	                //console.log(pseudo + ': currentsChatsIds=', currentsChatsIds[pseudo]);
	            }
	            //console.log(pseudo + ' a quitté la room ' + id);
	            //Add the client's username to the room's list 
	            
	            //On previent ceux qui sont dans la room que pseudo est parti
	            io.in(id).emit('infoServer', {id:id, color:'orange', msg: pseudo + ' a quitté la conversation !'});

	        }
	    });

	    //Un client pseudo veut quitter la room id
	    socket.on('refusChat', function (id){
	        var pseudo =  socket.handshake.session.pseudo;
	        if ( pseudo ){
	            //console.log(pseudo + ' a quitté la room ' + id);
	            //Add the client's username to the room's list 
	            io.in(id).emit('infoServer', {id:id, color:'orange', msg: pseudo + ' a refusé la conversation.'});
	        }
	    });


	    socket.on('newMsgChat', function (id, msg){
	        var pseudo =  socket.handshake.session.pseudo;
	        if ( pseudo ){
	            //console.log(id); console.log(msg); console.log(db);
	            //verifier que le chat id existe 
	            tools.getCollectionDocument(db,'chats', {id:id}, function(doc){
	                //console.log('doc=',doc);   
	                if ( doc ){

	                    //On envoit le message à ceux qui sont dans la room id
	                    io.in(id).emit('addMsgChat', {id:id, pseudo:pseudo, msg:msg});  

	                    //On enregistre le message en base
	                    var data = { id:id, pseudo:pseudo, msg:msg, date:tools.timestamp(), display:'yes' }

	                    var collections = db.get().collection('chats');  
	                    collections.insertOne(data, function(err, documents){
	                        if ( err ){
	                            console.log("Error on insertOne in chats collection");
	                        }
	                    });
	                }
	            });
	        }
	    });


	    //à chaque rechargement de la page le client fait un socket emit pour demander au serveur les chats en cours. 
	    //Le serveur va repondre et envoyer les données de chat en cours au client 
	    //Le client utilisera ensuite ces données pour reconstruire les fenetres de chats "perdues" lors du reload de la page.
	    socket.on('askForCurrentchats', function (){
	        var pseudo =  socket.handshake.session.pseudo;
	        //console.log(pseudo + " a envoyé un askForCurrentchats");
	        
	        if ( pseudo ){
	            //console.log('currentChats====', currentsChatsIds[pseudo]);//liste des id de chat
	            if ( currentsChatsIds[pseudo] ){
	                var collections = db.get().collection('chats');  
	                var cursor = collections.find({ id: { $in:currentsChatsIds[pseudo] } }).toArray(function(err, docs){// ajouté filtre sur les msg où cible=pseudo
	                    if ( docs.length > 0){
	                        //console.log(data);
	                        //le server envoit les données des chat en cours pour pseudo
	                        socket.emit('currentChatsData', {pseudo:pseudo, listeId:currentsChatsIds[pseudo], docs:docs } );  
	                    }
	                }); 
	            } 
	           
	        }
	    });

	    //data.pseudo demande les messages du chat data.id
	    socket.on('askMajChat', function (data){
	        var pseudo =  socket.handshake.session.pseudo;
	        //console.log(pseudo + " a envoyé un askMajChat");
	        if ( pseudo ){        
	            var collections = db.get().collection('chats');  
	            var cursor = collections.find({ id: data.id }).toArray(function(err, documents){ // ajouté filtre sur les msg où cible=pseudo
	                if ( documents.length > 0){ 
	                    //le server envoit les messages du chat id
	                    socket.emit('majChat', documents);

	                    var doc = { id:data.id, pseudo:pseudo, msg:'', date:tools.timestamp(), display:'no' }
	                    collections.insertOne(doc, function(err, documents){
	                        if ( err ){
	                            console.log("Error on insertOne in chats collection");
	                        }
	                    });  
	                }
	            });
	          
	    
	        }
	    });
	  

	    //Suppression d'un profil par l'admin 
	    socket.on('supprimerProfil', function(pseudo){ 
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            if ( socket.handshake.session.pseudo === 'jsquiz'){
	                //console.log('supprimer le user '+pseudo);
	                var collections = db.get().collection('users');
	                //on enleve pseudo de la table user
	                collections.remove({pseudo:pseudo}, function(error, result){
	                    if ( error ){ 
	                        console.log("(1) probleme pour supprimmer le user");
	                        return res.sendStatus(400);
	                    }else{
	                        //puis on enleve pseudo de la liste d'ami des autres membres 
	                        collections.update({},{ $pull: { 'amis' : { pseudo: pseudo}}},{ multi: true },function(error){
	                            if ( error ){ 
	                                console.log("(1) probleme user update");
	                            }else{
	                                //puis on enleve les posts sur le mur de pseudo                          
	                                var collections = db.get().collection('posts');
	                                collections.remove({profilOwner:pseudo}, function(error, result) {
	                                    if ( error ){ 
	                                        console.log("(2) probleme pour supprimmer le user");
	                                        return res.sendStatus(400);
	                                    }else{    
	                                        console.log("User supprimé.");                      
	                                        socket.emit('delete-user-success',pseudo); 
	                                    }                       
	                                }); 
	                            }
	                        });     
	                    }                       
	                });  
	            }
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    });   

	    //fonction qui retourne l'index de la bonne reponse de la question _id du quiz id
	    var indexBonneReponse = function(questionId, callback){
	       
	        var questionId = new mongo.ObjectId(questionId);
	        var quiz = db.get().collection('quiz');
	        
	        quiz.find({ _id:questionId}).toArray(function(err, doc){    
	            //console.log('nbrDoc='+ doc.length);console.log('doc=', doc);
	            var m = doc[0].reponses.length;
	            //console.log('m:'+m);
	            var index = -1;
	            for ( var j = 0; j<m ; j++){//on cherche la bonne reponse
	                //console.log('doc[0].reponses[j].val:'+doc[0].reponses[j].val);
	                if ( doc[0].reponses[j].val === true ){//la bonne reponse est en position j
	                    index = j;
	                    //console.log('j true:'+j);
	                }
	            }
	            callback(index);
	        });
	    }   

	   //indexBonneReponse('56899946ddd1bcf44354e1ee',function(i){console.log('i=',i); });


	    socket.on('reponse-question-quiz', function(id){ 
	        var pseudo = socket.handshake.session.pseudo;
	        if ( pseudo ){
	            //console.log(id);
	            //l'id recu est composé du numero de question (index) + le nombre de question 
	            //+ id du quiz + _id de la question + indice de la reponse choisie
	            var tabInfo = id.split('-');
	            
	            if ( tabInfo.length === 5 ){//cas reponse normale
	                var rep = tabInfo[4];
	            }else{//skip et autres cas
	                var rep = -1;
	            }   
	            //Dans la collection quiz on va ajouter la reponse donnée par pseudo dans le tableau results de la question  
	            var quiz = db.get().collection('quiz');
	            //pour la ligne _id = tabInfo[3] on ajoute l'objet suivant à l'attribut results de la question d'_id tabInfo[4] :
	            // {pseudo:pseudo, rep: tabInfo[4] , date:new Date()}

	            var _id = new mongo.ObjectId(tabInfo[3]);
	            //on supprime la precedente reponse de pseudo a cette question (si elle existe)
	            quiz.update( { _id:_id}, { $pull: { results : {pseudo: pseudo } } } , { multi: true },function(error, result) {
	                if ( error ){ 
	                    console.log("probleme quiz.update");
	                    return res.sendStatus(400);
	                }else{
	                    //console.log("quiz.update ok");

	                    //on insere la nouvelle reponse
	                    var data = { pseudo:pseudo, rep:rep, date: new Date() }
	                    quiz.update({_id:_id}, { $addToSet : { results:data } }); 
	                    //console.log("tabInfo[3]:"+tabInfo[3]);   
	                    
	                    indexBonneReponse(tabInfo[3], function(index){
	                        //console.log('coucou:'+ id + ' ' + index);
	                        socket.emit('indexBonneReponse',id, index);
	                    });                              
	                }                       
	            });  
	              
	        }
	    });

	    
	    

	    //l'utilisateur pseudo demande le resultat qu'il a obtenu pour le quiz id
	    socket.on('ask-quiz-result', function(id){ 
	        var pseudo = socket.handshake.session.pseudo;
	        if ( pseudo ){
	            //console.log(id);
	            var nbBonnesReponses = 0;
	            //l'id recu est composé ainsi: numero de question (index) + nombre de question 
	            //+ id du quiz + _id de la question + indice de la reponse choisie
	            
	            //console.log('ask-quiz-result');

	            //On compte le nombre de bonnes reponses et on le renvoi à l'utitisateur 
	            var id = new mongo.ObjectId(id);
	            var quiz = db.get().collection('quiz');
	            
	            quiz.find({ id:id}).toArray(function(err, docs){    
	                //console.log('nbrDoc='+ docs.length);
	                //console.log('docs=',docs);
	                var titre = docs[0].titre;
	                var nbQuestion = docs.length;
	                //console.log('nbQuestion:'+nbQuestion);

	                //2 variables qui vont servir à calculer le score moyen sur ce quiz 
	                var nbBonnesReponsesAllUsers = 0, nbReponsesAllUsers = 0;

	                for ( var i = 0; i < nbQuestion; i++){//pour chaque question du quiz id
	                    var m = docs[i].reponses.length;
	                    //console.log('m:'+m);
	                    for ( var j = 0; j<m ; j++){//on cherche la bonne reponse
	                        //console.log('docs[i].reponses[j].val:'+docs[i].reponses[j].val);
	                        if ( docs[i].reponses[j].val === true ){//la bonne reponse est en position j
	                            //console.log('j true:'+j);
	                            //on compare à la reponse donnée par pseudo
	                            var nbReponsesEnregistrees = docs[i].results.length;//nombe de reponses données
	                            //nbReponsesAllUsers += nbReponsesEnregistrees;
	                            //console.log('nbReponsesEnregistrees:'+nbReponsesEnregistrees);
	                            for ( var k = 0; k<nbReponsesEnregistrees ;k++){
	                                //console.log('docs[i].results[k].pseudo:'+docs[i].results[k].pseudo);
	                                //console.log('docs[i].results[k].rep:'+docs[i].results[k].rep);
	                                
	                                //ajout d'un flag au doc pour pouvoir afficher entourer de rouge les mauvaises reponses données par pseudo 
	                                if ( docs[i].results[k].rep >= 0 ){
	                                   docs[i].reponses[docs[i].results[k].rep].flag = false;
	                                }

	                                if ( docs[i].results[k].pseudo === pseudo ){
	                                    //Je marque la reponse choisie par pseudo en creant un nouveau champ dans docs
	                                    if ( docs[i].results[k].rep >= 0 ){
	                                        docs[i].reponses[docs[i].results[k].rep].flag = true;
	                                    }
	                                    if ( docs[i].results[k].rep == j ){
	                                        nbBonnesReponses++;
	                                    }
	                                }
	                                // if ( docs[i].results[k].rep == j ){
	                                //     nbBonnesReponsesAllUsers++;
	                                // }
	                               
	                            }
	                            break;
	                        }

	                    }
	                }


	                var score = parseInt(10*100*nbBonnesReponses/nbQuestion)/10;

	                //var scoreMoyenAllUsers =  parseInt(1000*nbBonnesReponsesAllUsers/nbReponsesAllUsers)/10;//à  recalculer avec score collection
	                
	                var boutonModif = false;
	                if ( pseudo === docs[0].createur || pseudo === 'jsquiz' ){
	                    boutonModif = true;
	                }
	                //console.log('boutonModif='+boutonModif);

	                //on enregistre dans la collection scores le score de pseudo sur le quiz id...
	                var collections = db.get().collection('scores');
	                var data = {
	                    id: id,
	                    titre: titre, 
	                    nbQuestion: nbQuestion,
	                    pseudo:pseudo,
	                    score:score,
	                    date:tools.dateDuJour().date,
	                };
	                //console.log('data=',data);
	                collections.insertOne(data, function(err, documents){
	                    if ( err ){
	                        res.render('jsquiz/erreurConnexion', {});
	                    }else{
	                        console.log("Inserted 1 documents into the scores collection.");

	                        //calcul du score moyen
	                        var cursor = collections.find({id:id}).toArray(function(err, documents){
	                            var nbrDoc = documents.length;
	                            var scoreMoyenAllUsers = 0;
	                            //console.log('N=',N);   
	                            for(var i=0;i<nbrDoc;i++){//pour chaque discussions
	                               scoreMoyenAllUsers += documents[i].score;
	                            }               
	                            scoreMoyenAllUsers = parseInt(10*scoreMoyenAllUsers/nbrDoc)/10;

	                            var resu = {titre: titre, nbQuestion: nbQuestion, score: score, boutonModif:boutonModif, scoreMoyenAllUsers:scoreMoyenAllUsers};
	                            //console.log('resu=',resu);
	                            //console.log('docs=',docs);
	                            
	                            socket.emit('quiz-result', resu, docs);                             
	                        });
	                    }
	                }); 

	            });
	        }
	    });         
	  

	    //si un utilisateur clic sur le bouton de suppression d'un post
	    socket.on('delete-quiz', function(id){ 
	        var id = new mongo.ObjectId(id);
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            //console.log('id quiz='+id);
	                      
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut effacer le quiz
	            
	            //on determine l'auteur du quiz id que effaceur veut effacer
	            tools.getCollectionDocument(db,'quiz',{id:id},function(quiz){  
	                //console.log('quiz:',quiz);
	                if ( quiz ){
	                    if ( effaceur === quiz.createur || effaceur === 'jsquiz' ){
	                        //on efface le post
	                        //console.log('on efface le quiz');
	                        //console.log('quiz=',quiz);
	                        var titre = quiz.titre;
	                        var collections = db.get().collection('quiz');
	                        collections.remove({id:id}, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme pour supprimmer le quiz");
	                                return res.sendStatus(400);
	                            }else{
	                                console.log("Quiz supprimé.");
	                                socket.emit('delete-quiz-success',titre); 
	                            }                       
	                        });                        

	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }        
	    }); 

	   //si un utilisateur clic sur le bouton de suppression d'une question d'un quiz
	    socket.on('delete-question', function(id){ 
	        var id = new mongo.ObjectId(id);
	        if ( socket.handshake.session.pseudo ){//evite les socket emit en mode console des visiteurs non connectés
	            //console.log('id question='+id);
	                      
	            var  effaceur = socket.handshake.session.pseudo;//celui qui veut effacer la question
	            
	            //on determine l'auteur du quiz id que effaceur veut effacer
	            tools.getCollectionDocument(db,'quiz',{id:id},function(quiz){  
	                if ( quiz ){
	                    if ( effaceur === quiz.createur || effaceur === 'jsquiz' ){
	                        //on efface la question en base
	                        //console.log('on efface la question');
	                        var collections = db.get().collection('quiz');
	                        collections.remove({id:id}, function(error, result) {
	                            if ( error ){ 
	                                console.log("probleme pour supprimmer la question");
	                                return res.sendStatus(400);
	                            }else{
	                                console.log("Post supprimé.");
	                                socket.emit('delete-post-success',id); 
	                            }                       
	                        });                        

	                    }
	                }
	            });
	        }else{
	            console.log('tentative d\'acces non autorisée!')
	        }  

	    }); 

	});
};