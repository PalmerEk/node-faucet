CREATE DATABASE faucet;

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- drop table transactions;

CREATE TABLE IF NOT EXISTS transactions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    address VARCHAR(34) NOT NULL,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(16) NOT NULL,
    amount REAL NOT NULL,
    referrer VARCHAR(34) NULL,
    txid VARCHAR(64) NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

ALTER TABLE transactions drop dispensed;
ALTER TABLE transactions ADD txid VARCHAR(64) NULL;