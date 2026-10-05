import HelloFastApi from '../../components/hello/HelloFastApi';
import HelloWorld from '../../components/hello/HelloWorld';
import './HelloWorldRustic.css';

function HelloWorldRustic() {
  return (
    <div className="rustic-page">
      <header className="rustic-page__nav">
        <a className="rustic-page__brand" href="/">Little Demo Homestead</a>
        <nav aria-label="Demo pages">
          <a href="/demos/hello-fast-api" aria-current="page">Rustic</a>
          <a href="/demos/hello-world">Future</a>
        </nav>
      </header>

      <main className="rustic-page__content">
        <p className="rustic-page__eyebrow">Two little greetings from the homestead</p>
        <section className="rustic-page__hello" aria-label="Hello World demo">
          <HelloWorld />
        </section>
        <p className="rustic-page__description">
          A simple hello, and a little call across the creek to the FastAPI server.
        </p>
        <section className="rustic-page__note" aria-label="FastAPI greeting">
          <div className="rustic-page__seal" aria-hidden="true">✳</div>
          <h2>Reach the backend</h2>
          <p>Tap below to fetch a fresh hello from the server.</p>
          <HelloFastApi />
        </section>
        <p className="rustic-page__footer">Made slowly, with care and a little code.</p>
      </main>
    </div>
  );
}

export default HelloWorldRustic;
