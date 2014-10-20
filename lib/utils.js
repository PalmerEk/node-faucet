var settings = require('../settings');

exports.firstOrNull = function(list) {
  return (list && list.length > 0) ? list[0] : null
}

exports.firstOrEmpty = function(list) {
  return (list && list.length > 0) ? list[0] : {}
}

