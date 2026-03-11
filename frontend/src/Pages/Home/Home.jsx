import "./Home.css";
function Home() {
  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-cta-wrapper">
          <h2>Dragon Drop Engine</h2>
          <span>
            2D Top Down <br /> video Game
            <br /> Engine
          </span>
          <button>Create</button>
          <p>no purchase necessary</p>
        </div>
      </section>
      <section className="learn-section">
        <h3>Finally, a game engine that feels simple</h3>
        <div className="learn-progress-indicator-wrapper">
          <div className="progress-indicator" id="progress-indicator-one"></div>
          <div className="progress-indicator" id="progress-indicator-two"></div>
          <div
            className="progress-indicator"
            id="progress-indicator-three"
          ></div>
        </div>
        <div className="learn-img-scroll-wrapper">
          <div className="learn-img" id="learn-img-one">
            img1
          </div>
          <div className="learn-img" id="learn-img-two">
            img2
          </div>
          <div className="learn-img" id="learn-img-two">
            img3
          </div>
        </div>
        <p>No code. No confusion. Just creation</p>
        <button className="learn-btn">Start learning</button>
      </section>
      <section className="pricing-section">
        <h4>Pricing</h4>
        <div className="plans-wrapper">
          <div className="free-plan-wrapper">
            <span>Free Plan</span>
            <button>Create</button>
          </div>
          <div className="paid-plan-wrapper">
            <span>Paid Plan</span>
            <button>Purchase</button>
          </div>
        </div>
      </section>
      <section className="news-section">
        <h5>Catch updates on new features</h5>
        <div className="news-wrapper">
          <div className="news-img">news img</div>
          <div className="news-text-wrapper">new text wrapper</div>
        </div>
      </section>
    </main>
  );
}

export default Home;
