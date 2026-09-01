(()=>{
  const country=document.querySelector('meta[name="brasa-country"]')?.content||'';
  const fallback=document.querySelector('meta[name="brasa-default-language"]')?.content||'en';
  if(!country)return;
  const params=new URLSearchParams(location.search);
  const key='brasa-language-'+country;
  const requested=params.get('lang');
  const target=requested||localStorage.getItem(key)||fallback;
  const setCookie=lang=>{const value='/en/'+lang;document.cookie='googtrans='+value+';path=/';document.cookie='googtrans='+value+';path=/;domain=.'+location.hostname;};
  if(requested)localStorage.setItem(key,requested);
  setCookie(target);document.documentElement.lang=target;
  const select=document.getElementById('brasa-language');if(select){select.value=[...select.options].some(x=>x.value===target)?target:fallback;select.addEventListener('change',()=>{localStorage.setItem(key,select.value);setCookie(select.value);location.replace(location.pathname+'?lang='+encodeURIComponent(select.value));});}
  if(target==='en')return;
  window.brasaTranslateInit=()=>new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'en,'+fallback,autoDisplay:false},'google_translate_element');
  const script=document.createElement('script');script.src='https://translate.google.com/translate_a/element.js?cb=brasaTranslateInit';script.async=true;document.head.appendChild(script);
})();
