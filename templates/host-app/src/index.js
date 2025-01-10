import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';

const RemoteButton = lazy(() => import('remoteApp/Button'));

function App() {
  return (
    <div>
      <h1>Welcome to the Host App</h1>
      <Suspense fallback={<div>Loading Button...</div>}>
        <RemoteButton />
      </Suspense>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
