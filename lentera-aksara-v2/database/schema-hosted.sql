
CREATE TABLE users(
  id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(40) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL, password_hash VARCHAR(100) NOT NULL,
  role ENUM('reader','author','admin') DEFAULT 'reader', is_active TINYINT(1) DEFAULT 1,
  bio TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE genres(id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40) UNIQUE NOT NULL, slug VARCHAR(40) UNIQUE NOT NULL);
CREATE TABLE novels(
  id INT AUTO_INCREMENT PRIMARY KEY, author_id INT NOT NULL, type ENUM('novel','comic') NOT NULL DEFAULT 'novel', title VARCHAR(150) NOT NULL,
  synopsis TEXT, cover_url VARCHAR(255), tags VARCHAR(255),
  status ENUM('ongoing','completed') DEFAULT 'ongoing',
  publish_status ENUM('draft','pending','published','rejected') DEFAULT 'draft',
  views INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE,
  FULLTEXT(title,synopsis));
CREATE TABLE novel_genres(novel_id INT, genre_id INT, PRIMARY KEY(novel_id,genre_id),
  FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE, FOREIGN KEY(genre_id) REFERENCES genres(id) ON DELETE CASCADE);
CREATE TABLE chapters(
  id INT AUTO_INCREMENT PRIMARY KEY, novel_id INT NOT NULL, number INT NOT NULL, title VARCHAR(150) NOT NULL,
  content MEDIUMTEXT, status ENUM('draft','published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(novel_id,number),
  FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE);
CREATE TABLE chapter_pages(
  id INT AUTO_INCREMENT PRIMARY KEY, chapter_id INT NOT NULL, position INT NOT NULL, image_url VARCHAR(500) NOT NULL,
  KEY(chapter_id,position), FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE);
CREATE TABLE library(user_id INT, novel_id INT, added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,novel_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE);
CREATE TABLE reading_progress(user_id INT, novel_id INT, chapter_id INT NOT NULL, scroll_pct TINYINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(user_id,novel_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE);
CREATE TABLE bookmarks(id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, chapter_id INT, note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,chapter_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE);
CREATE TABLE comments(id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, chapter_id INT, body VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE);
CREATE TABLE reports(id INT AUTO_INCREMENT PRIMARY KEY, reporter_id INT, novel_id INT, reason VARCHAR(500),
  status ENUM('open','resolved') DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(novel_id) REFERENCES novels(id) ON DELETE CASCADE);
CREATE TABLE notifications(id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, message VARCHAR(255), is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);

-- DATA CONTOH (password diisi lewat: npm run seed -> "Password123!")
INSERT INTO users(username,email,password_hash,role) VALUES
 ('admin','admin@lenteraaksara.test','x','admin'),
 ('penulis_demo','penulis@lenteraaksara.test','x','author'),
 ('pembaca_demo','pembaca@lenteraaksara.test','x','reader');
INSERT INTO genres(name,slug) VALUES('Romance','romance'),('Fantasi','fantasi'),('Horor','horor'),('Aksi','aksi'),
 ('Misteri','misteri'),('Kerajaan','kerajaan'),('Komedi','komedi'),('Drama','drama');
INSERT INTO novels(author_id,title,synopsis,cover_url,tags,status,publish_status,views) VALUES
 (2,'Pena di Ujung Senja','Seorang penjaga perpustakaan tua menemukan pena yang menulis takdir pemiliknya. (Cerita contoh orisinal.)','/covers/pena.svg','pena,takdir','ongoing','published',1520),
 (2,'Kerajaan di Balik Kabut','Putri yang dilupakan memimpin pemberontakan senyap melawan raja kabut. (Cerita contoh orisinal.)','/covers/kabut.svg','kerajaan,petualangan','completed','published',980);
INSERT INTO novel_genres VALUES(1,2),(1,8),(2,6),(2,2);
INSERT INTO chapters(novel_id,number,title,content,status) VALUES
 (1,1,'Perpustakaan Senja','Lampu minyak di meja Laras berkedip pelan. Di antara debu buku-buku tua, ia menemukan sebatang pena bulu yang hangat disentuh...','published'),
 (1,2,'Tinta Pertama','Tinta pertama jatuh, dan kata-kata mulai menulis dirinya sendiri...','published'),
 (2,1,'Kabut Turun','Kabut turun lebih awal hari itu, dan Putri Anindya tahu ada yang berubah di istana...','published');
