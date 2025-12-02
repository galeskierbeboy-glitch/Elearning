import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="main-header">
        <div className="logo">SecureLearn</div>
        <nav className="main-nav">
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>The Future of Secure Education is Here.</h1>
            <p>An advanced E-learning platform integrated with comprehensive security logs to protect your data and monitor access.</p>
            <a href='#features' className="cta-button">Get Started</a>
          </div>
        </section>

        {/* Content that scrolls over hero */}
        <section id="features" className="content-section">
          <div className="content-wrapper">
            <h2>E-learning System with Security Logs</h2>
            <p className="intro-text">
              Our platform provides a seamless learning experience without compromising on security. 
              Track progress, manage users, and rest easy knowing every action is logged and monitored.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* Book icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.5 2.5 0 015.5 5h13" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 20.25v-12A2.25 2.25 0 0018.75 6H6.5A2.5 2.5 0 004 8.5v10.75" />
                  </svg>
                </div>
                <h3>Intuitive E-learning</h3>
                <p>Engage your students with our easy-to-use course builder, interactive quizzes, and real-time progress tracking. Designed for educators and learners alike.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* Shield / security icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 3.5v5.5c0 5.25-3.75 9.75-7 11-3.25-1.25-7-5.75-7-11V5.5L12 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 11.5l1.75 1.75L14.5 9" />
                  </svg>
                </div>
                <h3>Advanced Security Logs</h3>
                <p>Gain full visibility with immutable audit trails. Monitor logins, course access, administrative changes, and potential threats with our detailed security dashboard.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* Clipboard / compliance icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6a2 2 0 012 2v1h-2a2 2 0 00-2 2H9a2 2 0 00-2-2H5V4a2 2 0 012-2h2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 13.5l1.75 1.75L15.5 11" />
                  </svg>
                </div>
                <h3>Compliance Ready</h3>
                <p>Meet industry standards for data protection and privacy. Our system helps you stay compliant with regulations like GDPR, HIPAA, and FERPA through robust logging and reporting.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* Clock / time icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3>Master at Your Pace</h3>
                <p>Learn when and where it works best for you with personalized courses.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* User / instructor icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20a6 6 0 0112 0" />
                  </svg>
                </div>
                <h3>Expert-Led Education</h3>
                <p>Learn from industry professionals with real-world experience.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden>
                  {/* Puzzle / interactive icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a4 4 0 014-4h2v2a2 2 0 002 2h2v2a4 4 0 01-4 4H8v-2a2 2 0 00-2-2H4v-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a4 4 0 00-4 4v2h-2a2 2 0 01-2-2v-2h-2a4 4 0 00-4 4v2" />
                  </svg>
                </div>
                <h3>Interactive Learning</h3>
                <p>Engage with dynamic content and hands-on projects.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="button-center">
        <Link to="/courses" className="cta-button">Go</Link>
      </div>

      <footer className="site-footer">
        <div className="footer-wrapper">
          <div className="footer-links">
          </div>
          <p className="footer-copyright">&copy; 2025-2026 SecureLearn. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
