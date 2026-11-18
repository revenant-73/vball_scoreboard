CREATE TABLE rooms (
 code TEXT PRIMARY KEY NOT NULL,
 control_token TEXT NOT NULL,
 display_token TEXT NOT NULL,
 state TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL,
 paired INTEGER NOT NULL DEFAULT 0,
 last_op TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX rooms_expiry ON rooms(expires_at);
