-- Jadwal terbit bab + balasan komentar. Aman dijalankan berulang kali (MySQL 5.7+/8).

-- 1) chapters.publish_at
SET @q = (SELECT IF(COUNT(*)=0, 'ALTER TABLE chapters ADD COLUMN publish_at DATETIME NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chapters' AND column_name='publish_at');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- 2) indeks untuk pencarian bab yang jatuh tempo
SET @q = (SELECT IF(COUNT(*)=0, 'CREATE INDEX idx_chapters_due ON chapters (status, publish_at)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='chapters' AND index_name='idx_chapters_due');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- 3) comments.parent_id (tanpa foreign key; balasan dihapus lewat kode saat komentar induk dihapus)
SET @q = (SELECT IF(COUNT(*)=0, 'ALTER TABLE comments ADD COLUMN parent_id INT NULL', 'DO 0')
  FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='comments' AND column_name='parent_id');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

SET @q = (SELECT IF(COUNT(*)=0, 'CREATE INDEX idx_comments_parent ON comments (parent_id)', 'DO 0')
  FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='comments' AND index_name='idx_comments_parent');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
