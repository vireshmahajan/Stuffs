// Declare app level module which depends on filters, and services

angular.module('integraApp', [
  'ngRoute',
  'ngSanitize',
  'ngStorage',
  'admin',
  'order',
  'stock',
  'report',
  'item',
  'bills',
  'dispense',
  'supplier',
  'dashboard',
  'directives',
  'services',
  'language',
  ]);
angular.module('integraApp').config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
  $routeProvider.
    otherwise({
      redirectTo: '/'
    });
  $locationProvider.html5Mode(true);
}]);

angular.module('integraApp').controller('MainController', [ '$scope', '$http', '$location', 'Notification', 'itemsService', 'adminService', '$localStorage', function($scope, $http, $location, Notification, itemsService, aS, $localStorage){
  $scope.modal = {};
  $scope.notification = {};
  $scope.waiting = '';
  $scope.updates = [];
  $scope.$storage = $localStorage;

  function href(target, useUrl){
    $scope.modal = {};
    if(useUrl == '1'){
      $location.url(target);
    }else{
      $location.path(target);
    }
  }
  function backBtn(){
    history.back();
  }



  var fetchwaiting = function (){
    //Fetches waiting list of patients
    itemsService.fetchDispenseRecords("pending", function(r){
        $scope.waiting = r;
    });    
  };

  $scope.refreshUpdates = function (){
    $scope.isr = 'fa-spin';
    fetchwaiting();
    aS.getUpdates(function(r){
      _.each(r, function(v){
        $scope.updates.push(v);
      });
      $scope.isr = '';
    });
  };

  //Run Update
  $scope.refreshUpdates();

  //Fetch updates
  //setInterval($scope.refreshUpdates, 15000);

  $scope.clearUpdates = function(){
    aS.clear(function(r){
      $scope.updates = [];
    });
  };

  //List of Item forms 
  var itemForm = [
   'Tablets',
   'Capsules',
   'Vials',
   'Caplets',
   'Amples',
   'Emugels',
   'Gels',
   'Ointments',
   'Suspensions',
   'Syrup',
   'Powder',
   'Cream',
   'Lotion',
   'Drops',
   'Sprays',
   'Suppositories',
   'Solutions',
   'Sheet'
  ].sort();

  //List of Item Packaging
  var itemPackaging = [
     'Tin',
     'Carton',
     'Sachet',
     'Roll',
     'Pieces',
     'Packet',
     'Gallon',
     'Bottles',
     'Bags',
     'Box',
     'Tube'
  ].sort();

  $scope.commons = {
    href : href,
    backBtn: backBtn,
    itemForm : itemForm,
    itemPackaging: itemPackaging

  };
 

  $scope.$on('newNotification', function(){
    $scope.notification = Notification.notice;
  });
  $scope.$on('newEvent', function(){
    $scope.modal = Notification.message;
  });

  //Check for Orders in Cart
  $scope.orderCart =  angular.fromJson($scope.$storage.orderCart) || [];
  
  // if($scope.$storage.orderCart){
  //   $scope.orderCart = $.parseJSON($scope.$storage.orderCart);
  // }else{

  // }

  $scope.clearCart = function(){
    delete $localStorage.orderCart;
    $scope.orderCart.length = 0;
  };

  $scope.removeFromCart = function(index){
    $scope.orderCart.splice(index, 1);
    $scope.$storage.orderCart = angular.toJson($scope.orderCart);
  };
}]);
angular.module('integraApp').filter('moment', function(){
    return function(time){
        var m = moment(time);
        return m.fromNow();
    };
});