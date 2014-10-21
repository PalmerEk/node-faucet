var util = require("util");

var settings = require('./settings')

var coinRPC = require('node-dogecoin')()
		.set('host', settings.rpc.host)
		.auth(settings.rpc.user, settings.rpc.password);

var dbConn = require('mysql').createPool(settings.database);

function getPayoutWindow(callback) {
	dbConn.query('SELECT NOW() AS payTime', [], function(err, rows, fields) {
	  if (err) throw err;
	  callback(err, rows[0].payTime);
	});
}

function getPayees(lastPayTime, callback) {
  	dbConn.query('SELECT address, SUM(amount) payAmt FROM transactions WHERE ts < ? AND dispensed IS NULL GROUP BY address', [lastPayTime], function(err, rows, fields) {
  		callback(err, rows.map(function(row) {
  			return {to: row.address, amt: row.payAmt}
  		}));
	});
}

function getReferrers(lastPayTime, callback) {
  	dbConn.query('SELECT referrer, (SUM(amount) * ?) AS payAmt FROM transactions WHERE ts < ? AND dispensed IS NULL AND referrer IS NOT NULL GROUP BY referrer', [settings.payout.referralPct, lastPayTime], function(err, rows, fields) {
  		callback(err, rows.map(function(row) {
  			return {to: row.referrer, amt: row.payAmt}
  		}));
	});
}

function sendPayments(users, callback) {
	var recipients = users.reduce(function(o, user) {
		o[user.to] = user.amt;
		return o;
	}, {});

	coinRPC.sendMany("", recipients, 1, 'Thanks for using doge.bloquechain.com', function(err, txid) {
		if(err) return callback(err);

		console.log("txid: " + txid + "\n" + recipients);
		callback(err, txid);
	})
}

function updateDB(lastPayTime, callback) {
	dbConn.query('UPDATE transactions SET dispensed = NOW() WHERE ts < ? AND dispensed IS NULL', [lastPayTime], callback);
}


(function processPayments() {
	console.log('Processing Payments');

	getPayoutWindow(function(err, lastPayTime) {
		getPayees(lastPayTime, function(err, payees) {
			getReferrers(lastPayTime, function(err, referrers) {
				sendPayments(payees, function(err) {
					sendPayments(referrers, function(err) {
						updateDB(lastPayTime, function(err) {
							console.log("done");
							process.exit();
						})
					})
				})
			})
		})
	});
})();