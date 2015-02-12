#!/usr/bin/env node
/**
*# (c) Copyright 2014 Hewlett-Packard Development Company, L.P.
*#
*#   Licensed under the Apache License, Version 2.0 (the "License");
*#   you may not use this file except in compliance with the License.
*#   You may obtain a copy of the License at
*#
*#       http://www.apache.org/licenses/LICENSE-2.0
*#
*#   Unless required by applicable law or agreed to in writing, software
*#   distributed under the License is distributed on an "AS IS" BASIS,
*#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*#   See the License for the specific language governing permissions and
*#   limitations under the License.
*/
'use strict';

var redis = require('redis'),
    client = redis.createClient(),
    config = require('../config'),
    async = require('async'),
    msg = require('msg-util').Message,
    uuid = require('node-uuid'),
    bunyan = require('bunyan'),
    ldap = require('ldapjs');
var log = bunyan.createLogger({name: 'user-notification-broker'});

module.exports = {

  addNewNotification: function(payload, membersList, callback){
    client = redis.createClient();

    client.on('error', function(err){
      callback(err, null);
    });

    client.on('connect', function(err){
      if (err){
        callback(err, null);
        return;
      }
      client.select(config.connections.redis.database, function(){
        membersList.forEach(function(user){
          var uuidMail = user + uuid.v1();
          client.set(uuidMail, payload, redis.print);
          client.EXPIRE([uuidMail, config.notification.expiration], function(err) {
            if(err){
              callback(err, null);
            }
          });
        });
        callback(null, true);
      });
    });
  },

  validateMessage: function(payload, callback){
    try{
      var options = {
        ctx: payload.message.action.context,
        name: payload.message.action.ctx_data.name,
        desc: payload.message.action.ctx_data.description,
        user: payload.message.ACL.user,
        role: payload.message.ACL.role,
        debug: payload.message.debug,
        log: {
          enable: payload.message.log.enable,
          level: payload.message.log.level,
          target: payload.message.log.target
        },
        origin: payload.message.origin,
        id: payload.message.site_id,
        time_stamp: payload.message.time_stamp
      };
      if(msg.isValid(options)){
        callback(null, true);
      }else{
        callback('Invalid Message.', null);
      }
    }catch(e){
      log.error(e);
      callback(e, null);
    }
  },

  getRole: function(payload){
    try{
      return payload.message.ACL.role;
    }catch(e){
      log.error(e);
      return null;
    }
  },

  getServiceAccount: function (callback){
    client = redis.createClient();

    client.on('error', function(err){
      callback(err, null);
    });

    client.select(1, function(){
      async.parallel({
        user: function(callback_result){
          client.get('ldap_sa_user', function(err, reply){
            if(err){
              callback_result(err, null);
            }else{
              callback_result(null, reply );
            }
          });
        },
        password: function(callback_result){
          client.get('ldap_sa_password', function(err, reply){
            if(err){
              callback_result(err, null);
            }else{
              callback_result(null, reply );
            }
          });
        },
        server: function(callback_result){
          client.get('ldap_server', function(err, reply){
            if(err){
              callback_result(err, null);
            }else{
              callback_result(null, reply );
            }
          });
        },
        dit: function(callback_result){
          client.get('ldap_dit', function(err, reply){
            if(err){
              callback_result(err, null);
            }else{
              callback_result(null, reply);
            }
          });
        }
      }, function(err, results){
        if(err){
          callback(err, null);
        }else{
          callback(null, results);
        }
      });
    });
  },

  getMembersOf: function(group, account, callback){
    var ldapClient = ldap.createClient({
      url: account.server
    });

    ldapClient.bind(account.user, account.password, function(err){
      if(!err){
        var records = [];
        var opt = {
          filter: 'cn=' + group,
          scope: 'sub'
        };
        ldapClient.search('ou=groups,'+account.dit, opt, function(err_srch, res){
          if(err_srch){
            ldapClient.unbind(function(err_unbind){
              if(err_unbind){
                log.error(err_unbind);
              }
              callback(err_srch, null);
            });
          }else{
            res.on('searchEntry', function(entry) {
              var member = entry.object.member;
              if(member){
                if(Array.isArray(member)){
                  member.forEach(function(member){
                    if(member.substr(0,4) === 'uid='){
                      member = member.split(',')[0].replace('uid=','');
                      records.push(member);
                    }
                  });
                }else{
                  if(member.substr(0,4) === 'uid='){
                    member = member.split(',')[0].replace('uid=','');
                    records.push(member);
                  }
                }
              }else{
                callback('No members found.', null);
              }
            });
            res.on('error', function(err_search) {
              log.error('LDAP failed to retrieve the members of '+group+': ' + err_search.message);
              ldapClient.unbind(function(err_unbind) {
                if(err_unbind){
                  log.error('LDAP unbind error: '+err_unbind);
                }
              });
              callback(err_search, null);
            });
            res.on('end', function(result) {
              log.info('status: ' + result.status);
              ldapClient.unbind(function(err_unbind) {
                if(err_unbind){
                  log.error('LDAP unbind error: '+err_unbind);
                }
              });
              callback(null, records);
            });
          }
        });
      }else{
        callback(err, null);
      }
    });
  },
};
