// Dedicated manual regression harness; excluded from the production entry point.
// Never seed the user's normal application origin.
document.getElementById('prepare')!.addEventListener('click', async () => {
  if (location.origin !== 'http://127.0.0.1:43220') throw new Error('Use the isolated test origin on port 43220.');
  const name='منتسب اختبار التقرير';
  const notes='ملاحظة اختبار طويلة للتأكد من استمرار التقرير في الصفحة التالية دون تداخل الكلمات أو تكرار العناوين. '.repeat(70);
  localStorage.setItem('military_main_records_backup_v1', JSON.stringify([{seq:1,military_id:'PDF-TEST-1',fullname:name,position:'اختبار محلي',phone:'000',details:{'الوحدة':'وحدة الاختبار'}}]));
  localStorage.setItem('military_fighter_records_v1', JSON.stringify([{id:'pdf-weapon',sequence:'1',fighterName:name,weaponType:'سلاح اختبار',weaponNumber:'TEST-222',notes}]));
  localStorage.setItem('military_vehicle_records_v1', JSON.stringify([{id:'pdf-vehicle',driverName:name,vehicleType:'عجلة اختبار',vehicleNumber:'TEST-333',vehicleColor:'أبيض',vehicleOwnership:'الاختبار',chassisNumber:'CHASSIS-TEST',notes:'نهاية بيانات الآليات'}]));
  localStorage.setItem('military_communications_regiment_v2', JSON.stringify([{id:'pdf-comm',sequence:'1',fullName:name,position:'اتصالات اختبار',regimentOrDepartment:'فوج الاختبار',phoneNumber:'000',deviceType:'لاسلكي',deviceStatus:'شغال',receivedDate:'2026-10-04',notes:'نهاية بيانات الفوج',document102Name:'',document102DataUrl:''}]));
  location.href='/';
});
