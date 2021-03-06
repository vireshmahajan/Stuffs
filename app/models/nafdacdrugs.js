/**
 * Module dependencies.
 */
var db = require("../../lib/db.js");
var mongoose = require('mongoose'),
  env = process.env.NODE_ENV || 'development',
  config = require('../../config/config')[env],
  Schema = mongoose.Schema;


var NafdacdrugSchema = new Schema ({
  productName : {type: String, default: '', required: true},
  composition : {type: String, default: '', required: true},
  regNo : {type: String, default: '', required: true},
  man_imp_supp : {type: String, default: ''},
  mis_address : {type: String, default: '', required: true},
  mis_regDate : {type: String, default: '', required: true},
  mis_expDate : {type: String, default: '', required: true},
  category : {type: String, default: '', required: true},
  onlineId: {type: Schema.ObjectId},
  currentPrice:{type: Number},
  lastUpdated: {type: Date}
});

NafdacdrugSchema.statics = {
  /**
  * Auto Complete
  * @param {regex} itemName
  * @param {function} cb
  * @api private
  */
  autocomplete: function(name, cb){
    var wit = this.find({}).limit(20);
    wit.regex('productName',new RegExp(name, 'i')).exec(cb);
    //wit.exec(cb);
  }
};


mongoose.model('nafdacdrug', NafdacdrugSchema);
module.exports = mongoose.model('nafdacdrug');
