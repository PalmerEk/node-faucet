var util = require("util");

var settings = require(process.env.settingsFile || './settings')

var db = require('./lib/db');
var coinRPC = require('./lib/coinRPC');


(function processPayments() {
	console.log('Processing Payments');

	db.getPayoutWindow(function(err, lastPayTime) {

		db.getPayees(lastPayTime, function(err, payees) {

			db.getReferrers(settings.payout.referralPct, lastPayTime, function(err, referrers) {

				coinRPC.sendPayments(payees, 'Thanks for using ' + settings.site.name, function(err, txid) {
					if(err) {
						console.log('Error sending payments: ' + err);
						process.exit();
					} else {
						db.logPayments(txid, lastPayTime, function(err) {
							console.log('Paid out: ' + util.inspect(payees, false, 5, true))
							console.log('txid: ' + txid)

							coinRPC.sendPayments(referrers, 'Thanks for referring your friends to ' + settings.site.name, function(err, txid) {
								if(err) {
									console.log('Error sending referrer payments: ' + err);
									process.exit();
								} else {
									db.logReferralPayments(txid, lastPayTime, function(err) {
										console.log('Paid out Referals: ' + util.inspect(referrers, false, 5, true));
										console.log('txid: ' + txid)

										process.exit();
									})
								}
							})
						})
					}
				})
			})
		})
	});
})();