var mongoose = require('mongoose'),
    Item = mongoose.model('Item'),
    ItemCategory = mongoose.model('ItemCategory'),
    ItemForm = mongoose.model('ItemForm'),
    ItemPackaging = mongoose.model('ItemPackaging'),
    Order = mongoose.model('Order'),
    OrderStatus = mongoose.model('OrderStatus'),
    Dispense = mongoose.model('Dispense'),
    Bill = mongoose.model('Bill'),
    PointLocation = mongoose.model('Location'),
    StockHistory = mongoose.model('StockHistory'),
    StockCount = mongoose.model('StockCount'),
    Stock = require('./stock').manager,
    _ = require("underscore"),
    NafdacDrugs = mongoose.model("nafdacdrug"),
    EventRegister = require('../../lib/event_register').register,
    nconf = require('nconf'),
    P = require('../../lib/promisify'),
    Q = require('q'),
    cors = require('../../config/middlewares/cors'),
    util = require("util");
/**
 * Module dependencies.
 */




function sortItems (list,justkeys){
  var k = {}, l=[];
  list.forEach(function(ele,index,array){
    var fchar = ele.itemName.split("");
    l.push(fchar[0].toUpperCase());
  });
  if(justkeys){
    return l;
  }else{
    //o.push(k);
    return list;
  }
}


function ItemsObject(){

}


ItemsObject.prototype.constructor = ItemsObject;

/**
 * Creates a new drug item or medical equipment.
 * It also checks if an invoice number is present in
 * the request. If an invoice number is found, a new 
 * order is placed, set to supplied, here by increasing
 * the stock amount to the amount sent with the invoice
 * number. 
 * 
 * @param  {[type]}   itemBody [description]
 * @param  {Function} cb [description]
 * @return {[type]}            [description]
 */
