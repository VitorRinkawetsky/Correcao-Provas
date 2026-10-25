-- Migracao aditiva para ambientes que ja possuem o schema do SGP.
-- Pode ser aplicada sem remover professores ou outros dados existentes.

USE correcao_provas;

CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    professor_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
    KEY idx_auth_sessions_expiration (expires_at),
    KEY idx_auth_sessions_professor_expiration (professor_id, expires_at),
    CONSTRAINT fk_auth_sessions_professor
        FOREIGN KEY (professor_id) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;
