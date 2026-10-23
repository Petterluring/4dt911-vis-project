import './App.css';
import HelloWorldRustic from './pages/demos/HelloWorldRustic';
import HelloWorldFuture from './pages/demos/HelloWorldFuture';
import Explorer from './pages/Explorer';
function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/demos/hello-fast-api') return <HelloWorldRustic />;
  if (path === '/demos/hello-world') return <HelloWorldFuture />;
  return <Explorer />;
}
export default App;
