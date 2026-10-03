require("dotenv").config();

const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(
  process.env.DB_FILE || "avya_reviews.db"
);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`);

app.use(express.json({ limit: "20kb" }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

/* Serve website files from the repository root */
app.use(express.static(__dirname));

function clean(v, max) {
  return typeof v === "string"
    ? v.trim().slice(0, max)
    : "";
}

function adminOnly(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }

  res.status(401).json({
    error: "Unauthorized"
  });
}

/* Admin page */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

/* Public reviews */
app.get("/api/reviews", (req, res) => {
  const rows = db
    .prepare(`
      SELECT id,name,service,rating,review,featured,created_at
      FROM reviews
      WHERE approved=1
      ORDER BY featured DESC, created_at DESC
    `)
    .all();

  res.json(rows);
});

/* Submit review */
app.post("/api/reviews", (req, res) => {
  const name = clean(req.body.name, 80);
  const service = clean(req.body.service, 60);
  const review = clean(req.body.review, 700);
  const rating = Number(req.body.rating);
  const consent = req.body.consent === true;

  if (
    !name ||
    !service ||
    !review ||
    ![1, 2, 3, 4, 5].includes(rating) ||
    !consent
  ) {
    return res.status(400).json({
      error:
        "Please complete all fields and confirm the consent checkbox."
    });
  }

  const now = new Date().toISOString();

  const info = db
    .prepare(`
      INSERT INTO reviews(
        name,
        service,
        rating,
        review,
        approved,
        featured,
        created_at
      )
      VALUES(?,?,?,?,0,0,?)
    `)
    .run(
      name,
      service,
      rating,
      review,
      now
    );

  res.status(201).json({
    ok: true,
    id: info.lastInsertRowid
  });
});

/* Admin login */
app.post("/api/admin/login", (req, res) => {
  const password =
    typeof req.body.password === "string"
      ? req.body.password
      : "";

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      error: "ADMIN_PASSWORD is not configured."
    });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Incorrect password."
    });
  }

  req.session.admin = true;

  res.json({
    ok: true
  });
});

/* Admin logout */
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

/* Admin reviews */
app.get("/api/admin/reviews", adminOnly, (req, res) => {
  res.json(
    db
      .prepare(
        "SELECT * FROM reviews ORDER BY approved ASC, created_at DESC"
      )
      .all()
  );
});

/* Approve review */
app.patch(
  "/api/admin/reviews/:id/approve",
  adminOnly,
  (req, res) => {
    const id = Number(req.params.id);

    db.prepare(
      "UPDATE reviews SET approved=1 WHERE id=?"
    ).run(id);

    res.json({
      ok: true
    });
  }
);

/* Reject review */
app.patch(
  "/api/admin/reviews/:id/reject",
  adminOnly,
  (req, res) => {
    const id = Number(req.params.id);

    db.prepare(
      "UPDATE reviews SET approved=0, featured=0 WHERE id=?"
    ).run(id);

    res.json({
      ok: true
    });
  }
);

/* Feature / unfeature review */
app.patch(
  "/api/admin/reviews/:id/feature",
  adminOnly,
  (req, res) => {
    const id = Number(req.params.id);

    const row = db
      .prepare(
        "SELECT featured FROM reviews WHERE id=?"
      )
      .get(id);

    if (!row) {
      return res.status(404).json({
        error: "Review not found."
      });
    }

    db.prepare(
      "UPDATE reviews SET featured=? WHERE id=?"
    ).run(row.featured ? 0 : 1, id);

    res.json({
      ok: true
    });
  }
);

/* Delete review */
app.delete(
  "/api/admin/reviews/:id",
  adminOnly,
  (req, res) => {
    db.prepare(
      "DELETE FROM reviews WHERE id=?"
    ).run(Number(req.params.id));

    res.json({
      ok: true
    });
  }
);

/* Main website */
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.listen(PORT, () => {
  console.log(
    `AVYA running on http://localhost:${PORT}`
  );
});
