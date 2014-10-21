module.exports.firstOrNull = function(list) {
  return (list && list.length > 0) ? list[0] : null
}

module.exports.firstOrEmpty = function(list) {
  return (list && list.length > 0) ? list[0] : {}
}

