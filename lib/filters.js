var settings = require(process.env.settingsFile || '../settings')
	, util = require('util')
	,	path = require('path');

var _ = require('underscore');
_.s = require('underscore.string');
_.mixin(_.s.exports());

var moment = require('moment');

module.exports = function(swig) {
	swig.setFilter('stringify', stringify);
	swig.setFilter('truncatechars', truncatechars);
	swig.setFilter('humanizeDuration', humanizeDuration);
}

function stringify (obj) {
	return JSON.stringify(obj);
};

function truncatechars(string, chars) {
	return _.s.truncate(string, chars, "...");
};

function humanizeDuration(length, interval) {
	return moment.duration(length, interval).humanize();
}