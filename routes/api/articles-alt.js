const tao = require("@tao.js/core");
// const Transponder = require('@tao.js/utils').Transponder;
const Channel = require("@tao.js/utils").Channel;
const { default: TAO } = tao;
var router = require("express").Router();
var mongoose = require("mongoose");
var Article = mongoose.model("Article");
var Comment = mongoose.model("Comment");
var User = mongoose.model("User");
var auth = require("../auth");
const features = require("../../config/features.json").routes.articles;
const { getTokenFromHeader, getPortal } = require("../util");

// TODOS:
// + verify Find article: GET /:article
// + Find articles: GET /
// + Find article feed for user: GET /feed
// + Create article: POST /
// + Update article: PUT /:article
// + Delete article: DELETE /:article
// + Favorite article: POST /:article/favorite
// + Unfavorite article: DELETE /:article/favorite
// + Find article comments: GET /:article/comments
// + Create article comment: POST /:article/comments
// + Delete a comment: DELETE /:article/comments/:comment

// Preload article objects on routes with ':article'
// if (!features.articles.all && !features.articles.article.get) {
//   router.param("article", function (req, res, next, slug) {
//     Article.findOne({ slug: slug })
//       .populate("author")
//       .then(function (article) {
//         if (!article) {
//           return res.sendStatus(404);
//         }

//         req.article = article;

//         return next();
//       })
//       .catch(next);
//     // return;
//   });
// }

// router.param("comment", function (req, res, next, id) {
//   Comment.findById(id)
//     .then(function (comment) {
//       if (!comment) {
//         return res.sendStatus(404);
//       }

//       req.comment = comment;

//       return next();
//     })
//     .catch(next);
// });

// Find articles -> {article,find,*:o} => {article,fetch,o} | {article,fail,o}
if (features.all || features.get) {
  router.get("/", auth.optional, function (req, res, next) {
    // var query = {};
    // var limit = 20;
    // var offset = 0;

    // const find = {};

    // if (typeof req.query.limit !== "undefined") {
    //   find.limit = req.query.limit;
    // }

    // if (typeof req.query.offset !== "undefined") {
    //   find.offset = req.query.offset;
    // }

    // if (typeof req.query.tag !== "undefined") {
    //   query.tagList = { $in: [req.query.tag] };
    // }

    // Promise.all([
    //   req.query.author ? User.findOne({ username: req.query.author }) : null,
    //   req.query.favorited
    //     ? User.findOne({ username: req.query.favorited })
    //     : null,
    // ])
    //   .then(function (results) {
    //     var author = results[0];
    //     var favoriter = results[1];

    //     if (author) {
    //       query.author = author._id;
    //     }

    //     if (favoriter) {
    //       query._id = { $in: favoriter.favorites };
    //     } else if (req.query.favorited) {
    //       query._id = { $in: [] };
    //     }

    //     return Promise.all([
    //       Article.find(query)
    //         .limit(Number(limit))
    //         .skip(Number(offset))
    //         .sort({ createdAt: "desc" })
    //         .populate("author")
    //         .exec(),
    //       Article.count(query).exec(),
    //       req.payload ? User.findById(req.payload.id) : null,
    //     ]).then(function (results) {
    //       var articles = results[0];
    //       var articlesCount = results[1];
    //       var user = results[2];

    //       return res.json({
    //         articles: articles.map(function (article) {
    //           return article.toJSONFor(user);
    //         }),
    //         articlesCount: articlesCount,
    //       });
    //     });
    //   })
    //   .catch(next);
    // return;
    const find = {};
    if (typeof req.query.limit !== "undefined") {
      find.limit = Number(req.query.limit);
    }

    if (typeof req.query.offset !== "undefined") {
      find.offset = Number(req.query.offset);
    }

    let t = "article";
    let term = {};
    if (typeof req.query.tag !== "undefined") {
      query.tagList = { $in: [req.query.tag] };
      t = "article_tag";
      term.tag = req.query.tag;
    } else if (typeof req.query.author !== "undefined") {
      t = "article_user";
      term.user = req.query.author;
    } else if (typeof req.query.favorited !== "undefined") {
      t = "article_favorite";
      term.user = req.query.favorited;
    }
    const portal = getPortal(req);
    const channel = req.channel;
    channel.addInlineHandler({ t, a: "fetch" }, (tao, data) => {
      const {
        [t]: { items, count },
      } = data;
      res.json({
        articles: items,
        articlesCount: count,
      });
    });
    channel.addInlineHandler({ t, a: "fail" }, (tao, data) => {
      const { fail } = data;
      next(fail.error);
    });

    channel.setCtx(
      { t, a: "find", o: !portal ? "anon" : "portal" },
      { term, portal }
    );
  });
}

