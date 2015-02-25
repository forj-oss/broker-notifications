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

var should = require('chai').should();
var notificationUtils = require('../lib/project-utils');
var fs = require('fs');
var jsonMessage = fs.readFileSync('./test/testMessage.json', 'utf8');
var config = require('./testConfig');

describe('#Notification', function() {
  it('adds a new message to redis', function() {

    notificationUtils.addNewNotification(jsonMessage, config.mails, function(error, stdout) {
      should.not.exist(error);
      should.exist(stdout);
    });
  });
});

describe('#Notification', function() {
  it('gets the LDAP account', function() {

    notificationUtils.getServiceAccount(function(error, stdout) {
      should.not.exist(error);
      should.exist(stdout);
    });
  });
});

describe('#Notification', function() {
  it('gets members from a defined group', function() {

    notificationUtils.getMembersOf(config.role, config.account, function(error, stdout) {
      should.not.exist(error);
      should.exist(stdout);
    });
  });
});
