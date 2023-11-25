import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

window.addEventListener('resize', onResize)
onResize();

function onResize() {
  document.body.style.setProperty('--vh', window.innerHeight + 'px')
}

const app = createApp(App);
app.config.devtools = true;

app.mount('#app');
