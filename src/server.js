var env = require('./env')
var config = require('./config')(env)
//var credentials = require('./credentials')(config)
var fs = require('fs')
var path = require('path')
var http = require('http')
//var https = require('https')
var express = require('express')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var passport = require('passport')
var steam = require('passport-steam')
var pg = require('pg')
var pool = new pg.Pool(config.db)
var RedisStore = require('connect-redis')(session)
var migrations = require('./migrations')

// Auth routes
var auth = require('./routes/auth')(config, pool)

// Page routes
var index = require('./routes/index')
var register = require('./routes/register')

// API routes
var roster = require('./routes/roster')
var user = require('./routes/roster')
var standings = require('./routes/standings')

var app = express()

console.dir(config, { depth: null })

var startup = migrations.migrateIfNeeded(pool, migrations.getMigrations(fs, path, path.join(__dirname, 'migrations')))

startup.then(versions => {
  console.log(`RUN ${versions.filter(version => version === false).length} MIGRATIONS`)
  passport.serializeUser(function(user, done) {
    done(null, user)
  })

  passport.deserializeUser(function(user, done) {
    done(null, user)
  })

  passport.use(new steam.Strategy({
      returnURL: 'http://' + config.server.host + ':' + config.server.port + '/auth/steam/return',
      realm: 'http://' + config.server.host + ':' + config.server.port,
      apiKey: config.server.steam_api_key
    }, function(identifier, profile, done) {
      return done(null, { id: identifier, profile: profile })
    }
  ))

  app.use(cookieParser(config.server.secret))
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(session({
    store: new RedisStore({
      host: config.redis.host,
      port: config.redis.port
    }),
    secret: config.server.secret,
    resave: true,
    saveUninitialized: true
  }))
  app.use(passport.initialize())
  app.use(passport.session())

  app.get('/auth/steam', passport.authenticate('steam'))
  app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: config.server.website_url ? config.server.website_url : '/' }),
    auth.steamIdReturn)
  app.get('/logout', auth.logout)

  app.get('/', index)

  app.get('/register', register.form)
  app.post('/register', register.register)

  app.get('/api/001/roster', roster)
  app.get('/api/001/user', user)
  app.get('/api/001/standings', standings)

  http.createServer(app).listen(config.server.port, function() {
    console.log('Listening to HTTP connections on port ' + config.server.port)
  })
  //https.createServer(credentials, app).listen(config.server.https_port)
}).catch(err => {
  console.error(err)
})
