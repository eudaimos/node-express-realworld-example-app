// const Transponder = require("@tao.js/utils").Transponder;
var router = require("express").Router();
// var passport = require("passport");
var auth = require("../auth");
const features = require("../../config/features.json").routes;
const { authTo401, getPortal } = require("../util");

// Find the current logged in user -> {user,find,portal} => {user,retrieve,portal} | {user,fail,portal}
if (features.user.all || features.user.get) {
  router.get("/user", auth.required, async function (req, res, next) {
    const portal = getPortal(req);
    if (!portal) {
      return authTo401(res);
    }
    const channel = req.channel;
    channel.addInlineHandler(
      { t: "user", a: "load", o: "portal" },
      (tao, data) => {
        const { user } = data;
        res.json({ user });
      }
    );
    channel.addInlineHandler(
      { t: "auth", a: "miss", o: "portal" },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "miss", o: "portal" },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.addInlineHandler(
      { t: "auth", a: "fail", o: "portal" },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "fail", o: "portal" },
      (tao, data) => {
        const { fail, portal } = data;
        if (fail.auth) {
          authTo401(res);
        } else {
          next(fail.error || fail.message);
        }
      }
    );
    channel.setCtx(
      { t: "user", a: "locate", o: "portal" },
      {
        user: { id: req.payload.id },
        portal,
      }
    );
  });
}

// Update the current logged in user -> {user,update,portal} => {user,stored,portal} | {user,fail,portal}
if (features.user.all || features.user.put) {
  router.put("/user", auth.required, async function (req, res, next) {
    const { user: update } = req.body;
    if (!update) {
      res.sendStatus(400);
      return next();
    }
    const portal = getPortal(req);
    if (!portal) {
      authTo401(res);
      return next();
    }
    const channel = req.channel;
    channel.addInlineHandler(
      { t: "user", a: "load", o: "portal" },
      (tao, data) => {
        const { user } = data;
        res.json({ user });
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "fail", o: "portal" },
      (tao, data) => {
        const { fail, portal } = data;
        if (fail.auth) {
          authTo401(res);
        } else {
          next(fail.error);
        }
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "miss", o: "portal" },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.setCtx(
      { t: "user", a: "update", o: "portal" },
      { user: { id: req.payload.id }, update, portal }
    );
  });
}

// Log a user in -> {user,find,anon} => {user,retrieve,portal} | {user,fail,anon}
if (features.user.login.post) {
  router.post("/users/login", function (req, res, next) {
    const {
      body: { user },
      channel,
    } = req;
    channel.addInlineHandler(
      { t: "user", a: "load", o: "anon" },
      (tao, data) => {
        res.json({ user: data.user });
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "invalid", o: "anon" },
      (tao, data) => {
        res.status(422).json(data.invalid);
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "fail", o: "anon" },
      (tao, data) => {
        next(data.fail.error);
      }
    );
    channel.setCtx({ t: "user", a: "find", o: "anon" }, { user });
  });
}

// Register a new user -> {user,add,anon} => {user,stored,anon|portal} | {user,fail,anon}
if (features.user.all || features.user.post) {
  router.post("/users", async function (req, res, next) {
    const { user: add } = req.body;
    if (!add) {
      res.sendStatus(400);
      return next();
    }
    const channel = req.channel;
    channel.addInlineHandler(
      { t: "user", a: "stored", o: "anon" },
      (tao, data) => {
        const { user } = data;
        res.json({ user });
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "invalid", o: "anon" },
      (tao, data) => {
        res.status(422).json(data.invalid);
      }
    );
    channel.addInlineHandler(
      { t: "user", a: "fail", o: "anon" },
      (tao, data) => {
        const { fail } = data;
        if (fail.auth) {
          authTo401(res);
        } else {
          next(fail.error);
        }
      }
    );
    channel.setCtx({ t: "user", a: "add", o: "anon" }, { add });
  });
}

module.exports = router;
