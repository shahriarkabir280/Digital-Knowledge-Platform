function versionIncrementExpression(dbOrTrx) {
  return dbOrTrx.raw('?? + 1', ['version']);
}

module.exports = {
  versionIncrementExpression,
};