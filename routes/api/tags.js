var router = require("express").Router();
var mongoose = require("mongoose");
var Article = mongoose.model("Article");

const features = require("../../config/features.json").routes;

// return a list of tags
if (!features.tags.get) {
  router.get("/", function (req, res, next) {
    Article.find()
      .distinct("tagList")
      .then(function (tags) {
        return res.json({ tags: tags });
      })
      .catch(next);
  });
}

module.exports = router;
