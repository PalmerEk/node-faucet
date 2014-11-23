var path = require('path')
	,	express = require('express');

var app = module.exports = express();
var settings = require(process.env.settingsFile || '../../settings')

app.set('views', path.join(process.cwd(), 'themes', settings.theme.name || 'default', __dirname.split(path.sep)[__dirname.split(path.sep).length - 1] ));

app.get('/privacy', function(req, res) {
	res.render("privacy");
});

app.get('/terms', function(req, res) {
	res.render("terms");
});
