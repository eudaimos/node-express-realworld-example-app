const tao = require("@tao.js/core");
const { default: TAO, AppCtx } = tao;

var mongoose = require("mongoose");
var Article = mongoose.model("Article");

TAO.addInlineHandler({ t: "tag", a: "find" }, (tao, data) => {
  const { find = {}, portal } = data;
  if (find.popular) {
    return;
  }
  return Article.find()
    .distinct("tagList")
    .then((tags) => {
      return new AppCtx("tag", "fetch", tao.o, tags, find, portal);
    })
    .catch((err) => {
      return new AppCtx("tag", "fail", tao.o, {
        fail: { error: err, find },
        orient: data[tao.o],
      });
    });
});

TAO.addInlineHandler({ t: "tag", a: "find" }, (tao, data) => {
  const { find = {}, portal } = data;
  if (!find.popular) {
    return;
  }
  const { limit = 20, offset = 0 } = find || {};

  return Article.aggregate()
    .unwind("tagList")
    .group({
      _id: "$tagList",
      count: { $sum: 1 },
      recency: { $max: "$createdAt" },
    })
    .sort({ count: -1, recency: -1 })
    .skip(offset)
    .limit(limit)
    .cursor()
    .exec()
    .toArray()
    .then((tagList) => {
      console.log("tagList:", tagList);
      const tag = tagList.map((t) => t._id);
      return new AppCtx("tag", "fetch", tao.o, tag, find, portal);
    })
    .catch((err) => {
      return new AppCtx("tag", "fail", tao.o, {
        fail: { error: err, find },
        orient: data[tao.o],
      });
    });
});

TAO.addInlineHandler({ t: "tag", a: "fetch" }, (tao, data) => {
  const { tag, portal } = data;
  return new AppCtx("tag", "list", tao.o, { tag, portal });
});
