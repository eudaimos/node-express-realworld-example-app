const tao = require("@tao.js/core");
const { default: TAO, AppCtx } = tao;

var mongoose = require("mongoose");
var User = mongoose.model("User");

TAO.addInterceptHandler({ t: "profile", a: "locate" }, (tao, data) => {
  const { profile } = data;
  if (!profile || !profile.username) {
    return new AppCtx(
      "profile",
      "fail",
      tao.o,
      profile,
      { msg: "missing profile.username" },
      data[tao.o]
    );
  }
});

TAO.addInlineHandler({ t: "profile", a: "locate" }, (tao, data) => {
  const { profile, locate } = data;
  return User.findOne({ username: profile.username })
    .then((user) => {
      return new AppCtx(
        "profile",
        "retrieve",
        tao.o,
        user,
        locate,
        data[tao.o]
      );
    })
    .catch((error) => {
      return new AppCtx(
        "profile",
        "fail",
        tao.o,
        profile,
        { error, locate },
        data[tao.o]
      );
    });
});

TAO.addInterceptHandler({ t: "profile", a: "retrieve" }, (tao, data) => {
  const { profile, retrieve } = data;
  // if (retrieve.)
});

TAO.addInlineHandler(
  { t: "profile", a: "retrieve", o: "anon" },
  (tao, data) => {}
);

TAO.addInlineHandler(
  { t: "profile", a: "retrieve", o: "portal" },
  (tao, data) => {}
);

TAO.addInterceptHandler(
  { t: "profile_user", a: "add", o: "portal" },
  (tao, data) => {
    const { profile_user, add, portal } = data;
    if (!profile_user.username) {
      return new AppCtx(
        "profile_user",
        "fail",
        "portal",
        profile_user,
        { msg: "missing username" },
        portal
      );
    }
    if (!add.userId) {
      return new AppCtx(
        "profile_user",
        "add",
        "portal",
        profile_user,
        { ...add, userId: portal.auth.id },
        portal
      );
    }
  }
);

TAO.addInterceptHandler(
  { t: "profile_user", a: "add", o: "portal" },
  (tao, data) => {
    const { profile_user, add, portal } = data;
    if (add.userId !== portal.auth.id) {
      return new AppCtx(
        "profile_user",
        "fail",
        "portal",
        profile_user,
        { auth: true, msg: "not authorized", add },
        portal
      );
    }
  }
);

TAO.addInlineHandler(
  { t: "profile_user", a: "add", o: "portal" },
  (tao, data) => {}
);

TAO.addInlineHandler(
  { t: "profile_user", a: "delete", o: "portal" },
  (tao, data) => {}
);