ItemsObject.prototype.create = function (itemBody, cb) {
  var register = new EventRegister(), 
    stockHistory = new StockHistory(),
    hasOrder = false, 
    itemObject = null,
    result = null;


  register.once('checksort', function(data, isDone){
    // return;
    if(data.item.length === 0){
      return isDone(new Error('Empty Request Item'));
    }
    //copy the item category property into a variable
    var shark = data.item.itemCategory;

    //omit the itemCategory property
    var joel = _.omit(data.item, "itemCategory");

    itemObject = new Item(joel);

    if(shark){
      _.each(shark, function(v,i){
        itemObject.itemCategory.push(v._id);
      });
    }

    isDone(data);
  });

  register.once('getMainLocation', function(data, isDone){
    //Skip to the next is hasOrder is false;
    //if(!hasOrder) return isDone(data);    
    PointLocation.findOne({locationType: 'default'}, 
      function(err, i){
        if(err){
          isDone(err);
        }else{
          data.location = {
            id: i._id,
            name: i.locationName
          };
          isDone(data);
        }
      });
  });

  //This registers this new item as an order which has been supplied 
  //if the invoice data is available 
  register.once('checkInvoice', function(data, isDone){
    if(data.item.orderInvoiceData !== undefined){
      hasOrder = true;

      //Creates a new order.
      var order = new Order();

      //Push the itemName and Item ObjectId into the itemData array
      //on the order object.
      order.itemData.push({itemName: data.item.itemName, id: data.item.id});

      order.orderSupplier = (data.item.suppliers);
      order.orderInvoice = data.item.orderInvoiceData.orderInvoiceNumber;
      order.orderStatus = 'supplied'            ;
      order.orderType = data.item.itemType;
      order.orderAmount= data.item.orderInvoiceData.orderInvoiceAmount;
      order.amountSupplied= data.item.orderInvoiceData.orderInvoiceAmount;
      order.orderDate= data.item.orderInvoiceDate;
      order.save(function(err, i){
        if(util.isError(err)){
          isDone(err);
        }else{
          data.order = i;
          isDone(data);
        }
      });      
    }else{
      isDone(data);
    }
  });

  register.once('saveItem', function(data, isDone){
    itemObject.save(function (err, i) {
      if (!err) {
        result = {
          _id: i._id,
          itemName: i.itemName,
          itemCategory: i.itemCategory,
          //Saving this on the stockcount collection
          itemBoilingPoint: data.item.itemBoilingPoint
        };

        data.item.id = i._id;
        isDone(data);

      }else{
        isDone(err);
      }
    });
  });

  register.once('stockCountpre', function(data, isDone){
    //Skip to the next is hasOrder is false;
    if(!hasOrder) return isDone(data);
    // Check if this record has been created for this order using the orderid and the reference field 
    // on the StockHistoryShema
    StockCount.count({'reference': 'create-'+data.order._id}, function(err, count){
      if(count > 0){
        isDone(new Error('Invalid Order::old'));
      }else{
        isDone(data);
      }
    });    
  });

  register.once('stockHistory', function(data, isDone){
    //Skip to the next if hasOrder is false;
    if(!hasOrder) return isDone(data);  
    var itemObj = {
      id: data.item.id,
      amount: data.item.orderInvoiceData.orderInvoiceAmount
    };

    var options = {
      action: 'Stock Up',
      reference: 'create-'+data.order._id
    };    

    //Create a stock history record.
    stockHistory.log(itemObj, data.location, options ,function(g){
      data.stock = g;
      isDone(data);
    });    
  });

  register.once('stockCountpost', function(data, isDone){
    // Creates a stock count for the item 
    // This event stage is very important cause it 
    // saves the boiling point on  the stock 
    // count collection.
    var stockcount = new StockCount(data.stock);
    stockcount.itemBoilingPoint = data.item.itemBoilingPoint;
    stockcount.item = data.item.id;
    stockcount.locationId = data.location.id;
    stockcount.locationName = data.location.name;
    stockcount.save(function(err, i){
      if(err){
        isDone(err);
      }else{
        isDone(data);
      }
    });
  });


  register.once('statusUpdate', function(data, isDone){
    //Skip to the next if hasOrder is false;
    if(!hasOrder) return isDone(data);    

    //Updates the order statuses, these are useful for order history
    //queries, etc.
    //Creates a new record to show when this order was
    //updated and what action was taken.
    var orderstatus = new OrderStatus();
    orderstatus.status = 'Supplied';
    orderstatus.order_id = data.order._id;
    orderstatus.save(function(err){
      if(err){
        isDone(err);
      }else{
        isDone(true);
      }
    });
  });

  register
  .queue('checksort', 'saveItem', 'checkInvoice', 'getMainLocation', 'stockCountpre', 'stockHistory', 'stockCountpost', 'statusUpdate')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(err){
    cb(result);
  })
  .start(itemBody);
};



/**
 * List
 */

ItemsObject.prototype.list = function(req, res){

  var options = {
    "fields": "itemName itemCategory itemBoilingPoint"
  };
  Item.list(options, function(err, r) {
    if (err) return res.json('500',{"mssg": 'Darn Fault!!!'});
    /**
     * Gets the current stock for all items in the inventory
     */
    var listofItems = [];
    var x = r.length;
    //msc means main stock count, #humorMe
    function mscProcess(){
      if(x === 0){
        return res.json(200, {});
      }
      var _item = r.pop();

      StockCount.mainStockCount(_item._id, function(stock){
        var it = {
          _id: _item._id,
          itemName: _item.itemName,
          itemBoilingPoint: stock.itemBoilingPoint,
          itemCategory: _item.itemCategory,
          currentStock: (stock === null)? 0 : stock.amount,
        };
        listofItems.push(it);

        if(--x){
          mscProcess();
        }else{
          res.json(200, listofItems);
        }
      });
    }

    mscProcess();

  });
};


