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

app.get('/faq', captureReferrer, showFAQ);
app.get('/refer', captureReferrer, showRefer);

app.get('/', captureReferrer, showFaucet);
app.post('/', validateCaptcha, validateAddress, validateFrequency, dispense, showFaucet);

var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

function captureReferrer(req, res, next) {
	// If we were referred and we don't already have a referrer, set it. 
  if(req.query.r && settings.payout.referralPct > 0 && _.isUndefined(req.cookies.get('referrer'))) req.cookies.set('referrer', req.query.r, cookieLife);
  next();
}

function showFaucet(req, res, next) {
	var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("index", {
		recaptcha_form: recaptcha.toHTML()
	});
}

function showFAQ(req, res, next) {
	var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("faq", {
		tab: 'FAQ'
	});
}

function showRefer(req, res, next) {
	var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("refer", {
		tab: 'Refer',
		referralURL: util.format('%s?r=', settings.site.url),
		address: _.isUndefined(req.cookies.get('lastAddress')) ? '' : req.cookies.get('lastAddress')
	});
}

function validateCaptcha(req, res, next) {
	var data = {
        remoteip:  res.locals.ip,
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
		if(isValid) {
			req.cookies.set('lastAddress', req.body.address, cookieLife);
		} else {
			res.locals.error = "Invalid Dogecoin Address";
		}
		next();
	})
}

function validateFrequency(req, res, next) {
	db.getTimeUntilNextDispence(req.body.address, res.locals.ip, function(err, row, fields) {
		if(row) res.locals.error = "Too Soon!  Come back in " + row.remainingTime;
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

	db.dispense(req.body.address, res.locals.ip, res.locals.dispenseAmt, req.cookies.get('referrer'), function(err, success) {
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