// Find articles for logged in user -> {article,find,portal} => {article,fetch,portal} | {article,fail,portal}
if (features.all || features.feed.get) {
  router.get("/feed", auth.required, function (req, res, next) {
    var limit = 20;
    var offset = 0;

    if (typeof req.query.limit !== "undefined") {
      limit = req.query.limit;
    }

    if (typeof req.query.offset !== "undefined") {
      offset = req.query.offset;
    }

    User.findById(req.payload.id).then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }

      Promise.all([
        Article.find({ author: { $in: user.following } })
          .limit(Number(limit))
          .skip(Number(offset))
          .populate("author")
          .exec(),
        Article.count({ author: { $in: user.following } }),
      ])
        .then(function (results) {
          var articles = results[0];
          var articlesCount = results[1];

          return res.json({
            articles: articles.map(function (article) {
              return article.toJSONFor(user);
            }),
            articlesCount: articlesCount,
          });
        })
        .catch(next);
    });
  });
}

// Create article by logged in user -> {article,add,portal} => {article,stored,portal} | {article,fail,portal}
if (features.all || features.post) {
  router.post("/", auth.required, function (req, res, next) {
    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        var article = new Article(req.body.article);

        article.author = user;

        return article.save().then(function () {
          console.log(article.author);
          return res.json({ article: article.toJSONFor(user) });
        });
      })
      .catch(next);
  });
}

const resolveArticleParts = (anon, resolve) => ({ article, user }) => {
  if (anon && article) {
    resolve(article.toJSONFor(null));
  } else if (!article || !user) {
    return;
  }
  resolve(article.toJSONFor(user));
};

const logger = console;
function channelLogger(id) {
  return (tao, data) => {
    logger.groupCollapsed(`☯[${id}]{${tao.t}, ${tao.a}, ${tao.o}}:`);
    logger.info(`${tao.t}:\n`, data[tao.t]);
    logger.info(`${tao.a}:\n`, data[tao.a]);
    logger.info(`${tao.o}:\n`, data[tao.o]);
    logger.groupEnd();
  };
}

// return a article -> {article,find,*:o} => {article,retrieve,o} | {article,fail,o}
if (features.all || features.article.get) {
  router.get("/:article", auth.optional, async function (req, res, next) {
    const token = getTokenFromHeader(req);
    const channel = new Channel(TAO);
    const parts = {};
    const portal =
      req.payload && req.payload.id ? { token, userId: req.payload.id } : null;
    const returnArticle = await new Promise((resolve, reject) => {
      const toResolve = resolveArticleParts(!portal, resolve);
      channel.addInlineHandler({ t: "article", a: "retrieve" }, (tao, data) => {
        const { retrieve } = data;
        parts.article = retrieve;
        toResolve(parts);
      });
      channel.addInlineHandler(
        { t: "user", a: "retrieve", o: "portal" },
        (tao, data) => {
          const { retrieve, portal } = data;
          parts.user = retrieve;
          toResolve(parts);
        }
      );
      channel.setCtx(
        { t: "article", a: "find", o: !portal ? "anon" : "portal" },
        { article: { slug: req.params.article }, portal }
      );
    });
    res.json({ article: returnArticle });
  });
}

