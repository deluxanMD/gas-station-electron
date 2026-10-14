import type { JSX } from 'react';
import electronLogo from '../assets/electron.svg';

export function App(): JSX.Element {
  const ipcHandle = (): void => {
    window.electron.ipcRenderer.send('ping');
  };

  const { versions } = window.electron.process;

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite & React</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span> &{' '}
        <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <ul className="versions">
        <li className="electron-version">Electron v{versions.electron}</li>
        <li className="chrome-version">Chromium v{versions.chrome}</li>
        <li className="node-version">Node v{versions.node}</li>
      </ul>
    </>
  );
}

export default App;
