CREATE TABLE playoff_series (
  id varchar(50) PRIMARY KEY NOT NULL,
  round integer NOT NULL,
  season_id varchar(50) NOT NULL REFERENCES season (id),
  home_team_id varchar(50) REFERENCES team (id),
  away_team_id varchar(50) REFERENCES team (id),
  home_points integer,
  away_points integer,
  match_url varchar(50),
  division_id varchar(50) NOT NULL REFERENCES division (id),
  match_number integer DEFAULT 0,
  match_time timestamp with time zone
);
