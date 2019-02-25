
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
   
    var jour =now.getDate();
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
}