import HelloFastApi from '../../components/hello/HelloFastApi';
import './HelloFastApiPage.css';

function HelloFastApiPage() {
  return (
    <div className="rustic-page">
      <header className="rustic-page__nav">
        <a className="rustic-page__brand" href="/">Little Demo Homestead</a>
        <nav aria-label="Demo pages">
          <a href="/demos/hello-fast-api" aria-current="page">FastAPI</a>
          <a href="/demos/hello-world">Hello World</a>
        </nav>
      </header>

      <main className="rustic-page__content">
        <p className="rustic-page__eyebrow">A simple message from the backend</p>
        <h1>Hello from the homestead</h1>
        <p className="rustic-page__description">
          A little call across the creek to see what the FastAPI server has to say.
        </p>
        <section className="rustic-page__note" aria-label="FastAPI greeting">
          <div className="rustic-page__seal" aria-hidden="true">✳</div>
          <h2>Send a greeting</h2>
          <p>Tap below to fetch a fresh hello from the server.</p>
          <HelloFastApi />
        </section>
        <p className="rustic-page__footer">Made slowly, with care and a little code.</p>
      </main>
    </div>
  );
}

export default HelloFastApiPage;
