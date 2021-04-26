var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../auth');
const features = require('../../config/features.json').routes.profiles;

// Preload user profile on routes with ':username'
if (
  !features.all &&
  (!features.get || !features.follow.post || !features.follow.delete)
) {
  router.param('username', function (req, res, next, username) {
    User.findOne({ username: username })
      .then(function (user) {
        if (!user) {
          return res.sendStatus(404);
        }

        req.profile = user;

        return next();
      })
      .catch(next);
  });
}

if (!features.all && !features.get) {
  router.get('/:username', auth.optional, function (req, res, next) {
    if (req.payload) {
      User.findById(req.payload.id).then(function (user) {
        if (!user) {
          return res.json({ profile: req.profile.toProfileJSONFor(false) });
        }

        return res.json({ profile: req.profile.toProfileJSONFor(user) });
      });
    } else {
      return res.json({ profile: req.profile.toProfileJSONFor(false) });
    }
  });
}

if (!features.all && !features.follow.post) {
  router.post('/:username/follow', auth.required, function (req, res, next) {
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

if (!features.all && !features.follow.delete) {
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
}

module.exports = router;
