var settings = require(process.env.settingsFile || '../settings')
	, log = require('./logger');

var coinRPC = require(settings.rpcClient)()
		.set('host', settings.rpc.host)
		.auth(settings.rpc.user, settings.rpc.password);

/**********************************************/
// Faucet
/**********************************************/
exports.getBalance = function(callback) {
	callback = callback || function () {};

	coinRPC.getBalance(function(err, balance) {
		callback(err, balance)
	});
}

exports.validateAddress = function(address, callback) {
	callback = callback || function () {};

	coinRPC.validateaddress(address, function(err, info) {
		callback(err, info.isvalid);
	});
}

/**********************************************/
// Payment processing (untested)
/**********************************************/
exports.sendPayments = function(recipientList, msg, callback) {
	callback = callback || function () {};

	var recipients = recipientList.reduce(function(recipients, recipient) {
		recipients[recipient.to] = recipient.amt;
		return recipients;
	}, {});

	coinRPC.sendMany("", recipients, 1, msg, function(err, txid) {
		callback(err, txid);
	});
}

	

