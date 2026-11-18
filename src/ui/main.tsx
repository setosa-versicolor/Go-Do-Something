import { render } from 'preact';
import { App } from './app';
import { countVisits } from './visits';
import './styles.css';

render(<App />, document.getElementById('app')!);
countVisits();
