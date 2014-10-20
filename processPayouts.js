var util = require("util");

var settings = require('./settings')

var coinRPC = require('node-dogecoin')()
		.set('host', settings.rpc.host)
		.auth(settings.rpc.user, process.env.walletPWD);

var dbConn = require('mysql').createPool(settings.database);

function getPayees(callback) {
	dbConn.query('SELECT NOW() AS payTime', [], function(err, rows, fields) {
	  if (err) throw err;
	  var payTime = rows[0].payTime;

	  dbConn.query('SELECT address, referrer, SUM(amount) payAmt FROM transactions WHERE ts < ? GROUP BY address, referrer', [payTime], function(err, rows, fields) {
	  		callback(err, rows.map(function(row) {
	  			return {to: row.address, amt: row.payAmt}
	  		}));
		});
	});
}

function payUsers(users, callback) {
	payString = users.map(function(users) {
		return util.format("%s:%s", row.address row.payAmt);
	});

	coinRPC.sendMany(payString, function(err, info) {
		res.addressValid = !info.isvalid;
		if(!info.isvalid) res.locals.error = "Invalid Dogecoin Address"
		next();
	})
}

function payReferrers() {
	
}

function updateDB() {

}
