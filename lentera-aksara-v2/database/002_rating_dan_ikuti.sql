-- Rating novel (1-5 bintang) dan ikuti penulis. Aman dijalankan berulang kali.
CREATE TABLE IF NOT EXISTS novel_ratings (
  user_id    INT NOT NULL,
  novel_id   INT NOT NULL,
  stars      TINYINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, novel_id),
  KEY idx_ratings_novel (novel_id)
);

CREATE TABLE IF NOT EXISTS author_follows (
  user_id    INT NOT NULL,
  author_id  INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, author_id),
  KEY idx_follows_author (author_id)
);
