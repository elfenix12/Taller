# Auth testing (Emergent Google Auth)
Access requires the email to exist in `allowed_emails` collection ({email, role: admin|staff}).

Create test user + session:
```
mongosh --eval "
use('test_database');
var uid='test-user-'+Date.now(); var tok='test_session_'+Date.now(); var em='test.user.'+Date.now()+'@example.com';
db.allowed_emails.insertOne({email: em, role:'admin', added_at: new Date().toISOString()});
db.users.insertOne({user_id: uid, email: em, name:'TEST User', created_at: new Date()});
db.user_sessions.insertOne({user_id: uid, session_token: tok, expires_at: new Date(Date.now()+7*864e5), created_at: new Date()});
print(tok);"
```
API: `Authorization: Bearer <token>`. Browser: cookie `session_token` (httpOnly, secure, sameSite None, path /) on the app domain.
Note: `<img>` photo URLs rely on the cookie (not header).

Cleanup:
```
mongosh --eval "use('test_database'); db.users.deleteMany({email:/test\.user\./}); db.allowed_emails.deleteMany({email:/test\.user\./}); db.user_sessions.deleteMany({session_token:/test_session/});"
```
