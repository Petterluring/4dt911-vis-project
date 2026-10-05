import HelloFastApi from '../../components/hello/HelloFastApi';
import HelloWorld from '../../components/hello/HelloWorld';
import './HelloWorldFuture.css';

function HelloWorldFuture() {
  return (
    <div className="future-page">
      <header className="future-page__nav">
        <a className="future-page__brand" href="/">NOVA / DEMOS</a>
        <nav aria-label="Demo pages">
          <a href="/demos/hello-fast-api">Rustic</a>
          <a href="/demos/hello-world" aria-current="page">Future</a>
        </nav>
      </header>

      <main className="future-page__content">
        <p className="future-page__eyebrow"><span /> SIGNAL RECEIVED · 001</p>
        <section className="future-page__demo" aria-label="Hello World demo">
          <HelloWorld />
          <p className="future-page__description">
            The smallest transmission from a very large universe.
          </p>
        </section>
        <section className="future-page__api" aria-label="FastAPI greeting">
          <h2>Reach across the network</h2>
          <p>Request a fresh message from the FastAPI server.</p>
          <HelloFastApi />
        </section>
        <a className="future-page__return" href="/">Return to demo hub <span aria-hidden="true">↗</span></a>
      </main>
      <div className="future-page__orbit future-page__orbit--one" aria-hidden="true" />
      <div className="future-page__orbit future-page__orbit--two" aria-hidden="true" />
      <div className="future-page__coordinates" aria-hidden="true">35° 41′ 22.2″ N<br />139° 41′ 30.1″ E</div>
    </div>
  );
}

export default HelloWorldFuture;
