var settings = require('../settings');
var util = require('util');
var _ = require('underscore');

module.exports.init = function(req, res, next) {
	req.coinRPC = require('node-dogecoin')()
		.set('host', settings.rpc.host)
		.auth(settings.rpc.user, settings.rpc.password);

	req.dbConn = require('mysql').createPool(_.extend(settings.database, settings.database));;

	next();
};


module.exports.settings = function(req, res, next){
	res.locals.settings = settings;
	res.locals.payoutRange = {min: settings.payout.bracket[0].amt, max: settings.payout.bracket[settings.payout.bracket.length-1].amt};  	

	req.coinRPC.getBalance(function(err, info) {
		getFaucetStats(req, function(err, stats) {
			res.locals.faucetStats = stats;
			res.locals.faucetBalance = info - stats.outstandingPayments;
			next();
		});
	});
};

module.exports.defaults = function(req, res, next){
	res.locals.meta = {
		type: null
		, title: " | BlockChain.com"
		, description: " | BlockChain.com"
	};

  next();
};

function getFaucetStats(req, callback) {
	req.dbConn.query('SELECT SUM(amount) AS outstandingPayments, COUNT(*) AS totalPayments, MAX(ts) AS lastPayment FROM transactions WHERE dispensed is NULL', [], function(err, rows, fields) {
	  callback(err, {
	  	outstandingPayments: rows[0].outstandingPayments,
	  	totalPayments: rows[0].totalPayments,
	  	lastPayment: rows[0].lastPayment
	  });
	});
}
