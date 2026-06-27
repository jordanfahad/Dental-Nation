/**
 * Standalone login screen for /Leave-Calendar. Posts to /api/leave-auth.
 * Only Mr Akbar (CEO) and the Super Admin are allowed through; everyone else
 * is rejected even with valid credentials. Branded to match the calendar.
 */
export const LOGIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Leave Calendar — Sign in</title>
<style>
  :root{ --navy:#15233C; --blue:#2C5FCB; --bg:#F6F7F9; --line:#E3E7EE; --muted:#6B7686; --red:#CB4747; }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
        background:var(--bg); color:var(--navy); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card{ width:100%; max-width:392px; background:#fff; border:1px solid var(--line); border-radius:16px;
         box-shadow:0 18px 48px -24px rgba(21,35,60,.35); padding:32px 28px; }
  .brand{ display:flex; align-items:center; gap:10px; margin-bottom:22px; }
  .logo{ width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,var(--navy),var(--blue));
         color:#fff; font-weight:800; font-size:16px; display:flex; align-items:center; justify-content:center; letter-spacing:.5px; }
  .brand b{ font-size:15px; } .brand span{ display:block; font-size:12px; color:var(--muted); font-weight:500; }
  h1{ font-size:19px; margin:0 0 4px; } .sub{ color:var(--muted); font-size:13px; margin:0 0 22px; }
  label{ display:block; font-size:12.5px; font-weight:600; margin:14px 0 6px; }
  input{ width:100%; padding:11px 13px; font-size:14px; border:1px solid var(--line); border-radius:10px; background:#fff; color:var(--navy); }
  input:focus{ outline:none; border-color:var(--blue); box-shadow:0 0 0 3px rgba(44,95,203,.15); }
  button{ width:100%; margin-top:22px; padding:12px; font-size:14.5px; font-weight:700; color:#fff; cursor:pointer;
          background:var(--navy); border:0; border-radius:10px; transition:background .15s; }
  button:hover{ background:#1d2f4f; }
  .err{ display:none; margin-bottom:4px; padding:10px 12px; font-size:13px; border-radius:9px;
        background:#FBE9E9; color:var(--red); border:1px solid #F3CFCF; }
  .err.show{ display:block; }
  .foot{ margin-top:18px; font-size:11.5px; color:var(--muted); text-align:center; line-height:1.5; }
  .lock{ font-size:11px; color:var(--muted); display:flex; align-items:center; gap:6px; justify-content:center; margin-top:14px; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/api/leave-auth">
    <div class="brand">
      <div class="logo">DN</div>
      <div><b>Dental Nation</b><span>Leave, Attendance &amp; Payroll</span></div>
    </div>
    <h1>Sign in</h1>
    <p class="sub">Use your Dental Nation email and password.</p>
    <div id="err" class="err"></div>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="username" required placeholder="name@dentalnation.com" />
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
    <button type="submit">Sign in</button>
    <div class="lock">🔒 Private to Dental Nation staff</div>
    <div class="foot">No account? Contact the Super Admin to be added.</div>
  </form>
<script>
  (function(){
    var p = new URLSearchParams(location.search), e = document.getElementById('err');
    if(p.get('error')==='denied'){ e.textContent='This account is not permitted to view the Leave Calendar.'; e.classList.add('show'); }
    else if(p.get('error')==='invalid'){ e.textContent='Incorrect email or password.'; e.classList.add('show'); }
    else if(p.get('expired')==='1'){ e.textContent='Your session expired. Please sign in again.'; e.classList.add('show'); }
    if(history.replaceState && location.search){ history.replaceState(null,'',location.pathname); }
  })();
</script>
</body>
</html>`;
