'use client';

import { useState, useEffect } from 'react';

export default function WtafLandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tattooType: '',
    description: ''
  });

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const elements = document.querySelectorAll('.float-element');
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      elements.forEach((element, index) => {
        const speed = (index + 1) * 0.02;
        const xOffset = (x - 0.5) * speed * 40;
        const yOffset = (y - 0.5) * speed * 40;
        (element as HTMLElement).style.transform += ` translate(${xOffset}px, ${yOffset}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Scroll parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.4;

      document.querySelectorAll('.parallax').forEach((element, index) => {
        const speed = (index + 1) * 0.08;
        (element as HTMLElement).style.transform = `translateY(${rate * speed}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Random glitch effects
  useEffect(() => {
    const interval = setInterval(() => {
      const glitchElements = document.querySelectorAll('.glitch');
      glitchElements.forEach(el => {
        if (Math.random() < 0.05) {
          (el as HTMLElement).style.filter = 'hue-rotate(' + Math.random() * 360 + 'deg) brightness(1.5)';
          setTimeout(() => {
            (el as HTMLElement).style.filter = 'none';
          }, 150);
        }
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.description) {
      alert('⚡ MESSAGE SENT ⚡\nWe\'ll hit you back within 24 hours to start planning your electric ink!');
      setFormData({ name: '', email: '', tattooType: '', description: '' });
    } else {
      alert('🔥 Fill in the blanks, rebel! We need at least your name, email, and tattoo vision.');
    }
  };

  const handleSmoothScroll = (targetId: string) => {
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%);
          background-size: 400% 400%;
          animation: gradientShift 12s ease infinite;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          color: #ffffff;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .float-element {
          position: absolute;
          opacity: 0.4;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.3));
        }

        .skull {
          top: 8%;
          left: 5%;
          font-size: 3.5rem;
          color: rgba(255, 255, 255, 0.3);
          animation-delay: 0s;
        }

        .lightning {
          top: 30%;
          right: 8%;
          font-size: 4rem;
          color: rgba(255, 255, 0, 0.4);
          animation-delay: 2s;
        }

        .fire {
          bottom: 25%;
          left: 12%;
          font-size: 3.8rem;
          color: rgba(255, 69, 0, 0.4);
          animation-delay: 4s;
        }

        .chains {
          bottom: 10%;
          right: 15%;
          font-size: 3.2rem;
          color: rgba(192, 192, 192, 0.3);
          animation-delay: 1s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-3deg); }
        }

        .glitch {
          position: relative;
          display: inline-block;
        }

        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .glitch::before {
          animation: glitch1 2s infinite;
          color: #ff0080;
          z-index: -1;
        }

        .glitch::after {
          animation: glitch2 2s infinite;
          color: #00ffff;
          z-index: -2;
        }

        @keyframes glitch1 {
          0%, 90%, 100% { transform: translate(0); }
          10% { transform: translate(-2px, -1px); }
          20% { transform: translate(1px, 2px); }
        }

        @keyframes glitch2 {
          0%, 90%, 100% { transform: translate(0); }
          10% { transform: translate(2px, 1px); }
          20% { transform: translate(-1px, -2px); }
        }

        .glass-container {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        header {
          padding: 40px 20px;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .logo {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 5rem;
          font-weight: 900;
          color: #ffffff;
          text-shadow:
            0 0 10px #ff0080,
            0 0 20px #ff0080,
            0 0 30px #ff0080;
          margin-bottom: 15px;
          letter-spacing: -2px;
        }

        .tagline {
          font-size: 1.2rem;
          color: #ff0080;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 20px;
          text-shadow: 0 0 5px #ff0080;
        }

        main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          position: relative;
          z-index: 5;
        }

        .hero {
          text-align: center;
          margin-bottom: 80px;
          padding: 60px 40px;
        }

        .hero-content {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255, 0, 128, 0.3);
          border-radius: 30px;
          padding: 70px 50px;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.4),
            inset 0 0 20px rgba(255, 0, 128, 0.1);
        }

        .hero h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 4.2rem;
          color: #ffffff;
          margin-bottom: 35px;
          font-weight: 700;
          line-height: 1.1;
          text-shadow: 0 0 15px #00ffff;
        }

        .hero p {
          font-size: 1.4rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.7;
          max-width: 650px;
          margin: 0 auto 50px;
          font-weight: 300;
        }

        .cta-section {
          display: flex;
          gap: 25px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .cta-button {
          display: inline-block;
          padding: 20px 45px;
          background: linear-gradient(45deg, #ff0080, #8b0000);
          color: #ffffff;
          text-decoration: none;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          border: none;
          border-radius: 50px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow:
            0 8px 25px rgba(255, 0, 128, 0.3),
            0 0 20px rgba(255, 0, 128, 0.2);
          cursor: pointer;
        }

        .cta-button.secondary {
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #00ffff;
          box-shadow:
            0 8px 25px rgba(0, 255, 255, 0.2),
            0 0 20px rgba(0, 255, 255, 0.1);
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .cta-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow:
            0 15px 35px rgba(255, 0, 128, 0.4),
            0 0 30px rgba(255, 0, 128, 0.3);
        }

        .cta-button.secondary:hover {
          box-shadow:
            0 15px 35px rgba(0, 255, 255, 0.3),
            0 0 30px rgba(0, 255, 255, 0.2);
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .services {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 35px;
          margin-bottom: 90px;
        }

        .service-card {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          padding: 45px 35px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }

        .service-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff0080, #00ffff, #ffff00, #ff0080);
          background-size: 200% 100%;
          animation: borderGlow 3s linear infinite;
        }

        @keyframes borderGlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .service-card:hover {
          transform: translateY(-8px);
          background: rgba(0, 0, 0, 0.7);
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(255, 0, 128, 0.2);
          border-color: rgba(255, 0, 128, 0.3);
        }

        .service-card .icon {
          font-size: 4rem;
          margin-bottom: 25px;
          display: block;
          filter: drop-shadow(0 0 10px currentColor);
        }

        .service-card h3 {
          font-family: 'Space Grotesk', sans-serif;
          color: #ffffff;
          font-size: 1.8rem;
          margin-bottom: 18px;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .service-card p {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          font-weight: 300;
          margin-bottom: 25px;
        }

        .service-price {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.4rem;
          color: #ff0080;
          font-weight: 700;
          text-shadow: 0 0 5px #ff0080;
        }

        .location-contact {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 60px;
        }

        .location-card, .contact-card {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          padding: 50px 40px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .location-card h2, .contact-card h2 {
          font-family: 'Space Grotesk', sans-serif;
          color: #ffffff;
          font-size: 2.5rem;
          margin-bottom: 25px;
          font-weight: 700;
          text-shadow: 0 0 10px #00ffff;
        }

        .address {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 25px;
          font-weight: 400;
        }

        .hours {
          display: grid;
          gap: 15px;
          margin-top: 30px;
        }

        .hours div {
          display: flex;
          justify-content: space-between;
          padding: 15px 20px;
          background: rgba(255, 0, 128, 0.1);
          border: 1px solid rgba(255, 0, 128, 0.2);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }

        .hours strong {
          color: #ffffff;
          font-weight: 600;
        }

        .hours span {
          color: #ff0080;
          font-weight: 400;
        }

        .contact-form {
          display: grid;
          gap: 20px;
        }

        .form-group {
          display: grid;
          gap: 12px;
        }

        .form-group label {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .form-group input, .form-group textarea, .form-group select {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 0, 128, 0.3);
          border-radius: 15px;
          padding: 15px 20px;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          background: rgba(0, 0, 0, 0.8);
          border-color: #ff0080;
          box-shadow:
            0 5px 20px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(255, 0, 128, 0.2);
        }

        .submit-btn {
          background: linear-gradient(45deg, #ff0080, #8b0000);
          border: none;
          border-radius: 15px;
          padding: 18px 25px;
          color: #ffffff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(255, 0, 128, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 10px;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(255, 0, 128, 0.4);
        }

        .sparks {
          position: fixed;
          width: 100%;
          height: 100%;
          z-index: 1;
          overflow: hidden;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        .spark {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #ffff00;
          border-radius: 50%;
          opacity: 0;
          animation: spark 3s infinite ease-out;
          box-shadow: 0 0 6px #ffff00;
        }

        .spark:nth-child(1) {
          top: 25%;
          left: 20%;
          animation-delay: 0s;
        }

        .spark:nth-child(2) {
          top: 70%;
          left: 80%;
          animation-delay: 1s;
        }

        .spark:nth-child(3) {
          top: 50%;
          left: 10%;
          animation-delay: 2s;
        }

        .spark:nth-child(4) {
          top: 30%;
          left: 90%;
          animation-delay: 1.5s;
        }

        @keyframes spark {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(2);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }

        .parallax {
          transform: translateZ(0);
          animation: subtleParallax 20s ease-in-out infinite;
        }

        @keyframes subtleParallax {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @media (max-width: 768px) {
          .logo { font-size: 3.5rem; }
          .hero h1 { font-size: 3rem; }
          .hero p { font-size: 1.2rem; }
          .hero-content { padding: 50px 30px; }
          .services { grid-template-columns: 1fr; }
          .location-contact { grid-template-columns: 1fr; }
          .cta-section { flex-direction: column; }
        }
      `}</style>

      <div>
        {/* Electric sparks */}
        <div className="sparks">
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
        </div>

        {/* Floating punk elements */}
        <div className="float-element skull">💀</div>
        <div className="float-element lightning">⚡</div>
        <div className="float-element fire">🔥</div>
        <div className="float-element chains">⛓️</div>

        <header>
          <div className="logo glitch" data-text="WTAF">WTAF</div>
          <div className="tagline">SHIP FROM YOUR FLIP PHONE</div>
        </header>

        <main>
          <section className="hero parallax">
            <div className="hero-content">
              <h1 className="glitch" data-text="One-Shot Prompting Over SMS">One-Shot Prompting Over SMS</h1>
              <p>Where rebellion meets artistry. Custom tattoos that channel your inner voltage in the heart of West Hollywood&apos;s most electric block.</p>
              <div className="cta-section">
                <button 
                  className="cta-button"
                  onClick={() => handleSmoothScroll('#contact')}
                >
                  Book Consultation
                </button>
                <button 
                  className="cta-button secondary"
                  onClick={() => handleSmoothScroll('#portfolio')}
                >
                  View Portfolio
                </button>
              </div>
            </div>
          </section>

          <section className="services" id="services">
            <div className="service-card parallax">
              <span className="icon">🖤</span>
              <h3>Custom Blackwork</h3>
              <p>Bold, dark designs that make a statement. From geometric patterns to intricate linework that speaks to your soul.</p>
              <div className="service-price">$200/hr</div>
            </div>

            <div className="service-card parallax">
              <span className="icon">🌈</span>
              <h3>Color Explosions</h3>
              <p>Vibrant, electric colors that pop off your skin. Neon dreams and psychedelic visions brought to life.</p>
              <div className="service-price">$250/hr</div>
            </div>

            <div className="service-card parallax">
              <span className="icon">⚡</span>
              <h3>Flash &amp; Walk-ins</h3>
              <p>Quick hits of rebellion. Pre-designed flash pieces perfect for spontaneous ink sessions.</p>
              <div className="service-price">$150-$400</div>
            </div>

            <div className="service-card parallax">
              <span className="icon">🔥</span>
              <h3>Cover-ups &amp; Touch-ups</h3>
              <p>Transform old regrets into new masterpieces. Expert cover-up work and refresh services.</p>
              <div className="service-price">$180/hr</div>
            </div>
          </section>

          <section className="location-contact">
            <div className="location-card parallax">
              <h2 className="glitch" data-text="Find The Voltage">Find The Voltage</h2>
              <div className="address">
                📍 8235 Sunset Boulevard<br />
                West Hollywood, CA 90046
              </div>
              <p style={{color: 'rgba(255, 255, 255, 0.7)', fontWeight: 300, marginBottom: '25px'}}>
                In the punk heart of the Strip, between Float Coffee and Breeze Blowouts. Look for the neon lightning bolt.
              </p>

              <div className="hours">
                <div>
                  <strong>Monday - Thursday</strong>
                  <span>2PM - 10PM</span>
                </div>
                <div>
                  <strong>Friday - Saturday</strong>
                  <span>12PM - 12AM</span>
                </div>
                <div>
                  <strong>Sunday</strong>
                  <span>2PM - 8PM</span>
                </div>
                <div>
                  <strong>Walk-ins Welcome</strong>
                  <span>After 6PM</span>
                </div>
              </div>
            </div>

            <div className="contact-card parallax" id="contact">
              <h2 className="glitch" data-text="Get Electrified">Get Electrified</h2>
              <form className="contact-form" onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tattoo-type">Tattoo Style</label>
                  <select 
                    id="tattoo-type"
                    value={formData.tattooType}
                    onChange={(e) => setFormData({...formData, tattooType: e.target.value})}
                  >
                    <option value="">Select style</option>
                    <option value="blackwork">Custom Blackwork</option>
                    <option value="color">Color Explosions</option>
                    <option value="flash">Flash/Walk-in</option>
                    <option value="coverup">Cover-up/Touch-up</option>
                    <option value="consultation">Just Browsing</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Describe Your Vision</label>
                  <textarea 
                    id="description" 
                    placeholder="Tell us about your tattoo idea, size, placement, style..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <button type="submit" className="submit-btn">Send Voltage</button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}