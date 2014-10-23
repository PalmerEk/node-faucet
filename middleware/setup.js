var settings = require(process.env.settingsFile || '../settings');
var util = require('util');
var _ = require('underscore');

var db = require('../lib/db');
var coinRPC = require('../lib/coinRPC');

module.exports.settings = function(req, res, next){
	res.locals.settings = settings;
	res.locals.payoutRange = {min: settings.payout.bracket[0].amt, max: settings.payout.bracket[settings.payout.bracket.length-1].amt};  	

	res.locals.address = _.isUndefined(req.cookies.get('lastAddress')) ? '' : req.cookies.get('lastAddress')

	coinRPC.getBalance(function(err, balance) {
		db.getFaucetStats(function(err, stats) {
			res.locals.faucetStats = stats || {outstandingPayments: 0};
			res.locals.faucetBalance = balance - stats.outstandingPayments;
			next();
		});
	});
};

module.exports.defaults = function(req, res, next){
	res.locals.meta = {
		title: settings.site.name
		, description: settings.site.name
	};

  next();
};
