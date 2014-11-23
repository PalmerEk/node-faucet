var path = require('path')
	,	express = require('express')
	, util = require('util');

var app = module.exports = express();
var settings = require(process.env.settingsFile || '../../settings')

var log = require('../../lib/logger');

app.set('views', path.join(process.cwd(), 'themes', settings.theme.name || 'default', __dirname.split(path.sep)[__dirname.split(path.sep).length - 1] ));

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
