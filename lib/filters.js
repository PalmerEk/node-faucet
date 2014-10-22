var settings = require(process.env.settingsFile || '../settings')
	, util = require('util')
	,	path = require('path');

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());

exports.stringify = function (obj) {
	return JSON.stringify(obj);
};

exports.truncatechars = function (string, chars) {
	return _.s.truncate(string, chars, "...");
};
