/**
*  stock Module
*
* Description
*/
angular.module('stock', [])

.config(['$routeProvider', function($routeProvider){
  $routeProvider.when('/stock/locations', {templateUrl: '/items/stockdown', controller: 'stockIndexController'});
}])
.controller('stockIndexController',['$scope','$location','$routeParams','itemsService', 'stockService',function ($scope, $location, $routeParams,itemsService, sS){
  var currentItem;
  function init(){
    //Location Array
    $scope.locations = [];

    //Stores the requested drugs / items list
    $scope.requestform = {
      request: [],
      requestList : [],
      location: ''
    };

    //Text on the buttons
    $scope.addButtonText = 'Add';
    $scope.addHelpText = '';
    var thisItemName = '';
    $scope.stockDownRecord = [] ;
    $scope.hasItems = false;

    // Gets the stock down points from the server
    sS.getPoints('', function(res){
      $scope.sub_locations = res;
    });  
    // Gets the top / main stockl location from the server
    sS.getPoints('default', function(res){
      $scope.main_location = res;
    });    
  }
  init();


  // Watch for changes in the selectedItem model scope and 
  $scope.$watch('selectedItem.itemname', function(newValue, oldValue){
    if(newValue !== oldValue){
      thisItemName = newValue;
    }
  });

  $scope.doHistory =  function (event, location, id){
    //We use 0 for the location to indicate the Main Inventory
    
    //Set the current item var
    currentItem = event.currentTarget;
    sS.stockhistory(id, location,function(res){
      $scope.delConfirm = true;
      $scope.delBtnText = 'Delete Item';
      $scope.shz = res;
      $scope.spmenu = 'cbp-spmenu-open';

      //Click out closes side panel
      $('html').one('click', function(){
        $scope.spmenu = '';
        $scope.$apply();
      });
      $('nav.cbp-spmenu').click(function(event){
        event.stopPropagation();
      });
    });
  }; 
  $scope.addDrug = function(){
    $scope.addHelpText = '';
    if($scope.drugname.length === 0) return false;
    itemsService.summary(thisItemName,'main',function(c){
      if(_.indexOf($scope.requestform.requestList, thisItemName) < 0){
        $scope.requestform.requestList.push(thisItemName);
        $scope.requestform.request.push(c);
      }else{
        alert('This item is in the list already');
      }
    });
  };
  $scope.sendIt = function(){
    var drugs = [];
    _.forEach($scope.requestform.request, function(i,v){
      if(i.amount !== 0 && i.amount.length !== 0){
        drugs.push({"_id":i._id,"amount":i.amount,"itemName":i.itemName,"itemID": i.itemID});
      }
    });
    var sendDis = {"location":$scope.requestform.location,"request": $scope.requestform.request};
    sS.stockdown(sendDis, function(c){
      $scope.requestform.request.length = 0;
      $scope.requestform.requestList.length = 0;
      $('#modal-request-stock-down').modal('hide');
    });
  };
  $scope.removeDrug = function(index){
    $scope.requestform.request.splice(index, 1);
    $scope.requestform.requestList.splice(index, 1);
  };

  $scope.saveButtonClass = 'btn-primary';

  $scope.createPoint = function(){
    $scope.saveButtonText = 'saving';
    $scope.saveButtonClass = 'btn-info';
    sS.saveLocation($scope.location, function(res){
      $scope.saveButtonText = 'SAVED';
      $scope.saveButtonClass= 'btn-success';
      $scope.modalstate = false;
      $scope.locations.push(res);
    });
  };
  $scope.onLocation = function(id){
    sS.showStockDown(id, function(data, response){
      $scope.hasItems = true;
      $scope.stockDownRecord = data;
    });
  };
  $scope.postBp = function(index){
    var __scope = $scope.stockDownRecord[index];
    var id = __scope._id;
    var bp = __scope.boilingPoint;
    var loc = __scope.locationId;
    sS.updateBp(id, bp, loc, function(r){
      
    });
  };
  $scope.locationNameChange = function (new_name, index){
    console.log(new_name);
    var __scope = $scope.locations[index];

    sS.updateLocation(__scope._id, {locationName: new_name}, function(){
      __scope.locationName = new_name;
    });
  };
}])
.factory('stockService',['$http', 'Language', 'Notification', function($http, L, N){
  var i = {};

  //Count items low and all
  i.count =  function(callback){
    $http.get('/api/stock/count').
    success(function(data,status){
      callback(data);
    });
  };

  //Gets all stock down locations and basic information
  i.getPoints = function(type, callback){
    $http.get('/api/stock/location?type='+type).
    success(function(data, status){
      callback(data);
    });
  };

  //Creates a stock down location
  i.saveLocation = function(post,callback){
    $http.post('/api/stock/location',post)
    .success(function(data, status){
      N.notifier({
        message : L.eng.stock.location.create.success,
        type: 'success'
      });      
      callback(data);
    })
    .error(function(data, status){
      N.notifier({
        message : L.eng.stock.location.create.error,
        type: 'error'
      });
    });
  };  

  //Fetches all items / stockdown records for a location
  i.showStockDown = function(location_id, callback){
    $http.get('/api/stock/location/'+location_id)
    .success(callback);
  };

  //sends a stockdown request, 
  i.stockdown = function(list, callback){
    $http.post('/api/stock/stockdown', list)
    .success(function(data, res){
      N.notifier({
        message : L.eng.stock.down.success,
        type: 'success'
      });
      callback(data);
    })
    .error(function(data, res){
      N.notifier({
        message : L.eng.stock.down.error,
        type: 'error'
      });      
    });
  };

  //Stock history for an item by location
  i.stockhistory = function(id, location, cb){
    $http.get('/api/items/'+ id + '/location/'+ location +'/history')
    .success(function(d){
      cb(d);
    })
    .error(function(d){
      N.notifier({
        message: L.eng.items.location.history.fetch.error,
        type: "error"
      });       
    });
  };

  //Sets the boiling point of an item 
  i.updateBp = function(id, bp, location, cb) {
    $http.put('/api/items/'+id+'/location/'+location, {
      bp: bp
    })
    .success(function(d){
      N.notifier({
        message: L.eng.stock.items.boilingPoint.success,
        type: "success"
      });
    })
    .error(function(err){
      console.log(L.eng.stock);
      N.notifier({
        message: L.eng.stock.items.boilingPoint.error,
        type: "error"
      });
    });
  };

  //Requests to update a locations property
  i.updateLocation = function(location_id, props, cb){
    $http.put('/api/stock/location/'+location_id, props)
    .success(function(){
      N.notifier({
        message : L.eng.stock.location.edit.success,
        type: 'success'
      });
      cb();
    })
    .error(function(err){
      N.notifier({
        message : L.eng.stock.location.edit.error,
        type: 'error'
      });      
    });
  };

  return i;

}]);