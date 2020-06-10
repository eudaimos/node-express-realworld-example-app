module.exports = function getPortal(req) {
  if (!req.payload) {
    return;
  }
  return { token: req.payload };
};
