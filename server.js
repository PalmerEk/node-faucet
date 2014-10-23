var express = require('express')
  , swig = require('swig')
  , http = require('http')
  , path = require('path')
  , util = require('util')
  , Cookies = require( "cookies" );

var settings = require(process.env.settingsFile || './settings')
  , log = require('./lib/logger');

var env = process.env.NODE_ENV || 'development';
var app = module.exports = express();

// setup SWIG
var VIEWS_DIR = path.join(__dirname, 'apps/views');
app.engine('html', swig.renderFile);
require('./lib/filters')(swig);

if(env == 'development'){
  swig.setDefaults({root: VIEWS_DIR, allowErrors: true, cache: false});
  //, filters: require('./lib/filters')
  app.use(require('morgan')({ format: 'dev', immediate: true }));
} else {
  swig.setDefaults({root: VIEWS_DIR, allowErrors: false, cache: "memory"});
};

app.set('view cache', false); // let swig handle the template cacheing
app.set('view options', { layout: false });
app.set('view engine', 'html');

app.set('port', process.env.PORT || settings.port);
app.set('views', VIEWS_DIR);

app.use(require('serve-favicon')(path.join(__dirname, 'public/favicon.ico')));
app.use(require('body-parser')());;
app.use(require('method-override')());
app.use(Cookies.express(settings.session.key));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(require('serve-static')(path.join(__dirname, 'public')));

if(env = 'development'){
  app.use(require('errorhandler')({ dumpExceptions: true, showStack: true }));
} else {
  app.use(require('errorhandler')());
};

// Routes
var middleware = {
  setup: require('./middleware/setup')
}

app.get('/ping', function(req,res) {return res.send(200);} );

app.all('*', middleware.setup.settings, middleware.setup.defaults);

app.use(require('./apps/home'));
app.use(require('./apps/policy'));

// Must be last (catchall)
app.use(require('./apps/errors'));

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
