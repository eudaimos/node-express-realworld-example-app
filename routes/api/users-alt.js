const tao = require('@tao.js/core');
const Transponder = require('@tao.js/utils').Transponder;
const { default: TAO } = tao;
var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');
const features = require('../../features.json').routes;

function getTokenFromHeader(req){
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token' ||
      req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

router.get('/user', auth.required, async function(req, res, next){
  if (!features.user.all && !features.user.get) {
    // console.log('req.payload:', req);
    User.findById(req.payload.id).then(function(user){
      if(!user){ return res.sendStatus(401); }

      return res.json({user: user.toAuthJSON()});
    }).catch(next);
    return;
  }
  const token = getTokenFromHeader(req);
  const transponder = new Transponder(TAO, undefined, 3000);
  transponder.addInlineHandler({ t: 'user', a: 'enter', o: 'portal' }, (tao, data) => {
    const { user } = data;
    res.json({ user });
  })
  transponder.addInlineHandler({ t: 'user', a: 'fail', o: 'portal' }, (tao, data) => {
      const { fail, portal } = data;
      if (fail.auth) {
        res.sendStatus(401);
      } else {
        next(fail.error);
      }
    });
  try {
    await transponder.setCtx({ t: 'user', a: 'find', o: 'portal' }, { portal: { token, userId: req.payload.id }});
  } catch (toErr) {
    console.error(toErr);
    res.sendStatus(408);
  }
});

router.put('/user', auth.required, async function(req, res, next){
  if (!features.user.all && !features.user.put) {
    User.findById(req.payload.id).then(function(user){
      if(!user){ return res.sendStatus(401); }

      // only update fields that were actually passed...
      if(typeof req.body.user.username !== 'undefined'){
        user.username = req.body.user.username;
      }
      if(typeof req.body.user.email !== 'undefined'){
        user.email = req.body.user.email;
      }
      if(typeof req.body.user.bio !== 'undefined'){
        user.bio = req.body.user.bio;
      }
      if(typeof req.body.user.image !== 'undefined'){
        user.image = req.body.user.image;
      }
      if(typeof req.body.user.password !== 'undefined'){
        user.setPassword(req.body.user.password);
      }

      return user.save().then(function(){
        return res.json({user: user.toAuthJSON()});
      });
    }).catch(next);
    return;
  }
  const { user: update } = req.body;
  if (!update) {
    res.sendStatus(400);
    return next();
  }
  const token = getTokenFromHeader(req);
  const transponder = new Transponder(TAO, undefined, 3000);
  transponder.addInlineHandler({ t: 'user', a: 'stored', o: 'portal' }, (tao, data) => {
    const { user } = data;
    res.json({ user });
  });
  transponder.addInlineHandler({ t: 'user', a: 'fail', o: 'portal' }, (tao, data) => {
    const { fail, portal } = data;
    if (fail.auth) {
      res.sendStatus(401);
    } else {
      next(fail.error);
    }
  });
  try {
    await transponder.setCtx(
      { t: 'user', a: 'update', o: 'portal' },
      { update, portal: { token, userId: req.payload.id } }
    );
  } catch (toErr) {
    console.error(toErr);
    res.sendStatus(408);
  }

});

router.post('/users/login', function(req, res, next){
  if (!features.user.all && !features.user.login.post) {
    if(!req.body.user.email){
      return res.status(422).json({errors: {email: "can't be blank"}});
    }

    if(!req.body.user.password){
      return res.status(422).json({errors: {password: "can't be blank"}});
    }

    passport.authenticate('local', {session: false}, function(err, user, info){
      if(err){ return next(err); }

      if(user){
        user.token = user.generateJWT();
        return res.json({user: user.toAuthJSON()});
      } else {
        return res.status(422).json(info);
      }
    })(req, res, next);
    return;
  }
});

router.post('/users', async function(req, res, next){
  if (!features.user.all && !features.user.post) {
    var user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);

    user.save().then(function(){
      return res.json({user: user.toAuthJSON()});
    }).catch(next);
    return;
  }
  const { user: add } = req.body;
  if (!add) {
    res.sendStatus(400);
    return next();
  }
  const token = getTokenFromHeader(req);
  const transponder = new Transponder(TAO, undefined, 3000);
  transponder.addInlineHandler({ t: 'user', a: 'stored', o: 'anon' }, (tao, data) => {
    const { user } = data;
    res.json({ user });
  });
  transponder.addInlineHandler({ t: 'user', a: 'fail', o: 'anon' }, (tao, data) => {
    const { fail } = data;
    if (fail.auth) {
      res.sendStatus(401);
    } else {
      next(fail.error);
    }
  });
  try {
    await transponder.setCtx(
      { t: 'user', a: 'add', o: 'anon' },
      { add }
    );
  } catch (toErr) {
    console.error(toErr);
    res.sendStatus(408);
  }
});

module.exports = router;
