var express = require('express');
var app = module.exports = express();
var util = require("util");
var url = require('url');

var settings = require(process.env.settingsFile || '../../settings')

var db = require('../../lib/db');
var coinRPC = require('../../lib/coinRPC');

var _ = require('underscore');
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
	coinRPC.validateAddress(req.body.address, function(err, isValid) {
		res.addressValid = isValid;
		res.locals.address = req.body.address;

		res.locals.referralURL = util.format('%s?r=%s', settings.site.url, req.body.address);
		if(!isValid) res.locals.error = "Invalid Dogecoin Address"
		next();
	})
}

function validateFrequency(req, res, next) {
	db.getTimeUntilNextDispence(req.body.address, req.connection.remoteAddress, function(err, row, fields) {
		if(row) res.locals.error = "Too Soon!  Come back in " + rows.remainingTime;
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

	db.dispense(req.body.address, req.connection.remoteAddress, res.locals.dispenseAmt, req.cookies.get('referrer'), function(err, success) {
		res.locals.success = success;

		if(success) {
			db.getUserBalance(req.body.address, function(err, balance) {
				res.locals.userBalance = balance;
				next();
			});
		} else {
			res.locals.error = "Error dispenseing, please try again."
			next()
		}
	});
}


