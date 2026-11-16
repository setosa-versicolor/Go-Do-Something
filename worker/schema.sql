-- One row per typed request. Nothing here says who typed it.
CREATE TABLE IF NOT EXISTS says (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,      -- when, to the hour, UTC: 2026-11-16T19:00Z
  text TEXT NOT NULL,      -- what was typed, at most 200 characters
  heard TEXT NOT NULL,     -- the phrases the app understood, joined with |
  lost INTEGER NOT NULL,   -- 1 if it understood none of it
  picks INTEGER,           -- how many picks came back, 0 to 3
  minutes INTEGER          -- the time they said they had
);
CREATE INDEX IF NOT EXISTS says_hour ON says (hour);