/**
 * [listOne Does a summary thingy fetch]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
ItemsObject.prototype.listOne = function(item, option, location, cb){
  var register = new EventRegister();

  register.once('findItem', function(data, isDone){
    var options = {criteria: {}, fields: {}};
    var it ={};
    var reg = /^[0-9a-fA-F]{24}$/;
    if(item){
      if(reg.test(item)){
        options.criteria = {"_id": item};
      }else{
        options.criteria = {"itemName": item};
      }
      if(option == 'quick'){
        //options.fields = " _id itemID itemName sciName manufacturerName itemSupplier.supplierName itemPurchaseRate itemBoilingPoint";
        options.fields = "";
      }
      Item.listOne(options, function(err, r){
        //console.log(itemsResult);
        if (err) return isDone(err);
        data = r.toJSON();
        isDone(data);
      });
    }    
  });
  register.once('findStock', function(data, isDone){
        /**
         * Get the current stock and last order date and 
         * add it to the object.
         * Since dispensing is carried out from a stockdown location,
         * we pass in the location object when fetching stock amount
         */
        if(location === 'main' || location === 'Main'){
          //Get Stock count by name
          StockCount.getStockAmountbyName(data._id,{name: 'Main'} ,function(stock){
            // it = {
            //   _id: r._id,
            //   itemID: r.itemID,
            //   itemName: r.itemName,
            //   sciName: r.sciName,
            //   manufacturerName: r.manufacturerName,
            //   itemPurchaseRate: r.itemPurchaseRate,
            //   itemBoilingPoint: r.itemBoilingPoint,
            //   itemForm: r.itemForm,
            //   itemPackaging: r.itemPackaging,
            //   packageSize: r.packageSize,
            //   suppliers : r.suppliers,
            //   currentStock: (stock === null)? 0 : stock.amount,
            //   lastSupplyDate: (stock === null)? '' : stock.lastOrderDate,
            //   nafdacId: r.nafdacId,
            //   nafdacRegNo: r.nafdacRegNo
            // };
            // res.json(200, it);
            data.currentStock =  (stock === null)? 0 : stock.amount;
            data.lastSupplyDate =  (stock === null)? '' : stock.lastOrderDate;            
            isDone(data);
          });
        }else{
          //Get stock count by location id
          StockCount.getStockAmountbyId(data._id,{id: location} ,function(stock){
            console.log(stock);
            data.currentStock =  (stock === null)? 0 : stock.amount;
            data.lastSupplyDate =  (stock === null)? '' : stock.lastOrderDate;

            isDone(data);
          });
        }
  });

  register.on('itemCosts', function(data, isDone){
    Order.find({"itemData.id": data._id, 
      $or:[
        {"orderStatus": "supplied"},
        {"orderStatus": "paid"},
        {"orderStatus": "complete"},
    ]}, 'orderPrice')
    .sort({'orderDate': 1})
    .limit(3)
    .exec(function(err, i){
      if(err){
        isDone(err);
      }else{
        data.orderPrice = (function(){
          var k =  _.map(i, function(v){
            return v.orderPrice;
          });
          k.sort(function(a, b){
            return b-a;
          });
          return k;
        }());
        isDone(data);
      }
    });

  });


  register
  .queue('findItem', 'findStock', 'itemCosts')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(r){
    cb(r);
  })
  .start();
};

