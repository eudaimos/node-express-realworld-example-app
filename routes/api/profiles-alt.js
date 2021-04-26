var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../auth');
const features = require('../../config/features.json').routes.profiles;
const { getPortal } = require('../util');

// // Preload user profile on routes with ':username'
// if (
//   features.all ||
//   features.get ||
//   features.follow.post ||
//   features.follow.delete
// ) {
//   router.param("username", function (req, res, next, username) {
//     const channel = req.channel;
//     const portal = getPortal(req);
//     channel.addInlineHandler({ t: "profile", a: "retrieve" }, (tao, data) => {
//       const { profile } = data;
//       req.profile = data.profile;
//       next();
//     });
//     channel.addInlineHandler({ t: "profile", a: "miss" }, (tao, data) => {
//       res.sendStatus(404);
//     });
//     channel.addInlineHandler({ t: "profile", a: "fail" }, (tao, data) => {
//       const { fail } = data;
//       next(fail.error || fail.msg);
//     });
//     channel.setCtx(
//       { t: "profile", a: "locate", o: portal ? "portal" : "anon" },
//       { username },
//       undefined,
//       portal
//     );
//   });
// }

// TODOS:
// + Find profile: GET /:username
// + Follow profile: POST /:username/follow
// + Unfollow profile: DELETE /:username/follow

function unpackRequest(req) {
  const channel = req.channel;
  const { username } = req.params;
  const portal = getPortal(req);
  return { channel, username, portal };
}

// find profile -> {profile,find,*:o} => {profile,retrieve,o} | {profile,fail,o}
if (features.all || features.get) {
  router.get('/:username', auth.optional, function (req, res, next) {
    const { channel, username, portal } = unpackRequest(req);
    channel.addInlineHandler({ t: 'profile', a: 'load' }, (tao, data) => {
      const { profile } = data;
      res.json({ profile });
    });
    channel.addInlineHandler({ t: 'profile', a: 'miss' }, (tao, data) => {
      next(); // triggers 404 middleware
    });
    channel.addInlineHandler({ a: 'fail' }, (tao, data) => {
      const { fail } = data;
      if (!fail) {
        return next('failure occurred');
      }
      next(fail.error || fail.msg);
    });
    const ac = new AppCtx(
      'profile',
      'locate',
      portal ? 'portal' : 'anon',
      { username },
      null,
      portal
    );
    channel.setAppCtx(ac);
  });
}

// follow profile -> {follow,add,portal} => {follow,stored,portal} | {follow,fail,portal}
if (features.all || features.follow.post) {
  router.post('/:username/follow', auth.required, function (req, res, next) {
    const { channel, username, portal } = unpackRequest(req);
    const channel = req.channel;
    channel.addInlineHandler(
      { t: 'profile', a: 'load', o: 'portal' },
      (tao, data) => {
        const { profile } = data;
        res.json({ profile });
      }
    );
    channel.addInlineHandler(
      { t: 'profile_user', a: 'invalid', o: 'portal' },
      (tao, data) => {
        res.status(422).json(data.invalid);
      }
    );
    channel.addInlineHandler(
      { t: 'profile_user', a: 'fail', o: 'portal' },
      (tao, data) => {
        const { fail } = data;
        if (fail.auth) {
          authTo401(res);
        } else {
          next(fail.error || fail.msg);
        }
      }
    );
    channel.addInlineHandler(
      { t: 'auth', a: 'miss', o: 'portal' },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.addInlineHandler(
      { t: 'auth', a: 'fail', o: 'portal' },
      (tao, data) => {
        authTo401(res);
      }
    );
    channel.setCtx({ t: 'user', a: 'add', o: 'anon' }, { add });

    channel.addInlineHandler({ t: 'follow' });

    var profileId = req.profile._id;

    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        return user.follow(profileId).then(function () {
          return res.json({ profile: req.profile.toProfileJSONFor(user) });
        });
      })
      .catch(next);
  });
}

// unfollow profile -> {follow,remove,portal} => {follow,gone,portal} | {follow,fail,portal}
router.delete('/:username/follow', auth.required, function (req, res, next) {
  var profileId = req.profile._id;

  User.findById(req.payload.id)
    .then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }

      return user.unfollow(profileId).then(function () {
        return res.json({ profile: req.profile.toProfileJSONFor(user) });
      });
    })
    .catch(next);
});

module.exports = router;
