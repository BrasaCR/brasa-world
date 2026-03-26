/* BRASA Modal — external, CSP-safe */
(function(){
  'use strict';

  function brasaModal(){
    var modal = document.getElementById('brasaModal');
    if(!modal || modal.dataset.bmInit) return;
    modal.dataset.bmInit = '1';

    var box      = modal.querySelector('.bm-box');
    var role     = null;
    var step     = 1;
    var OPEN_CLS = 'bm-open';
    var ACT_CLS  = 'bm-active';

    function open(){
      modal.classList.add(OPEN_CLS);
      document.body.style.overflow = 'hidden';
      go(1);
      setTimeout(function(){
        var f = modal.querySelector('.bm-role');
        if(f) f.focus();
      }, 300);
    }
    function close(){
      modal.classList.remove(OPEN_CLS);
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-action="open-modal"]').forEach(function(b){
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open(); });
    });

    var bmClose = document.getElementById('bmClose');
    var bmDone  = document.getElementById('bmDone');
    if(bmClose) bmClose.addEventListener('click', close);
    if(bmDone)  bmDone.addEventListener('click',  close);

    modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && modal.classList.contains(OPEN_CLS)) close();
    });

    function go(n){
      step = n;
      modal.querySelectorAll('.bm-step').forEach(function(s){ s.classList.remove(ACT_CLS); });
      var target = document.getElementById('bmStep'+n);
      if(target) target.classList.add(ACT_CLS);
      var prog = document.getElementById('bmProgress');
      if(prog) prog.style.display = (n === 3) ? 'none' : 'flex';
      [1,2,3].forEach(function(i){
        var d = document.getElementById('bmd-'+i);
        if(!d) return;
        d.classList.remove('active','done');
        if(i < n)      d.classList.add('done');
        else if(i===n) d.classList.add('active');
      });
      if(box) box.scrollTop = 0;
    }

    var next1 = document.getElementById('bmNext1');
    modal.querySelectorAll('.bm-role').forEach(function(b){
      b.addEventListener('click', function(){
        modal.querySelectorAll('.bm-role').forEach(function(x){ x.classList.remove('selected'); });
        b.classList.add('selected');
        role = b.dataset.role;
        if(next1) next1.disabled = false;
        var subs = {
          citizen:    'Your T4 Wallet and GovID activate on April 1. Free forever.',
          business:   'Your POS and payment rails go live on April 1. 0.85% fee cap.',
          government: 'Your GovOS deployment begins April 1. All 14 verticals included.',
          ngo:        'Your partnership access begins April 1. All sovereign tools available.'
        };
        var sub = document.getElementById('bmStep2Sub');
        if(sub && subs[role]) sub.textContent = subs[role];
      });
    });

    if(next1) next1.addEventListener('click', function(){ go(2); });
    var back2 = document.getElementById('bmBack2');
    if(back2) back2.addEventListener('click', function(){ go(1); });

    var nm    = document.getElementById('bmName');
    var em    = document.getElementById('bmEmail');
    var nmErr = document.getElementById('bmNameErr');
    var emErr = document.getElementById('bmEmailErr');

    if(nm) nm.addEventListener('input', function(){
      if(this.value.trim()){ this.classList.remove('err'); if(nmErr) nmErr.classList.remove('show'); }
    });
    if(em) em.addEventListener('input', function(){
      var v = this.value.trim();
      if(v.includes('@') && v.includes('.')){ this.classList.remove('err'); if(emErr) emErr.classList.remove('show'); }
    });

    function validate(){
      var ok = true;
      if(!nm || !nm.value.trim()){ if(nm) nm.classList.add('err'); if(nmErr) nmErr.classList.add('show'); ok=false; }
      else { if(nm) nm.classList.remove('err'); if(nmErr) nmErr.classList.remove('show'); }
      var ev = em ? em.value.trim() : '';
      if(!ev || !ev.includes('@') || !ev.includes('.')){ if(em) em.classList.add('err'); if(emErr) emErr.classList.add('show'); ok=false; }
      else { if(em) em.classList.remove('err'); if(emErr) emErr.classList.remove('show'); }
      return ok;
    }

    var sub2 = document.getElementById('bmSubmit2');
    if(sub2) sub2.addEventListener('click', function(){
      if(!validate()) return;
      var consent = document.getElementById('bmConsent');
      if(consent && !consent.checked){ consent.focus(); return; }
      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<span class="bm-spinner"></span>Reserving...';
      var name    = nm ? nm.value.trim() : '';
      var email   = em ? em.value.trim() : '';
      var country = (document.getElementById('bmCountry') || {}).value || '';
      var myRole  = role || 'citizen';
      var ref     = 'BRASA-2026-' + Math.random().toString(36).substr(2,6).toUpperCase();
      var fd = new FormData();
      fd.append('name', name); fd.append('email', email);
      fd.append('country', country); fd.append('role', myRole);
      fd.append('ref', ref);
      fd.append('_subject', 'BRASA Sign-Up: ' + name + ' (' + myRole + ')');
      fd.append('_replyto', email);
      function done(){ showConfirm(name, myRole, ref); }
      fetch('https://formspree.io/f/xwkgpnkb', {
        method:'POST', body:fd, headers:{Accept:'application/json'}
      }).then(function(r){ return r.json(); }).then(done).catch(done);
      try{
        var ex = JSON.parse(localStorage.getItem('brasa_signups') || '[]');
        ex.push({name:name, email:email, country:country, role:myRole, ref:ref, ts:Date.now()});
        localStorage.setItem('brasa_signups', JSON.stringify(ex));
        localStorage.setItem('brasa_waitlist', email);
      }catch(e){}
    });

    function showConfirm(name, myRole, ref){
      var icons = {citizen:'🌍', business:'🚀', government:'🏛️', ngo:'🤝'};
      var msgs  = {
        citizen:    'Your T4 Wallet, GovID, and all 12 citizen benefits activate on April 1. You exist — you are in.',
        business:   'Your POS terminal, payment rails, and Champion access activate on April 1.',
        government: 'Your GovOS deployment, all 14 citizen verticals, and sovereign fund activation begin April 1.',
        ngo:        'Your partnership access, sovereign tools, and coordination network activate on April 1.'
      };
      var el;
      el = document.getElementById('bmCIcon'); if(el) el.textContent = icons[myRole] || '✦';
      el = document.getElementById('bmCName'); if(el) el.textContent = name + '.';
      el = document.getElementById('bmCBody'); if(el) el.textContent = msgs[myRole] || msgs.citizen;
      el = document.getElementById('bmCRef');  if(el) el.textContent = ref;
      go(3);
    }
  }

  if(document.readyState === 'complete'){
    brasaModal();
  } else {
    window.addEventListener('load', brasaModal);
    document.addEventListener('DOMContentLoaded', brasaModal);
  }
})();
