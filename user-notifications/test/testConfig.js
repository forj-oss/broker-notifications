var config = {
  mails : [
    'admin@mydomain.test',
    'super.admin@mydomain.test',
    'real.admin@mydomain.test'
  ],
  role : 'admins',
  account : {
    user : 'cn=admin,dc=1bs',
    password : 'changeme',
    server : 'ldap://localhost',
    dit : 'o=1bs.dev.forj.io,dc=1bs'
  }
};

module.exports = config;
