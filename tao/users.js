const tao = require('@tao.js/core');
const { default: TAO, AppCtx } = tao;

var mongoose = require('mongoose');
var User = mongoose.model('User');
//// var auth = require('../auth');

//// TAO.addInterceptHandler({ o: 'portal' }, (tao, data) => {
////   if (!data.portal.userId) {
////     // convert portal.token into userId
////     // data.portal.userId = jwt.decode();
////     return new AppCtx(tao.t, tao.a, 'portal', data);
////   }
//// });

TAO.addInlineHandler({ t: 'user', a: 'find', o: 'portal' }, (tao, data) => {
  const { find, portal } = data;
  return User.findById(portal.userId)
    .then(foundUser => {
      if (!foundUser) {
        return new AppCtx('user', 'fail', 'portal',
          { fail: { auth: true, error: 'user not found' }, portal: { token: portal.token } }
        );
      }
      const user = foundUser.toAuthJSON()
      if (find && find.forUpdate) {
        return new AppCtx('user', 'update', 'portal', foundUser, find.forUpdate, portal);
      }
      return new AppCtx('user', 'retrieve', 'portal', user, foundUser, { token: user.token });
    })
    .catch(err => {
      const fail = { error: err };
      if (find && find.forUpdate) {
        fail.forUpdate = find.forUpdate;
      }
      return new AppCtx('user', 'fail', 'portal', { fail, portal: { token: portal.token }})
    });
});

TAO.addInlineHandler({ t: 'user', a: 'update', o: 'portal' }, (tao, data) => {
  const { user, update, portal } = data;
  // only update fields that were actually passed...
  if (typeof update.username !== 'undefined') {
    user.username = update.username;
  }
  if (typeof update.email !== 'undefined') {
    user.email = update.email;
  }
  if (typeof update.bio !== 'undefined') {
    user.bio = update.bio;
  }
  if (typeof update.image !== 'undefined') {
    user.image = update.image;
  }
  if (typeof update.password !== 'undefined') {
    user.setPassword(update.password);
  }

  return user.save()
    .then(() => {
      storedUser = user.toAuthJSON();
      return new AppCtx('user', 'stored', 'portal', storedUser, null, { token: storedUser.token });
    })
    .catch(err => {
      const fail = { error: err, forUpdate: update };
      return new AppCtx('user', 'fail', 'portal', user, fail, portal);
    });
});

TAO.addInterceptHandler({ t: 'user', a: 'update', o: 'portal' }, (tao, data) => {
  const { user, update, portal } = data;
  if (!user) {
    return new AppCtx('user', 'find', 'portal', { find: { forUpdate: update }, portal });
  }
});

TAO.addInterceptHandler({ t: 'user', a: 'find', o: 'anon' }, (tao, data) => {
  const { email, password } = data.user;
  const errors = {};
  if (!email) {
    errors.email = 'cannot be blank';
  }
  if (!password) {
    errors.password = 'cannot be blank';
  }
  if (Object.keys(errors).length) {
    return new AppCtx('user', 'fail', 'anon', data.user, { auth: true, errors });
  }
});


TAO.addInlineHandler({ t: 'user', a: 'add', o: 'anon' }, (tao, data) => {
  const { username, email, password } = data.add;
  const newUser = new User({ username, email });
  newUser.setPassword(password);
  return newUser.save()
    .then(() => {
      const user = newUser.toAuthJSON();
      return new AppCtx('user', 'stored', 'anon', user);
    })
    .catch(err => {
      const fail = { error: err, add: { username, email } };
      return new AppCtx('user', 'fail', 'anon', { fail });
    });
});

// where can this be run?
TAO.addInlineHandler({ t: 'user', a: 'stored', o: 'anon' }, (tao, data) => {
  const { user } = data;
  return new AppCtx('user', 'enter', 'portal', user, undefined, { token: user.token });
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
