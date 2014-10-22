var express = require('express');
var app = module.exports = express();
var util = require("util");
var url = require('url');

var settings = require(process.env.settingsFile || '../../settings')

var Recaptcha = require('recaptcha').Recaptcha;

app.set('views', __dirname);

app.get('/', captureReferrer, showFaucet);
app.post('/', validateCaptcha, validateAddress, validateFrequency, dispense, showFaucet);

function captureReferrer(req, res, next) {
	var day = (24*60*60*1000);

    if(req.query.r && settings.payout.referralPct > 0) req.cookies.set('referrer', req.query.r, {maxAge: (day*360), expires: new Date(Date.now() + (day*360))});
    next();
}

function showFaucet(req, res, next) {
	var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("index", {
		recaptcha_form: recaptcha.toHTML()
	});
}

function validateCaptcha(req, res, next) {
	var data = {
        remoteip:  req.connection.remoteAddress,
        challenge: req.body.recaptcha_challenge_field,
        response:  req.body.recaptcha_response_field
    };

    var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret, data);

    recaptcha.verify(function(success, err) {
    	res.captchaPassed = success;
    	if(!success) res.locals.error = "Captcha Invalid.  Please Try Again!"
    	next();
    });
}

function validateAddress(req, res, next) {
	req.coinRPC.validateaddress(req.body.address, function(err, info) {
		res.addressValid = !info.isvalid;
		res.locals.address = req.body.address;

		res.locals.referralURL = util.format('%s?r=%s', 'http://doge.bloquechain.com', req.body.address);
		if(!info.isvalid) res.locals.error = "Invalid Dogecoin Address"
		next();
	})
}

function validateFrequency(req, res, next) {
	req.dbConn.query('SELECT TIMEDIFF(DATE_ADD(ts, INTERVAL ? MINUTE), NOW()) AS remainingTime FROM transactions WHERE (address=? OR ip=?) AND ts > DATE_SUB(NOW(), INTERVAL ? MINUTE);', 
		[settings.payout.frequency, req.body.address, req.connection.remoteAddress, settings.payout.frequency], function(err, rows, fields) {
	  if (err) throw err;

	  res.addressValid = rows.length === 0;
	  if(rows.length > 0) res.locals.error = "Too Soon!  Come back in " + rows[0].remainingTime;
	  next();
	});
}

function dispense(req, res, next) {
	if(res.locals.error) return next();

	var bracketOdds = 0;
	res.locals.dispenseAmt = settings.payout.bracket[0].amt;
	res.locals.luckyNumber = Math.random() * 100;

	for(x = 0; x < settings.payout.bracket.length; x++) {
		bracketOdds += settings.payout.bracket[x].odds
		if(res.locals.luckyNumber < bracketOdds) {
			res.locals.dispenseAmt = settings.payout.bracket[x].amt;
			break;
		}
	}

	req.dbConn.query('INSERT INTO transactions (address, ip, amount, referrer) VALUES (?,?,?,?)', 
		[req.body.address, req.connection.remoteAddress, res.locals.dispenseAmt, req.cookies.get('referrer'), false], function(err, result) {
	  	if (err) throw err;

	  	if(result.affectedRows === 1) {
		  res.locals.success = true;
		  checkUserBalance(req, function(err, balance) {
		  	res.locals.userBalance = balance;
		  	next();
		  })
		} else {
			res.locals.error = "Error dispenseing, please try again."
			next()
		}
	});
}

function checkUserBalance(req, callback) {
	req.dbConn.query('SELECT SUM(amount) AS userBalance FROM transactions WHERE dispensed is NULL AND address=?', [req.body.address], function(err, rows, fields) {
	  callback(err, rows[0].userBalance);
	});
}
