import {useState, type ReactNode, type FormEvent} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {LockKeyhole, ArrowLeft, ShieldCheck, LoaderCircle} from 'lucide-react';
import {iraqLogo, sidebarPortrait} from '../brandAssets';
import {verifyAccessCode, readActivation, saveActivation, readActivationAttempts, saveActivationAttempts} from '../accessControl';

export function AccessGate({children}:{children:ReactNode}) {
 const [activated,setActivated]=useState(readActivation);
 const [unlocked,setUnlocked]=useState(false);
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [attempts,setAttempts]=useState(readActivationAttempts);
 const [error,setError]=useState('');
 const reduced=useReducedMotion();
 async function submit(event:FormEvent) {
  event.preventDefault();if(busy || !code) return;
  setBusy(true);setError('');
  try {
   const valid=await verifyAccessCode(code,activated?'daily':'activation');
   if(valid) {
    if(activated) setUnlocked(true);
    else {saveActivation();setActivated(true);setAttempts(0);saveActivationAttempts(0);}
    setCode('');
   } else {
    if(!activated) {const next=attempts+1;setAttempts(next);saveActivationAttempts(next);setError(next>=4?'حاول بعد 10 ايام':'رمز الدخول غير صحيح.');}
    else setError('رمز الدخول غير صحيح.');
    setCode('');
   }
  } catch {setError('تعذر إكمال الدخول. تحقق من السماح بالتخزين المحلي.');}
  finally {setBusy(false);}
 }
 if(unlocked) return <>{children}</>;
 return <main className="access-screen" dir="rtl">
  <div className="access-orb access-orb-one" aria-hidden="true"/><div className="access-orb access-orb-two" aria-hidden="true"/>
  <motion.section className="access-card" initial={{opacity:0,y:reduced?0:22}} animate={{opacity:1,y:0}} transition={{duration:0.65}}>
   <aside className="access-art">
    <img src={iraqLogo} alt="شعار جمهورية العراق" className="access-logo"/>
    <p className="access-institution">هيئة الحشد الشعبي</p>
    <p className="access-unit"><span aria-hidden="true" className="access-unit-star">✦</span><span className="access-unit-title">اللواء الثاني والعشرون</span><span aria-hidden="true" className="access-unit-star">✦</span></p>
    <div className="access-portrait-wrap"><img src={sidebarPortrait} alt="الصورة الشخصية للنظام" className="access-portrait"/></div>
    <blockquote className="access-motto"><span className="access-motto-divider" aria-hidden="true">✦</span><span>وفاءٌ لرجالنا…</span><strong>وأمانةٌ في حفظ سجلاتهم.</strong></blockquote>
   </aside>
   <div className="access-form-panel">
    <div className="access-eyebrow"><ShieldCheck size={16}/> اللواء - 22 - بنك المعلومات</div>
    <motion.div className="access-lock" animate={reduced?{}:{boxShadow:['0 0 0 0 #19b89010','0 0 0 14px #19b89000','0 0 0 0 #19b89010']}} transition={{duration:3,repeat:Infinity}}><LockKeyhole size={28}/></motion.div>
    <h1>{activated?'مرحباً بعودتك':'تفعيل النظام'}</h1>
    <p className="access-description">{activated?'أدخل رمز الدخول للوصول إلى سجلات النظام.':'أكمل التفعيل لبدء استخدام النظام.'}</p>
    <form onSubmit={submit}>
     <label htmlFor="system-access-code">رمز الدخول</label>
     <div className="access-input-wrap"><LockKeyhole size={19}/><input id="system-access-code" type="password" value={code} onChange={event=>{setCode(event.target.value);setError('');}} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="أدخل الرمز" disabled={busy} autoFocus aria-describedby="access-error"/></div>
     <div id="access-error" role="status" aria-live="polite" className="access-error">{error || (!activated && attempts>=4?'حاول بعد 10 ايام':'')}</div>
     <button type="submit" disabled={busy || !code} className="access-submit">{busy?<LoaderCircle size={19} className="animate-spin"/>:<><span>دخول</span><ArrowLeft size={19}/></>}</button>
    </form>
    <p className="access-footer">قيادة عمليات كركوك وشرق دجلة</p>
   </div>
  </motion.section>
 </main>;
}
