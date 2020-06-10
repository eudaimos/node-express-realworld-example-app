const tao = require("@tao.js/core");
const { default: TAO, AppCtx } = tao;

var mongoose = require("mongoose");
var User = mongoose.model("User");

TAO.addInterceptHandler({ o: "portal" }, (tao, data) => {
  if (tao.t === "auth") {
    return;
  }
  const { portal } = data;
  // May need to switch back to check for portal.userId - validate if this doesn't create infinite loop
  if (!portal) {
    return new AppCtx("auth", "miss", "portal", data);
  }
  // if (portal && !portal.auth && portal.userId) {
  if (!portal.auth) {
    return new AppCtx("auth", "locate", "portal", {
      locate: { next: new AppCtx(tao.t, tao.a, tao.o, data) },
      portal,
    });
  }
});

TAO.addInterceptHandler(
  { t: "auth", a: "locate", o: "portal" },
  (tao, data) => {
    const { portal = {} } = data;
    if (!portal.token) {
      return new AppCtx("auth", "miss", "portal");
    }
  }
);

TAO.addInlineHandler({ t: "auth", a: "locate", o: "portal" }, (tao, data) => {
  const { locate, portal } = data;
  // May need to eliminate - validate if this doesn't create infinite loop
  // if (!portal.userId) {
  //   return new AppCtx("auth", "miss", "portal", { miss: locate, portal });
  // }
  return new AppCtx(
    "auth",
    "retrieve",
    "portal",
    { id: portal.token.id },
    locate,
    portal
  );
});

TAO.addInterceptHandler(
  { t: "auth", a: "retrieve", o: "portal" },
  (tao, data) => {
    const { auth, retrieve, portal } = data;

    if (!auth.id) {
      return new AppCtx(
        "auth",
        "miss",
        "portal",
        auth,
        { ...retrieve, message: "missing id" },
        portal
      );
    }
  }
);

TAO.addInlineHandler({ t: "auth", a: "retrieve", o: "portal" }, (tao, data) => {
  const { auth, retrieve, portal } = data;

  // if (!auth.id) {
  //   return new AppCtx(
  //     "auth",
  //     "miss",
  //     "portal",
  //     auth,
  //     { ...retrieve, message: "missing id" },
  //     portal
  //   );
  // }
  return User.findById(auth.id)
    .then((foundUser) => {
      // if (!foundUser) {
      //   return new AppCtx("auth", "miss", "portal", auth, retrieve, portal);
      // }
      return new AppCtx("auth", "load", "portal", foundUser, retrieve, portal);
    })
    .catch((err) => {
      const fail = { error: err, next: retrieve.next };
      return new AppCtx("auth", "fail", "portal", auth, fail, portal);
    });
});

TAO.addInterceptHandler({ t: "auth", a: "load", o: "portal" }, (tao, data) => {
  const { auth, load, portal } = data;
  if (!auth || !(auth instanceof User)) {
    return new AppCtx("auth", "miss", "portal", auth, load, portal);
  }
});

// TAO.addAsyncHandler({ t: "auth", a: "load", o: "portal" }, (tao, data) => {
//   const { auth, load, portal } = data;
//   portal.auth = auth;
//   const user = { id: auth.id, email: auth.email, username: auth.username };
//   return new AppCtx("user", "enter", "portal", { user, portal });
// });

// TAO.addInterceptHandler({ t: "auth", a: "load", o: "portal" }, (tao, data) => {
TAO.addInlineHandler({ t: "auth", a: "load", o: "portal" }, (tao, data) => {
  const { auth, load, portal } = data;
  portal.auth = auth;
  if (!load || !load.next) {
    const user = { id: auth.id, email: auth.email, username: auth.username };
    return new AppCtx("user", "enter", "portal", { user, portal });
  }
});

TAO.addInlineHandler({ t: "auth", a: "load", o: "portal" }, (tao, data) => {
  const { auth, load = {}, portal } = data;
  portal.auth = auth;
  if (load.next) {
    const next = load.next.unwrapCtx ? load.next.unwrapCtx() : load.next;
    const nextData = load.next.data
      ? { ...load.next.data, portal }
      : { portal };
    return new AppCtx(next.t, next.a, next.o, nextData);
  }
});
