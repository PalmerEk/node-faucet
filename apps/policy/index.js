var express = require('express');
var app = module.exports = express();

app.set('views', __dirname);

app.get('/privacy', function(req, res) {
	res.render("privacy");
});

app.get('/terms', function(req, res) {
	res.render("terms");
});