/**
 * [typeahead description]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
ItemsObject.prototype.typeahead = function(req, res){
  var term = req.param('term');
  var needle = req.param('needle');
  //options.criteria[term] = '/'+needle+'/i';
  Item.autocomplete(needle, function(err,itemsResult){
    if (err) return res.render('500');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");    
    res.json(itemsResult);
  });
};


/**
 * [nafdacTypeAhead description]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
ItemsObject.prototype.nafdacTypeAhead = function(req, res){
  var needle = req.param('needle');
  //options.criteria[term] = '/'+needle+'/i';
  NafdacDrugs.autocomplete(needle, function(err,itemsResult){
    if (err) return res.render('500');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");    
    res.json(itemsResult);
  });
};


/**
 * [updateItem description]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
ItemsObject.prototype.updateItem = function(itemId, body, cb){
  var register = new EventRegister();

  register.once('updateItem', function(data, isDone){
    var category = [];
    
    _.each(data.itemCategory, function(v){
      category.push(v._id);
    });

    var o = _.omit(data, ["_id", "itemID", "itemCategory"]);

    o.itemCategory = category;

    Item.update({_id: itemId}, {
      $set: o
    }, function(err, i){
      if(err){
        isDone(err);
      }else{
        isDone(data);
      }
    });
  });

  register.once('updateBP', function(data, isDone){
    //TODO:
    //Update BP code here
    var stock = new Stock();
    stock.updateBp(itemId, data.itemBoilingPoint, nconf.get("app:main_stock_id"), function(r){
      isDone(data);
    });
    
  });

  register
  .queue('updateItem', 'updateBP')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(i){
    cb(i);
  })
  .start(body);

};


ItemsObject.prototype.updateByReg = function(upd){
  _.each(upd, function(v, i){
    Item.update({nafdacRegNo: v.product_id.regNo}, {
      itemPurchaseRate: v.price
    }, function(err){
      if(err) util.puts(err);
    })
  });
}



/**
 * [itemFields used for querying an item document e.g. when editing / updating an item]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
ItemsObject.prototype.itemFields = function (itemId, body, cb){
  var register = new EventRegister();

  register.once('checknSave', function(data, isDone){
    var options = {criteria: {}, fields: {}};    
    var reg = /^[0-9a-fA-F]{24}$/;
    if(itemId.length > 0){
      if(reg.test(itemId)){
        options.criteria = {"_id": itemId};
      }else{
        options.criteria = {"itemName": itemId};
      }

      Item.listOne(options, function(err, r){
        if (err){
          isDone(err);
        }else{
          isDone(r.toJSON());
        } 
      });
    }
  });

  register.once('getBP', function(data, isDone){
    StockCount.findOne({
      item: data._id,
      locationId: nconf.get("app:main_stock_id")
    }, function(err, i){
      if(err){
        isDone(err);
      }else if (i) {
        data.itemBoilingPoint = i.itemBoilingPoint;
        isDone(data);
      }else{
        data.itemBoilingPoint = 0;
        isDone(data);        
      }
    });    
  });

  register
  .queue('checknSave', 'getBP')
  .onError(function(err){
    cb(err);
  })
  .onEnd(function(r){
    cb(r);
  })
  .start({});
};

/**
 * [deleteItem description]
 * @param  {Integer}   itemId   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
ItemsObject.prototype.deleteItem = function(itemId, callback){
  var register = new EventRegister();
  Item.remove({_id: itemId}, function(err, i){
    if(util.isError(err)){
      callback(err);
      return;
    }
    callback(i);
  });

};

/**
 * [addCategory Adds a new category for items]
 * @param {[type]}   name     [description]
 * @param {[type]}   parent   [description]
 * @param {Function} callback [description]
 */
ItemsObject.prototype.addCategory = function(name, parent, callback){
  if(name.length === 0 ){
    return callback(new Error('Empty name'));
  }
  if(parent.length === 0){
    parent = undefined;
  }
  var ic = new ItemCategory();
  ic.create(name, parent, function(r){
    callback(r);
  });
};

/**
 * [listCategory list out all saved categories]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
ItemsObject.prototype.listCategory = function(callback){
  return ItemCategory.list(function(i){
    callback(i);
  });
};


/**
 * [delCat description]
 * @param  {[type]}   cat_id [description]
 * @param  {Function} cb     [description]
 * @return {[type]}          [description]
 */
ItemsObject.prototype.delCat = function(cat_id, cb){
  ItemCategory.remove({_id: cat_id, categoryType: 'user'}, function(err, i){
    if(err) return cb(err);
    cb(i);
  });
}

/**
 * [addForm Adds an item form ]
 * @param {[type]}   name     [description]
 * @param {Function} callback [description]
 */
ItemsObject.prototype.addForm = function(name, callback){
  if(name.length === 0 ){
    return callback(new Error('Empty name'));
  }
  var ic = new ItemForm();
  ic.create(name, function(r){
    console.log(r);
    callback(r);
  }); 
};

