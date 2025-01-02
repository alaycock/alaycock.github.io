import { FaGithub } from '@react-icons/all-files/fa/FaGithub';
import { FaInstagram } from '@react-icons/all-files/fa/FaInstagram';
import { FaLinkedin } from '@react-icons/all-files/fa/FaLinkedin';
import { FaStrava } from '@react-icons/all-files/fa/FaStrava';
import * as React from 'react';

import * as config from '@/lib/config';

import styles from './styles.module.css';

export function FooterImpl() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.copyright}>
        Copyright {currentYear} {config.author}
      </div>

      <div className={styles.social}>
        <a
          className={styles.github}
          href={`https://github.com/${config.github}`}
          title={`GitHub @${config.github}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaGithub />
        </a>
        <a
          className={styles.linkedin}
          href={`https://www.linkedin.com/in/${config.linkedin}`}
          title={`LinkedIn ${config.author}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaLinkedin />
        </a>
        <a
          className={styles.instagram}
          href={`https://www.instagram.com/${config.instagram}`}
          title={`Instagram ${config.author}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaInstagram />
        </a>
        <a
          className={styles.strava}
          href={`https://www.strava.com/athletes/${config.strava}`}
          title={`Strava ${config.author}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaStrava />
        </a>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterImpl);
