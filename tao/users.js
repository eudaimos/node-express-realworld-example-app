const tao = require("@tao.js/core");
const { default: TAO, AppCtx } = tao;
var passport = require("passport");

var mongoose = require("mongoose");
var User = mongoose.model("User");

TAO.addInterceptHandler(
  { t: "user", a: "locate", o: "portal" },
  (tao, data) => {
    const { user, portal } = data;
    if (user.id !== portal.auth.id) {
      return new AppCtx("user", "fail", "portal", {
        user,
        fail: { auth: true, message: "not authorized" },
        portal,
      });
    }
  }
);

TAO.addInterceptHandler(
  { t: "user", a: "locate", o: "portal" },
  (tao, data) => {
    const { user, locate = {}, portal } = data;
    if (user.id === portal.token.id) {
      return new AppCtx(
        "user",
        locate && locate.forUpdate ? "update" : "retrieve",
        "portal",
        portal.auth,
        locate.forUpdate,
        portal
      );
    }
  }
);

TAO.addInlineHandler({ t: "user", a: "locate", o: "portal" }, (tao, data) => {
  const { user, locate = {}, portal } = data;
  return User.findById(user.id)
    .then((foundUser) => {
      if (!foundUser) {
        return new AppCtx("user", "miss", "portal", { user, portal });
      }
      if (locate.forUpdate) {
        return new AppCtx(
          "user",
          "update",
          "portal",
          foundUser,
          locate.forUpdate,
          portal
        );
      }
      return new AppCtx(
        "user",
        "retrieve",
        "portal",
        foundUser,
        undefined,
        portal
      );
    })
    .catch((err) => {
      const fail = { error: err };
      // if (find && find.forUpdate) {
      //   fail.forUpdate = find.forUpdate;
      // }
      return new AppCtx("user", "fail", "portal", { user, fail, portal });
    });
});

TAO.addInlineHandler({ t: "user", a: "retrieve", o: "portal" }, (tao, data) => {
  const { user, portal } = data;
  return new AppCtx(
    "user",
    "load",
    "portal",
    user.toAuthJSON(),
    undefined,
    portal
  );
});

TAO.addInlineHandler({ t: "user", a: "update", o: "portal" }, (tao, data) => {
  const { user, update, portal } = data;
  // only update fields that were actually passed...
  if (typeof update.username !== "undefined") {
    user.username = update.username;
  }
  if (typeof update.email !== "undefined") {
    user.email = update.email;
  }
  if (typeof update.bio !== "undefined") {
    user.bio = update.bio;
  }
  if (typeof update.image !== "undefined") {
    user.image = update.image;
  }
  if (typeof update.password !== "undefined") {
    user.setPassword(update.password);
  }

  return user
    .save()
    .then(() => {
      // storedUser = user.toAuthJSON();
      return new AppCtx("user", "stored", "portal", user, null, portal);
    })
    .catch((err) => {
      const fail = { error: err, forUpdate: update };
      return new AppCtx("user", "fail", "portal", user, fail, portal);
    });
});

TAO.addInterceptHandler(
  { t: "user", a: "update", o: "portal" },
  (tao, data) => {
    const { user, update, portal } = data;
    if (!(user instanceof User)) {
      return new AppCtx("user", "locate", "portal", {
        user: { id: portal.auth.id },
        locate: { forUpdate: update },
        portal,
      });
    }
  }
);

TAO.addInlineHandler({ t: "user", a: "stored", o: "portal" }, (tao, data) => {
  const { user, portal } = data;
  return new AppCtx(
    "user",
    "load",
    "portal",
    user.toAuthJSON(),
    undefined,
    portal
  );
});

TAO.addInterceptHandler({ t: "user", a: "find", o: "anon" }, (tao, data) => {
  const { email, password } = data.user || {};
  const errors = {};
  if (!email) {
    errors.email = "cannot be blank";
  }
  if (!password) {
    errors.password = "cannot be blank";
  }
  if (Object.keys(errors).length) {
    return new AppCtx("user", "invalid", "anon", data.user, {
      auth: true,
      errors,
    });
  }
});

TAO.addInlineHandler({ t: "user", a: "find", o: "anon" }, (tao, data) => {
  const { email, password } = data.user;
  return User.findOne({ email: email })
    .then((user) => {
      if (!user || !user.validPassword(password)) {
        return new AppCtx(
          "user",
          "invalid",
          "anon",
          {
            email,
          },
          {
            auth: true,
            errors: { "email or password": "is invalid" },
          }
        );
      }
      return new AppCtx("user", "load", "anon", user.toAuthJSON());
    })
    .catch((err) => {
      return new AppCtx(
        "user",
        "fail",
        "anon",
        { email },
        { auth: true, error: err }
      );
    });
});

// TAO.addInterceptHandler(
//   { t: "user", a: "add", o: "anon" },
//   async (tao, data) => {
//     const { username, email, password } = data.add;
//     const newUser = new User({ username, email });
//     newUser.setPassword(password);
//     // let err = null;
//     try {
//       await newUser.validate();
//     } catch (err) {
//       return new AppCtx("user", "invalid", "anon", data.add, err);
//     }
//     // const errors = {};
//     // if (!username) {
//     //   errors.username = "cannot be blank";
//     // }
//     // if (!email) {
//     //   errors.email = "cannot be blank";
//     // }
//     // if (!password) {
//     //   errors.password = "cannot be blank";
//     // }
//     // if (Object.keys(errors).length) {
//     //   return new AppCtx("user", "invalid", "anon", data.add, { errors });
//     // }
//   }
// );

TAO.addInlineHandler({ t: "user", a: "add", o: "anon" }, (tao, data) => {
  const { username, email, password } = data.add;
  // const newUser = new User({ username, email });
  const newUser = new User();
  newUser.username = username;
  newUser.email = email;
  newUser.setPassword(password);
  return newUser
    .save()
    .then(() => {
      console.info("newUser:\n", newUser);
      const user = newUser.toAuthJSON();
      return new AppCtx("user", "stored", "anon", user, newUser);
    })
    .catch((err) => {
      const fail = { error: err, add: { username, email } };
      return new AppCtx("user", "fail", "anon", { fail });
    });
});

// where can this be run?
TAO.addInlineHandler({ t: "user", a: "stored", o: "anon" }, (tao, data) => {
  const { user, stored } = data;
  return new AppCtx("user", "enter", "portal", user, undefined, {
    token: user.token,
    userId: stored.id,
  });
});

TAO.addInlineHandler({ t: "user", a: "enter", o: "portal" }, (tao, data) => {
  console.log("just seeing if this fixes it");
});

// TAO.addInterceptHandler({ t: 'user', a: 'find', o: 'anon' }, (tao, data) => {
//   const { email, password } = data.user;

//   passport.authenticate('local', {session: false}, function(err, user, info){
//     if(err){ return next(err); }

//     if(user){
//       user.token = user.generateJWT();
//       return res.json({user: user.toAuthJSON()});
//     } else {
//       return res.status(422).json(info);
//     }
//   })(req, res, next);

// })
