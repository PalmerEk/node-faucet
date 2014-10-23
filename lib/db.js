var settings = require(process.env.settingsFile || '../settings')
	, log = require('./logger');

var util = require('util');
var path = require('path');
var _ = require('underscore');

var mysql = require('mysql');
var pool  = mysql.createPool(settings.database);

/**********************************************/
// Helpers
/**********************************************/
function firstOrNull (list) {
  return (list && list.length > 0) ? list[0] : null
}

function firstOrEmpty(list) {
  return (list && list.length > 0) ? list[0] : {}
}

// any and all database queries should pass through here
function query(sql, params, callback) {
	if ('function' == typeof params) { callback = params, params = []; }
	callback = callback || function () {};

	pool.getConnection(function(err, oConn) {
	  oConn.query( sql, params, function(err, results, fields) {
	  	if (err) {
			log.error("query: " + util.inspect(err, false, 5, true));
			log.error(util.format("SQL: %s\nPARAMS: %s", sql, util.inspect(params, false, 5, true)));
		}

	    callback(err, results, fields);
	    oConn.release();
	  });
	});
}

/**********************************************/
// Faucet
/**********************************************/
exports.getFaucetStats = function(callback) {
	callback = callback || function () {};

	var sql = "SELECT SUM(amount) AS outstandingPayments, COUNT(*) AS totalPayments, MAX(ts) AS lastPayment \
				FROM transactions \
				WHERE dispensed is NULL";

	var parms = [];

	query(sql, parms, function getFaucetStats_CB(err, rows, fields) {
		return callback(err, _.defaults(firstOrEmpty(rows), {outstandingPayments: 0, totalPayments: 0, lastPayment: 0}));
	});
}

exports.getTimeUntilNextDispence = function(address, ip, callback) {
	callback = callback || function () {};

	var sql = "SELECT TIMEDIFF(DATE_ADD(ts, INTERVAL ? MINUTE), NOW()) AS remainingTime \
				FROM transactions \
				WHERE (address=? OR ip=?) AND ts > DATE_SUB(NOW(), INTERVAL ? MINUTE)";

	var parms = [settings.payout.frequency, address, ip, settings.payout.frequency];

	query(sql, parms, function getTimeUntilNextDispence_CB(err, rows, fields) {
		return callback(err, firstOrNull(rows));
	});
}

exports.getUserBalance = function(address, callback) {
	callback = callback || function () {};

	var sql = "SELECT SUM(amount) AS userBalance \
				FROM transactions \
				WHERE dispensed is NULL \
				AND address=?";

	var parms = [address];

	query(sql, parms, function getUserBalance_CB(err, rows, fields) {
		return callback(err, _.defaults(firstOrNull(rows), {userBalance: 0}).userBalance);
	});
}

exports.dispense = function(address, ip, amt, referrer, callback) {
	callback = callback || function () {};

	var sql = "INSERT INTO transactions \
				(address, ip, amount, referrer) \
				VALUES (?,?,?,?)";

	var parms = [address, ip, amt, referrer];

	query(sql, parms, function dispense_CB(err, result) {
		return callback(err, result.affectedRows);
	});
}

// TODO: Write query to get total won, total paid, unpaid balance, total dispenses, # referals, total referal, total unpaid referal etc...
exports.getUserStats = function(address, callback) {
	callback = callback || function () {};

	var sql = "SELECT SUM(amount) AS userBalance \
				FROM transactions \
				WHERE dispensed is NULL \
				AND address=?";

	var parms = [];

	query(sql, parms, function getUserStats_CB(err, rows, fields) {
		return callback(err, _.defaults(firstOrNull(rows), {userBalance: 0}).userBalance);
	});
}

/**********************************************/
// Payment processing (untested)
/**********************************************/
exports.getPayoutWindow = function(callback) {
	callback = callback || function () {};

	var sql = "SELECT NOW() AS payTime";

	var parms = [];

	query(sql, parms, function getPayoutWindow_CB(err, rows, fields) {
		return callback(err, firstOrDefault(rows));
	});
}

exports.getPayees = function(lastPayTime, callback) {
	callback = callback || function () {};

	var sql = "SELECT address, SUM(amount) payAmt \
				FROM transactions \
				WHERE ts < ? \
				AND dispensed IS NULL \
				GROUP BY address";

	var parms = [lastPayTime];

	query(sql, parms, function getPayees_CB(err, rows, fields) {
		return callback(err, rows.map(function(row) {
  					return {to: row.address, amt: row.payAmt}
  				})
		);
	});
}

exports.getReferrers = function(referralPct, lastPayTime, callback) {
	callback = callback || function () {};

	var sql = "SELECT referrer, (SUM(amount) * ?) AS payAmt \
				FROM transactions \
				WHERE ts < ? \
				AND dispensed IS NULL \
				AND referrer IS NOT NULL \
				GROUP BY referrer";

	var parms = [(referralPct/100), lastPayTime];

	query(sql, parms, function getReferrers_CB(err, rows, fields) {
		return callback(err, rows.map(function(row) {
  					return {to: row.referrer, amt: row.payAmt}
  				})
		);
	});
}

// TODO: Change dispensed to varchar and log transaction id instead
exports.logPayments = function(lastPayTime, callback) {
	callback = callback || function () {};

	var sql = "UPDATE transactions \
				SET dispensed = NOW() \
				WHERE ts < ? \
				AND dispensed IS NULL";

	var parms = [lastPayTime];

	query(sql, parms, function getReferrers_CB(err, result) {
		return callback(err, result);
	});
}

