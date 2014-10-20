var express = require('express');
var app = module.exports = express();

app.set('views', __dirname);

var util = require('util');
var log = require('../../lib/logger');

//////////////////////////////////////////////////////////////////////////
// Error (Response) Handling
//////////////////////////////////////////////////////////////////////////
app.use(function(err, req, res, next) {
	log.error(util.format("%s: %s", req.url, util.inspect(err, false, 5, true)));
	next(err);
});

app.use(function(err, req, res, next) {	
	if(err.statusCode != 301) return next(err); 
	res.status(301).location(err.location).end();
});

app.use(function(err, req, res, next) {	
	if(err.statusCode != 302) return next(err);
	res.status(302).location(err.location).end();
});

app.use(function(err, req, res, next) {
	if(err.statusCode != 403) return next(err);
	res.render("403");
});

app.use(function(err, req, res, next) {
	if(err.statusCode != 404) return next(err);
	res.render("404");
});

app.use(function(err, req, res, next) {
	res.render("500");
});

// Actual 404.
app.use(function(req, res, next) {
	res.render("404");
});
