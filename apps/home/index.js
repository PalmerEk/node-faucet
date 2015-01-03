var path = require('path')
	,	express = require('express')
	, util = require("util")
	, url = require('url');

var app = module.exports = express();
var settings = require(process.env.settingsFile || '../../settings')

var db = require('../../lib/db');
var coinRPC = require('../../lib/coinRPC');

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());
var Recaptcha = require('recaptcha').Recaptcha;

var VIEWS_DIR = path.join(process.cwd(), 'themes', settings.theme.name || 'default', __dirname.split(path.sep)[__dirname.split(path.sep).length - 1]);
app.set('views', VIEWS_DIR);

app.get('/faq', captureReferrer, showFAQ);
app.get('/refer', captureReferrer, showRefer);

app.get('/', captureReferrer, validateFrequency, showFaucet);
app.post('/', validateCaptcha, validateAddress, validateFrequency, dispense, showFaucet);

var day = (24*60*60*1000);
var cookieLife = {maxAge: (day*360), expires: new Date(Date.now() + (day*360))};

function captureReferrer(req, res, next) {
  // If we were referred and we don't already have a referrer, set it. 
  if(req.query.r && settings.payout.referralPct > 0 && _.isUndefined(req.cookies.get('referrer'))) {
  	var referrer = _.s.trim(req.query.r);

  	coinRPC.validateAddress(referrer, function(err, isValid) {
		if(isValid) req.cookies.set('referrer', referrer, cookieLife);
		next();
	})
  } else {
  	next();
  }
}

function showFaucet(req, res, next) {
	var recaptcha = new Recaptcha(settings.recaptcha.key, settings.recaptcha.secret);

	res.render("index", {
		tab: 'Faucet',
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
	res.locals.address = _.s.trim(req.body.address);
	//coinRPC.validateAddress(res.locals.address, function(err, isValid) {
		isValid = true;
		res.addressValid = isValid;

		res.locals.referralURL = util.format('%s?r=%s', settings.site.url, res.locals.address);
		if(isValid) {
			req.cookies.set('lastAddress', res.locals.address, cookieLife);
		} else {
			res.locals.error = "Invalid Dogecoin Address";
		}
		next();
	//})
}

function validateFrequency(req, res, next) {
	db.getTimeUntilNextDispence(res.locals.address, res.locals.ip, function(err, row, fields) {
		if(row) {
			res.locals.error = "Too Soon!  Come back in " + row.remainingTime;
			res.locals.nextDispense = row.nextDispense;
		}
		next();
	});
}

function dispense(req, res, next) {
	if(res.locals.error) return next();

	var bracketOdds = 0;
	res.locals.dispenseAmt = settings.payout.bracket[0].amt;
	res.locals.luckyNumber = Math.random() * 100;
	var payoutModifier = 1;

	if(settings.payout.adblockPenalty && settings.payout.adblockPenalty > 0) {
		if(req.body.adblockdetection === "0") payoutModifier = ((100-settings.payout.adblockPenalty)/100);
	}

	for(x = 0; x < settings.payout.bracket.length; x++) {
		bracketOdds += settings.payout.bracket[x].odds
		if(res.locals.luckyNumber < bracketOdds) {
			res.locals.dispenseAmt = (settings.payout.bracket[x].amt * payoutModifier);
			break;
		}
	}

	return next();
	db.dispense(res.locals.address, res.locals.ip, res.locals.dispenseAmt, req.cookies.get('referrer'), function(err, success) {
		res.locals.success = success;

		if(success) {
			db.getUserBalance(res.locals.address, function(err, balance) {
				res.locals.userBalance = balance;
				next();
			});
		} else {
			res.locals.error = "Error dispenseing, please try again."
			next()
		}
	});
}


