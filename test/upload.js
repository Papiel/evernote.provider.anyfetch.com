'use strict';

var request = require('supertest');
var AnyFetchProvider = require('anyfetch-provider');
var Anyfetch = require('anyfetch');
var sinon = require('sinon');
require('should');

var config = require('../config/configuration.js');
var serverConfig = require('../lib/');

describe("Workflow", function() {
  before(AnyFetchProvider.debug.cleanTokens);

  // Create a fake HTTP server
  Anyfetch.setApiUrl('http://localhost:1337');
  var apiServer = Anyfetch.createMockServer();
  apiServer.listen(1337);

  before(function(done) {
    AnyFetchProvider.debug.createToken({
      anyfetchToken: 'fake_gc_access_token',
      data: {
        token: config.testToken,
        callbackUrl: config.providerUrl + "/init/callback"
      },
      cursor: 0,
      accountName: 'accountName'
    }, done);
  });

  it("should upload data to AnyFetch", function(done) {
    this.timeout(20000);
    serverConfig.config.retry = 0;
    serverConfig.config.concurrency = 1;
    var server = AnyFetchProvider.createServer(serverConfig.connectFunctions, __dirname + '/workers-test.js', __dirname + '/../lib/update.js', serverConfig.config);

    request(server)
      .post('/update')
      .send({
        access_token: 'fake_gc_access_token',
        api_url: 'http://localhost:1337',
        documents_per_update: 2500
      })
      .expect(202)
      .end(function(err) {
        if(err) {
          throw err;
        }
      });

    server.usersQueue.on('job.task.failed', function(job, err) {
      done(err);
    });

    server.usersQueue.on('job.update.failed', function(job, err) {
      done(err);
    });

    server.usersQueue.once('empty', function() {
      done();
    });
  });
});
