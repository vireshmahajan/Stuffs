var
    Items = require('./item').Item,
    OrderModel = require('./order').Order,
    OrderStatus = require('./order').OrderStatus,
    Dispense = require('./dispense'),
    Bills = require('./bill').Bill,
    BillRules = require('./bill').BillRule,
    BillingProfile = require('./bill').BillingProfile,
    PointLocation = require('./stock/location-schema'),
    StockHistory = require('./stock/stockhistory-schema'),
    StockCount = require('./stock/stockcount-schema'),
    Transactions = require('./stock/transaction-schema'),
    UserModel = require('./user').UserModel,
    _ = require('lodash'),
    Q = require('q');

function AdminMethods () {

}

AdminMethods.prototype.constructor = AdminMethods;

AdminMethods.prototype.removeAllDispense = function(cb){
  Dispense.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllBills = function(cb){
  Bills.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllBillProfiles = function(cb){
  BillingProfile.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllRules = function(cb){
  BillRules.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllStockHistory = function(cb){
  StockHistory.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllStockCount = function(cb){
  StockCount.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllOrders = function(cb){
  OrderModel.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllOrderStatus = function(cb){
  OrderStatus.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllTransactions = function(cb){
  Transactions.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllItems = function(cb){
  Items.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};
AdminMethods.prototype.removeAllLocations = function(cb){
  PointLocation.remove({}, function(err, n){
    if(err){
      cb(err);
    }else{
      cb(n);
    }
  });
};

AdminMethods.prototype.findOrCreateMainStockLocation = function findOrCreateMainStockLocation (){
  var q = Q.defer();

  //Check for a default location
  PointLocation.findOne({
    locationType: 'default'
  }, function(err, i){
    if (err) {
      return q.reject(err);
    }
    if(i){
      q.resolve(i);
    }else{
      //Create a default loaction
      var pl = new PointLocation();
      pl.locationName =  'Main';
      pl.locationType = 'default';
      pl.locationDescription = 'Main Stock Location';
      pl.save(function(err, i){
        if (err) {
          return q.reject(err);
        }
        q.resolve(i);
      });
    }
  });

  return q.promise;
};

AdminMethods.prototype.fetchUser = function fetchUser (csKey) {
  var q = Q.defer();


    UserModel.findOne({
      consumer_key: csKey
    })
    .exec(function (err, user) {
      if (err) {
        return q.reject(err);
      }
      return q.resolve(user);
    });

  return q.promise;
};


AdminMethods.prototype.updateUserProfile = function updateUserProfile (csKey, user) {
  var q = Q.defer();
  UserModel.update({
    consumer_key : csKey
  }, user,
  {upsert: true},
  function (err, done) {
    if (err) {
      return q.reject(err);
    }
    return q.resolve(done);
  });
  return q.promise;
};

module.exports = AdminMethods;