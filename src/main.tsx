import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initializeDesktopBridge} from './desktopBridge';
import {initializeSectionStorage} from './sectionStorage';

initializeDesktopBridge();

async function start(){
await initializeSectionStorage();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
}
void start().catch(()=>{
 document.getElementById('root')!.textContent='تعذر فتح قاعدة البيانات المحلية. أغلق البرنامج وافتحه مجدداً. لم يتم حذف بياناتك.';
});
