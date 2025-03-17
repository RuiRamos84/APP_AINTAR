
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© {new Date().getFullYear()} AINTAR. Todos os direitos reservados</p>
        {/* <div className="footer-links">
          <a href="/sobre">Sobre</a>
          <a href="/contato">Contato</a>
          <a href="/privacidade">Privacidade</a>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;