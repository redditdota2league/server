var emojify = require('../lib/emojify')
var shortid = require('shortid')

function list(templates, season, series, req, res) {
  var season_id = emojify.unemojify(req.params.season_id)
  var serial = req.query.serial

  season.getSeason(season_id).then(season => {
    season.vanity = emojify.emojify(season.id)
    return series.getSeries({
      season_id: season_id,
      serial: serial
    }).then(series => {
      series = series.map(_series => {
        _series.vanity = emojify.emojify(_series.id)
        _series.season_vanity = emojify.emojify(_series.season_id)
        if (_series.home_team_id) {
          _series.home = {}
          _series.home.id = _series.home_team_id
          _series.home.vanity = emojify.emojify(_series.home_team_id)
          _series.home.name = _series.home_team_name
          _series.home.logo = _series.home_team_logo
          _series.home.points = _series.home_points
        }
        if (_series.away_team_id) {
          _series.away = {}
          _series.away.id = _series.away_team_id
          _series.away.vanity = emojify.emojify(_series.away_team_id)
          _series.away.name = _series.away_team_name
          _series.away.logo = _series.away_team_logo
          _series.away.points = _series.away_points
        }
        return _series
      })
      var html = templates.series.list({
        user: req.user,
        season: season,
        series: series
      })

      res.send(html)
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function create(templates, season, team, req, res) {
  if (!req.user || !req.user.isAdmin) {
    res.sendStatus(403)
    return
  }

  var season_id = emojify.unemojify(req.params.season_id)

  season.getSeason(season_id).then(season => {
    return team.getTeams(season_id).then(teams => {
      var html = templates.series.edit({
        user: req.user,
        verb: 'Create',
        season: season,
        teams: teams
      })

      res.send(html)
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function edit(templates, season, team, series, req, res) {
  if (!req.user || !req.user.isAdmin) {
    res.sendStatus(403)
    return
  }

  var season_id = emojify.unemojify(req.params.season_id)
  var id = emojify.unemojify(req.params.id)

  season.getSeason(season_id).then(season => {
    return team.getTeams(season_id).then(teams => {
      return series.getSeries({ series_id: id }).then(series => {
        series = series[0]
        series.home = {}
        series.home.id = series.home_team_id
        series.home.name = series.home_team_name
        series.home.logo = series.home_team_logo
        series.home.points = series.home_points
        series.away = {}
        series.away.id = series.away_team_id
        series.away.name = series.away_team_name
        series.away.logo = series.away_team_logo
        series.away.points = series.away_points
        var html = templates.series.edit({
          user: req.user,
          verb: 'Edit',
          season: season,
          teams: teams,
          series: series
        })

        res.send(html)
      })
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function post(series, req, res) {
  if (!req.user || !req.user.isAdmin) {
    res.sendStatus(403)
    return
  }

  var season_vanity = emojify.emojify(req.body.season_id)
  var id = req.body.id ? req.body.id : shortid.generate()
  var s = req.body
  s.id = id
  if (s.home_team_id === '') {
    s.home_team_id = null
  }
  if (s.away_team_id === '') {
    s.away_team_id = null
  }
  var match1 = s.match_1_id
  var match2 = s.match_2_id
  if (!match1) {
    s.match_1_id = null
  }
  if (!match2) {
    s.match_2_id = null
  }
  var forfeit1 = s.match_1_forfeit_home
  var forfeit2 = s.match_2_forfeit_home
  if (forfeit1 === 'home') {
    s.match_1_forfeit_home = true
  } else if (forfeit1 === 'away') {
    s.match_1_forfeit_home = false
  } else {
    s.match_1_forfeit_home = null
  }
  if (forfeit2 === 'home') {
    s.match_2_forfeit_home = true
  } else if (forfeit2 === 'away') {
    s.match_2_forfeit_home = false
  } else {
    s.match_2_forfeit_home = null
  }

  series.saveSeries(s).then(() => {
    var series_vanity = emojify.emojify(s.id)
    res.redirect('/seasons/' + season_vanity + '/series/' + series_vanity)
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function remove(series, req, res) {
  if (!req.user || !req.user.isAdmin) {
    res.sendStatus(403)
    return
  }

  var season_vanity = emojify.emojify(req.body.season_id)
  var id = req.body.id

  series.deleteSeries(id).then(() => {
    res.redirect('/seasons/' + season_vanity + '/series')
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function standings(templates, season, series, pairings, req, res) {
  var season_id = emojify.unemojify(req.params.season_id)
  var serial = Number.parseInt(req.params.serial)

  series.getCurrentSerial(season_id, serial).then(serial => {
    return season.getSeason(season_id).then(season => {
      season.vanity = emojify.emojify(season.id)
      return series.getStandings(season_id, serial).then(standings => {
        return pairings.getModifiedMedianScores(season.id, serial).then(
          scores => {
          standings = standings.map(standing => {
            standing.vanity = emojify.emojify(standing.id)
            standing.tiebreaker = scores[standing.id]
            return standing
          })
          var html = templates.series.standings({
            user: req.user,
            season: season,
            standings: standings
          })
          res.send(html)
        })
      })
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function matchups(templates, season, series, pairings, req, res) {
  var season_id = emojify.unemojify(req.params.season_id)
  var serial = Number.parseInt(req.params.serial)

  series.getCurrentSerial(season_id, serial).then(serial => {
    return season.getSeason(season_id).then(season => {
      season.vanity = emojify.emojify(season.id)
      return pairings.getMatchups(season.id, serial).then(matchups => {
        matchups = matchups.map(matchup => {
          matchup.home.vanity = emojify.emojify(matchup.home.id)
          if (matchup.away.id) {
            matchup.away.vanity = emojify.emojify(matchup.away.id)
          }
          return matchup
        })
        var html = templates.series.matchups({
          user: req.user,
          season: season,
          serial: serial,
          matchups: matchups
        })
        res.send(html)
      })
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function currentStandings(templates, _season, series, pairings, req, res) {
  if (!req.params) {
    req.params = {}
  }
  _season.getActiveSeason().then(season => {
    req.params.season_id = emojify.emojify(season.id)
    return series.getCurrentSerial(season.id).then(serial => {
      req.params.serial = serial
      return standings(templates, _season, series, pairings, req, res)
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

function currentMatchups(templates, _season, series, pairings, req, res) {
  if (!req.params) {
    req.params = {}
  }
  _season.getActiveSeason().then(season => {
    req.params.season_id = emojify.emojify(season.id)
    return series.getCurrentSerial(season.id).then(serial => {
      req.params.serial = serial
      return matchups(templates, _season, series, pairings, req, res)
    })
  }).catch(err => {
    console.error(err)
    res.sendStatus(500)
  })
}

module.exports = (templates, season, team, series, pairings) => {
  return {
    list: {
      route: '/seasons/:season_id/series',
      handler: list.bind(null, templates, season, series)
    },
    create: {
      route: '/seasons/:season_id/series/create',
      handler: create.bind(null, templates, season, team),
    },
    edit: {
      route: '/seasons/:season_id/series/:id/edit',
      handler: edit.bind(null, templates, season, team, series),
    },
    post: {
      route: '/series/edit',
      handler: post.bind(null, series)
    },
    remove: {
      route: '/series/delete',
      handler: remove.bind(null, series)
    },
    standings: {
      route: '/seasons/:season_id/standings',
      handler: standings.bind(null, templates, season, series, pairings)
    },
    matchups: {
      route: '/seasons/:season_id/matchups/:serial?',
      handler: matchups.bind(null, templates, season, series, pairings)
    },
    currentStandings: {
      route: '/standings',
      handler: currentStandings.bind(null, templates, season, series, pairings)
    },
    currentMatchups: {
      route: '/matchups',
      handler: currentMatchups.bind(null, templates, season, series, pairings)
    }
  }
}
