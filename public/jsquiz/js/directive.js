//Bonne pratique : programmer en mode strict JavaScript (voir : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Strict_mode)
'use strict';

//Bonne pratique : écrire son code dans une fonction anonyme auto-exécutable pour contrôler l'exposition des variables à l'objet global Window. 
(function(){

  /*
    On créé un module Angular JS à l'aide de la méthode angular.module().
    angular.module() est utilisée ici comme un "setter".
    Voir : https://docs.angularjs.org/api/ng/function/angular.module
  */
  angular.module('angularjsExercice1', []);

  /*
    angular.module() est utilisée ici comme un "getter".
    La méthode nous retourne une référence à l'objet de type angular.Module créé (voir : https://docs.angularjs.org/api/ng/type/angular.Module).
    Nous utilisons la méthode .directive() de cet objet pour créer des directives.
  */
  angular.module('angularjsExercice1').directive('maPremiereDirective', [function(){
    var objetDefinissantLaDirective = {
      template:'<h4>Ceci est un titre défini dans une directive</h4>'
    };
    return objetDefinissantLaDirective;
  }]);

  angular.module('angularjsExercice1').directive('maDeuxiemeDirective', [function(){
    //Attention si vous travaillez sans serveur, cette directive ne fonctionnera pas sur Chrome.
    var objetDefinissantLaDirective = {
      templateUrl:'maDeuxiemeDirective.html'
    };
    return objetDefinissantLaDirective;
  }]);

  angular.module('angularjsExercice1').directive('maTroisiemeDirective', [function(){
    var objetDefinissantLaDirective = {
      controller:[function(){

        this.inscrits = [{
          nom: 'Durant',
          prenom:'Albert',
          age:'33'
        }, {
          nom: 'Dupont',
          prenom:'Jeanne',
          age:'27'
        }, {
          nom: 'Denis',
          prenom:'Jude',
          age:'37'
        }];

      }],
      controllerAs:'monCtrl',
      template:'<h4>Liste générée à l\'aide d\'une liste définie dans un contrôleur attaché à la directive</h4>'
      +'<ul>'
        +'<li ng-repeat="eleve in monCtrl.inscrits"> {{ eleve.prenom + \' \' + eleve.nom + \' \' + eleve.age + \' ans.\' }}'
        +'</li>'
      +'</ul>'
    };
    return objetDefinissantLaDirective;

  }]);

 

})();