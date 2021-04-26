function getTokenFromHeader(req) {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Token") ||
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
}

function authTo401(res) {
  return () => res.sendStatus(401);
}

function getPortal(req) {
  if (!req.payload) {
    return;
  }
  return { token: req.payload };
}

module.exports = { getTokenFromHeader, authTo401, getPortal };
