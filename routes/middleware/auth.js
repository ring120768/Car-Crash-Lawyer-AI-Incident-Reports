module.exports = function authPassthrough(req, res, next) {
  return next();
};