/**
 * [listForm List all item forms]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
ItemsObject.prototype.listForm = function(callback){
  return ItemForm.list(function(i){
    callback(i);
  });
};


ItemsObject.prototype.listPackaging = function(callback){
  return ItemPackaging.list(function(i){
    callback(i);
  });
};

ItemsObject.prototype.addPackaging = function(name, callback){
  if(name.length === 0 ){
    return callback(new Error('Empty name'));
  }

  var ic = new ItemPackaging();
  ic.create(name, function(r){
    callback(r);
  });  
};

ItemsObject.prototype.fetchByRegNo = function(query, cb){
  console.log(query);
  NafdacDrugs.findOne({
    regNo: query
  }, function(err, i){
    if(err){
      cb(err);
    }else{
      cb(i);
    }
  });
};




module.exports.item = ItemsObject;

var item = new ItemsObject();

module.exports.routes = function(app){

  app.get('/items', function(req, res){
      res.render('index',{
        title: 'All Items'
      });
  });
  app.get('/items/index', function(req, res){
      res.render('items/index');
  });

  app.get('/items/view/low', function(req, res){
    res.render('index');
  });


  //Item routes   
  app.get('/items/add',function(req,res){
    res.render('index', {
      title: 'New Inventory Item',
    });
  });
  app.get('/items/:itemId/edit',function(req,res){
    res.render('index', {
      title: 'Update Item',
    });
  });

  /**
  *Items Routes
  */
  //List all Items 
  app.get('/api/items/listAll', item.list);

  //app.get('/api/items/listOne/:id/:option',listOne);

  //Fetches data on an item, either full or summary by location
  app.get('/api/items/:id/options/:option/locations/:locationId', cors, function(req, res, next){
    var option = req.params.option, itemId = req.params.id, location = req.params.locationId;
    item.listOne(itemId, option, location, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Fetches data for an item when editing
  app.get('/api/items/:item_id/edit', function(req, res, next){
    var body = req.body;
    var itemId = req.params.item_id;
    item.itemFields(itemId, body, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  //Updates an Item
  //TODO: change to put verb
  app.post('/api/items/:id/edit', function(req, res, next){
    var itemId = req.params.id;
    var body = req.body;
    item.updateItem(itemId, body, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, true);
      }
    });
  });

  //Typeahead Route
  app.get('/api/items/typeahead/term/:term/query/:needle',item.typeahead);

  //Nafdac Typeahead Route
  app.get('/api/nafdacdrugs/typeahead/needle/:needle',item.nafdacTypeAhead);

  //NAFDAC Fetch item by Registeration Number
  app.get('/api/nafdacdrugs/typeahead', function(req, res, next){
    item.fetchByRegNo(req.query.q, function(r){
      if(util.isError(r)){
        next(r);
      }else if(_.isEmpty(r)){
        res.json(400, false);
      }else{
        res.json(200, r);
      }
    });
  });

  //Create a new Item 
  app.post('/api/items',function(req,res){
    item.create(req.body, function(result){
      if(result === 400){
        res.json(400,{"message": "Invalid Order"});
      }else if(result === 200){
        res.json(200, {"task": true});
      }else if(typeof(result) ==  'object'){
        res.json(200, {"task": true});
      }
    });
  });


  //Delete Item
  app.del('/api/items/:itemId', function(req, res){
    item.deleteItem(req.param('itemId'), function(i){
      res.json(200, {state: i});
    });
  });

  //Item Category Routes.///
  app.post('/api/items/category', function(req, res, next){
    item.addCategory(req.body.name, req.body.parent, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  app.get('/api/items/category', function(req, res, next){
    item.listCategory(function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }      
    });
  });

  app.del('/api/items/category/:categoryId', function(req, res, next){
    var catId = req.params.categoryId;
    item.delCat(catId, function(i){
      if(util.isError(i)){
        next(i);
      }else{
        res.json(200, true);
      }       
    });
  });
  //Item Form Routes.///
  app.post('/api/items/form', function(req, res, next){
    item.addForm(req.body.name, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  app.get('/api/items/form', function(req, res, next){
    item.listForm(function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }      
    });
  });

  app.del('/api/items/category/:form_id', function(req, res, next){
    var catId = req.params.form_id;
    item.removeForm(catId, function(i){
      if(util.isError(i)){
        next(i);
      }else{
        res.json(200, true);
      }       
    });
  });
  //Item Packaging Routes.///
  app.post('/api/items/packaging', function(req, res, next){
    item.addPackaging(req.body.name, function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }
    });
  });

  app.get('/api/items/packaging', function(req, res, next){
    item.listPackaging(function(r){
      if(util.isError(r)){
        next(r);
      }else{
        res.json(200, r);
      }      
    });
  });

  app.del('/api/items/category/:package_id', function(req, res, next){
    var catId = req.params.package_id;
    item.removePackage(catId, function(i){
      if(util.isError(i)){
        next(i);
      }else{
        res.json(200, true);
      }       
    });
  });
};

