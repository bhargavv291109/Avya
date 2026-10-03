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

/* =========================
   ADMIN SESSION
========================= */

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
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);


/* =========================
   WEBSITE FILES
========================= */

app.use(express.static(__dirname));


/* =========================
   HELPERS
========================= */

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


/* =========================
   ADMIN PAGE
========================= */

app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});


/* =========================
   PUBLIC REVIEWS
========================= */

app.get("/api/reviews", (req, res) => {

  const rows = db
    .prepare(`
      SELECT
        id,
        name,
        service,
        rating,
        review,
        featured,
        created_at
      FROM reviews
      WHERE approved=1
      ORDER BY featured DESC, created_at DESC
    `)
    .all();

  res.json(rows);

});


/* =========================
   SUBMIT REVIEW
========================= */

app.post("/api/reviews", (req, res) => {

  const name =
    clean(req.body.name, 80);

  const service =
    clean(req.body.service, 60);

  const review =
    clean(req.body.review, 700);

  const rating =
    Number(req.body.rating);

  const consent =
    req.body.consent === true;


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


  const now =
    new Date().toISOString();


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


/* =========================
   ADMIN LOGIN
========================= */

app.post("/api/admin/login", (req, res) => {

  const password =
    typeof req.body.password === "string"
      ? req.body.password
      : "";


  if (!process.env.ADMIN_PASSWORD) {

    return res.status(500).json({
      error:
        "ADMIN_PASSWORD is not configured."
    });

  }


  if (
    password !==
    process.env.ADMIN_PASSWORD
  ) {

    return res.status(401).json({
      error:
        "Incorrect password."
    });

  }


  req.session.admin = true;


  req.session.save((err) => {

    if (err) {

      console.error(
        "Session save error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not create admin session."
      });

    }


    res.json({
      ok: true
    });

  });

});


/* =========================
   ADMIN LOGOUT
========================= */

app.post("/api/admin/logout", (req, res) => {

  req.session.destroy((err) => {

    if (err) {

      return res.status(500).json({
        error:
          "Logout failed."
      });

    }


    res.json({
      ok: true
    });

  });

});


/* =========================
   ADMIN REVIEWS
========================= */

app.get(
  "/api/admin/reviews",
  adminOnly,
  (req, res) => {

    const rows = db
      .prepare(`
        SELECT *
        FROM reviews
        ORDER BY approved ASC, created_at DESC
      `)
      .all();

    res.json(rows);

  }
);


/* =========================
   APPROVE REVIEW
========================= */

app.patch(
  "/api/admin/reviews/:id/approve",
  adminOnly,
  (req, res) => {

    const id =
      Number(req.params.id);

    db.prepare(
      "UPDATE reviews SET approved=1 WHERE id=?"
    ).run(id);


    res.json({
      ok: true
    });

  }
);


/* =========================
   REJECT REVIEW
========================= */

app.patch(
  "/api/admin/reviews/:id/reject",
  adminOnly,
  (req, res) => {

    const id =
      Number(req.params.id);

    db.prepare(
      "UPDATE reviews SET approved=0, featured=0 WHERE id=?"
    ).run(id);


    res.json({
      ok: true
    });

  }
);


/* =========================
   FEATURE REVIEW
========================= */

app.patch(
  "/api/admin/reviews/:id/feature",
  adminOnly,
  (req, res) => {

    const id =
      Number(req.params.id);


    const row = db
      .prepare(
        "SELECT featured FROM reviews WHERE id=?"
      )
      .get(id);


    if (!row) {

      return res.status(404).json({
        error:
          "Review not found."
      });

    }


    db.prepare(
      "UPDATE reviews SET featured=? WHERE id=?"
    ).run(
      row.featured ? 0 : 1,
      id
    );


    res.json({
      ok: true
    });

  }
);


/* =========================
   DELETE REVIEW
========================= */

app.delete(
  "/api/admin/reviews/:id",
  adminOnly,
  (req, res) => {

    const id =
      Number(req.params.id);

    db.prepare(
      "DELETE FROM reviews WHERE id=?"
    ).run(id);


    res.json({
      ok: true
    });

  }
);


/* =========================
   MAIN WEBSITE
========================= */

app.get("*", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `AVYA running on port ${PORT}`
    );

  }
);
