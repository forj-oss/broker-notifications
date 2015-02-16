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

var amqp = require('amqp'),
    projectUtils = require('./lib/project-utils'),
    config = require('./config'),
    bunyan = require('bunyan'),
    async = require('async');
var log = bunyan.createLogger({name: 'user-notification-broker'});

var rabbitmqConnectionOptions =  config.connections.messaging;
var rabbitmqImplOptions = { defaultExchangeName: config.exchange_name };
var connection = amqp.createConnection(rabbitmqConnectionOptions, rabbitmqImplOptions);

// Wait for connection to become established.
connection.on('ready', function () {

  connection.queue(config.queue_name, { passive: true }, function (queue) {
    log.info('Queue ' + queue.name + ' is open');

    queue.subscribe(function (payload, headers, deliveryInfo, messageObject) {
      log.info('Got a message with routing key ' + deliveryInfo.routingKey);
      var role = projectUtils.getRole(payload);
      if(role){
        async.waterfall([
          function(callback){
            projectUtils.validateMessage(payload, callback);
          },
          function(valid, callback){
            projectUtils.getServiceAccount(callback);
          },
          function(account, callback){
            projectUtils.getMembersOf(role, account, function(err, results){
              callback(err, account, results);
            });
          },
          function(account, results, callback){
            projectUtils.addNewNotification(JSON.stringify(payload), results, callback);
          }
          ], function(err, result){
            if(err){
              log.error(err);
            }else{
              log.info('A notification has arrived.');
            }
          });
        }else{
          log.error('Role not found.');
        }
    });
  });
});
