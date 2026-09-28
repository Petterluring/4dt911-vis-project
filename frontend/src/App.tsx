import './App.css';
import HelloFastApiPage from './pages/demos/HelloFastApiPage';
import HelloWorldPage from './pages/demos/HelloWorldPage';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/demos/hello-fast-api') {
    return <HelloFastApiPage />;
  }

  if (path === '/demos/hello-world') {
    return <HelloWorldPage />;
  }

  return (
    <main className="demo-index">
      <p className="demo-index__eyebrow">Interactive demos</p>
      <h1>Choose a world to explore</h1>
      <p className="demo-index__intro">
        Two tiny programs, each with its own atmosphere.
      </p>
      <div className="demo-index__links">
        <a href="/demos/hello-fast-api">Hello FastAPI <span>Rustic</span></a>
        <a href="/demos/hello-world">Hello, World! <span>Futurelike</span></a>
      </div>
    </main>
  );
}

export default App;
