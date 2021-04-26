const tao = require('@tao.js/core');
const { default: TAO, AppCtx } = tao;

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Article = mongoose.model('Article');

TAO.addInterceptHandler({ t: 'article', a: 'locate' }, (tao, data) => {
  const { article, locate } = data;
  if (!article.slug) {
    return new AppCtx(
      'article',
      'fail',
      tao.o,
      article,
      { msg: 'missing article.slug', locate },
      data[tao.o]
    );
  }
});

TAO.addInlineHandler({ t: 'article', a: 'locate' }, (tao, data) => {
  const { article, locate } = data;
  return Article.findOne({ slug: article.slug })
    .populate('author')
    .then((foundArticle) => {
      if (!foundArticle) {
        return new AppCtx('article', 'miss', tao.o, {
          article,
          miss: locate,
          orient: data[tao.o],
        });
      }
      return new AppCtx('article', 'retrieve', tao.o, {
        article: foundArticle,
        retrieve: locate,
        orient: data[tao.o],
      });
    })
    .catch((error) => {
      return new AppCtx('article', 'fail', tao.o, {
        article,
        fail: { error, locate },
        orient: data[tao.o],
      });
    });
});

TAO.addInlineHandler({ t: 'article', a: 'find' }, (tao, data) => {
  const { article, find } = data;
  const { limit = 20, offset = 0, sort = { createdAt: 'desc' } } = find || {};
  return Promise.all([
    Article.find()
      .limit(limit)
      .skip(offset)
      .sort(sort)
      .populate('author')
      .exec(),
    Article.count().exec(),
  ])
    .then(([articles, count]) => {
      return new AppCtx(
        'article',
        'fetch',
        tao.o,
        { articles, count },
        find,
        data[tao.o]
      );
    })
    .catch((err) => {
      return new AppCtx('article', 'fail', tao.o, {
        fail: { error: err, for: find },
        orient: data[tao.o],
      });
    });
});

TAO.addInterceptHandler({ t: 'article_user', a: 'find' }, (tao, data) => {
  const { article_user } = data;
  if (!article_user) {
    return new AppCtx('article_user', 'fail', tao.o, {
      fail: { error: 'missing user' },
    });
  }
  if (!article_user.author) {
    return new AppCtx(
      'author',
      'find',
      tao.o,
      { username: article_user.user },
      { for: { tao, data } },
      data[tao.o]
    );
  }
});

TAO.addInlineHandler({ t: 'author', a: 'find' }, (tao, data) => {
  const { author, find } = data;
  return User.findOne({ username: author.username }).then((author) => {
    return new AppCtx(
      'author',
      'retrieve',
      tao.o,
      { toFor: find.for },
      author,
      data[tao.o]
    );
  });
});

TAO.addInlineHandler({ t: 'author', a: 'retrieve' }, (tao, data) => {
  const { author, retrieve: authorModel } = data;
  if (!author || !author.toFor) {
    return;
  }
  const { tao: trigram, data: d } = author.toFor;
  return new AppCtx(
    trigram.t,
    trigram.a,
    trigram.o,
    { ...d[trigram.t], author: authorModel },
    d[trigram.a],
    d[trigram.o]
  );
});

function defaultFind(find) {
  const { limit = 20, offset = 0, sort = { createdAt: 'desc' } } = find || {};
  return { limit, offset, sort };
}

TAO.addInlineHandler({ t: 'article_user', a: 'find' }, (tao, data) => {
  const { article_user, find } = data;
  const { limit, offset, sort } = defaultFind(find);
  const query = { author: article_user.author._id };
  return Article.find(query)
    .limit(limit)
    .skip(offset)
    .sort(sort)
    .populate('author')
    .then((articles) => {
      return new AppCtx(
        'article_user',
        'fetch',
        tao.o,
        articles,
        find,
        data[tao.o]
      );
    })
    .catch((err) => {
      return new AppCtx(
        'article_user',
        'fail',
        tao.o,
        article_user,
        { error: err, find },
        data[tao.o]
      );
    });
});

TAO.addInlineHandler({ t: 'article_user', a: 'find' }, (tao, data) => {
  const { article_user } = data;
  const query = { author: article_user.author._id };
  return Article.find(query)
    .count()
    .then((count) => {
      return new AppCtx('article_user', 'count', tao.o, {
        count,
        orient: data[tao.o],
      });
    })
    .catch((err) => {
      return new AppCtx(
        'article_user',
        'fail',
        tao.o,
        article_user,
        { error: err, count: true },
        data[tao.o]
      );
    });
});

TAO.addInterceptHandler({ t: 'article_tag', a: 'find' }, (tao, data) => {
  const { article_tag, find } = data;
  if (!article_tag || !article_tag.tag) {
    return new AppCtx(
      'article_tag',
      'fail',
      tao.o,
      article_tag,
      { error: 'missing tag', find },
      data[tao.o]
    );
  }
});

TAO.addInlineHandler({ t: 'article_tag', a: 'find' }, (tao, data) => {
  const { article_tag = {}, find = {} } = data;
  const { limit, offset, sort } = defaultFind(find);
  const query = { tagList: { $in: [article_tag.tag] } };
  return Article.find(query)
    .limit(limit)
    .skip(offset)
    .sort(sort)
    .populate('author')
    .then((articles) => {
      return new AppCtx(
        'article_tag',
        'fetch',
        tao.o,
        articles,
        { ...find, tag: article_tag.tag },
        data[tao.o]
      );
    })
    .catch((err) => {
      return new AppCtx(
        'article_tag',
        'fail',
        tao.o,
        article_tag,
        { error: err, find },
        data[tao.o]
      );
    });
});

// TAO.addInlineHandler({ t: 'article_favorite', a: 'find' }, (tao, data) => {
//   const { article_favorite, find = {}, [tao.o]: orientation } = data;
//   const thenDo = articleFetchPromiseHandler(find, tao.o, orientation);
//   return agent.Articles.favoritedBy(article_favorite.user, find.page)
//     .then(thenDo);
// });
