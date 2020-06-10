const getPortal = require("./get-portal");

var router = require("express").Router();
var auth = require("../auth");
const { authTo401 } = require("../util");

const features = require("../../config/features.json").routes;

// TODOS:
// + Find tags: GET /

// const channel = new Channel(TAO);
// TODO: make Channel + Transponder composable
// TODO: modify Transponder to be middleware for any Kernel and reacts to first handler
//       that is found in network it's attached to
// TODO: modify Channel to allow Transponder to add middleware to it's _channel network
//       making it a composed focused transponder

function tagsHandler(popular) {
  return (req, res, next) => {
    const channel = req.channel;
    const portal = getPortal(req);
    channel.addInlineHandler({ t: "tag", a: "fetch" }, (tao, data) => {
      const { tag } = data;
      res.json({ tags: tag });
    });
    channel.addInlineHandler({ t: "tag", a: "fail" }, (tao, data) => {
      const { fail } = data;
      next(fail.error);
    });
    channel.addInlineHandler(
      { t: "auth", a: "miss", o: "portal" },
      authTo401(res)
    );
    channel.addInlineHandler(
      { t: "auth", a: "fail", o: "portal" },
      authTo401(res)
    );
    const find = { popular };
    channel.setCtx(
      { t: "tag", a: "find", o: !portal ? "anon" : "portal" },
      { find, portal }
    );
  };
}

// return a list of tags -> {tag,find,*:o} => {tag,fetch,o} | {tag,fail,o}
if (features.tags.get) {
  router.get("/", auth.optional, tagsHandler());
  router.get("/popular", auth.optional, tagsHandler(true));
}

module.exports = router;