// update article -> {article,update,portal} => {article,stored,portal} | {article,fail,portal}
if (features.all || features.article.put) {
  router.put("/:article", auth.required, function (req, res, next) {
    User.findById(req.payload.id).then(function (user) {
      if (req.article.author._id.toString() === req.payload.id.toString()) {
        if (typeof req.body.article.title !== "undefined") {
          req.article.title = req.body.article.title;
        }

        if (typeof req.body.article.description !== "undefined") {
          req.article.description = req.body.article.description;
        }

        if (typeof req.body.article.body !== "undefined") {
          req.article.body = req.body.article.body;
        }

        if (typeof req.body.article.tagList !== "undefined") {
          req.article.tagList = req.body.article.tagList;
        }

        req.article
          .save()
          .then(function (article) {
            return res.json({ article: article.toJSONFor(user) });
          })
          .catch(next);
      } else {
        return res.sendStatus(403);
      }
    });
  });
}

// delete article -> {article,remove,portal} => {article,gone,portal} | {article,fail,portal}
if (features.all || features.article.delete) {
  router.delete("/:article", auth.required, function (req, res, next) {
    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        if (req.article.author._id.toString() === req.payload.id.toString()) {
          return req.article.remove().then(function () {
            return res.sendStatus(204);
          });
        } else {
          return res.sendStatus(403);
        }
      })
      .catch(next);
  });
}

// Favorite an article -> {favorite,add,portal} => {favorite,stored,portal} | {favorite,fail,portal}
if (features.all || features.article.favorite.post) {
  router.post("/:article/favorite", auth.required, function (req, res, next) {
    var articleId = req.article._id;

    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        return user.favorite(articleId).then(function () {
          return req.article.updateFavoriteCount().then(function (article) {
            return res.json({ article: article.toJSONFor(user) });
          });
        });
      })
      .catch(next);
  });
}

// Unfavorite an article -> {favorite,remove,portal} => {favorite,gone,portal} | {favorite,fail,portal}
if (features.all || features.article.favorite.delete) {
  router.delete("/:article/favorite", auth.required, function (req, res, next) {
    var articleId = req.article._id;

    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        return user.unfavorite(articleId).then(function () {
          return req.article.updateFavoriteCount().then(function (article) {
            return res.json({ article: article.toJSONFor(user) });
          });
        });
      })
      .catch(next);
  });
}

// return an article's comments -> {article_comment,find,*:o} => {article_comment,fetch,o} | {article_comment,fail,o}
if (features.all || features.article.comments.get) {
  router.get("/:article/comments", auth.optional, function (req, res, next) {
    Promise.resolve(req.payload ? User.findById(req.payload.id) : null)
      .then(function (user) {
        return req.article
          .populate({
            path: "comments",
            populate: {
              path: "author",
            },
            options: {
              sort: {
                createdAt: "desc",
              },
            },
          })
          .execPopulate()
          .then(function (article) {
            return res.json({
              comments: req.article.comments.map(function (comment) {
                return comment.toJSONFor(user);
              }),
            });
          });
      })
      .catch(next);
  });
}

// create a new comment -> {article_comment,add,portal} => {article_comment,stored,portal} | {article_comment,fail,portal}
if (features.all || features.article.comments.post) {
  router.post("/:article/comments", auth.required, function (req, res, next) {
    User.findById(req.payload.id)
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }

        var comment = new Comment(req.body.comment);
        comment.article = req.article;
        comment.author = user;

        return comment.save().then(function () {
          req.article.comments.push(comment);

          return req.article.save().then(function (article) {
            res.json({ comment: comment.toJSONFor(user) });
          });
        });
      })
      .catch(next);
  });
}

// delete comment -> {article_comment,remove,portal} => {article_comment,gone,portal} | {article_comment,fail,portal}
if (features.all || features.article.comments.delete) {
  router.delete("/:article/comments/:comment", auth.required, function (
    req,
    res,
    next
  ) {
    if (req.comment.author.toString() === req.payload.id.toString()) {
      req.article.comments.remove(req.comment._id);
      req.article
        .save()
        .then(Comment.find({ _id: req.comment._id }).remove().exec())
        .then(function () {
          res.sendStatus(204);
        });
    } else {
      res.sendStatus(403);
    }
  });
}

module.exports = router;
