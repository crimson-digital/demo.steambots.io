DROP TABLE IF EXISTS `item`;
CREATE TABLE `item` (
  `id` bigint(20) unsigned NOT NULL,
  `state` varchar(16) DEFAULT NULL,
  `owner_steam_id` varchar(17) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `quality` varchar(32) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `inspect_link` varchar(255) DEFAULT NULL,
  `guide_price` double(6,2) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `action` varchar(32) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;