var CUBRIDClient = require('./test_Setup').testClient,
  Helpers = require('../src/utils/Helpers'),
  Result2Array = require('../src/resultset/Result2Array'),
  assert = require('assert');

global.savedQueryHandle = null;
global.batchExecuteNo = 1;
global.queryNo = 1;

Helpers.logInfo(module.filename.toString() + ' started...');

CUBRIDClient.connect(function () {
});

CUBRIDClient.on(CUBRIDClient.EVENT_ERROR, function (err) {
  Helpers.logError('Error!: ' + err.message);
  throw 'We should not get here!';
});

CUBRIDClient.on(CUBRIDClient.EVENT_CONNECTED, function () {
  Helpers.logInfo('Connected.');
  Helpers.logInfo('Execute: create test table');
  CUBRIDClient.batchExecuteNoQuery(['drop table if exists test_tran', 'create table test_tran(id int)']);
});

CUBRIDClient.on(CUBRIDClient.EVENT_BATCH_COMMANDS_COMPLETED, function () {
  Helpers.logInfo('Batch executeDone');
  if (global.batchExecuteNo === 1) {
    CUBRIDClient.beginTransaction();
    global.batchExecuteNo++;
  } else {
    if (global.batchExecuteNo === 2) {
      Helpers.logInfo('Querying: select * from test_tran');
      CUBRIDClient.query('select * from test_tran');
      global.batchExecuteNo++;
    }
    else {
      Helpers.logInfo('Commiting transaction.');
      CUBRIDClient.commit();
    }
  }
});

CUBRIDClient.on(CUBRIDClient.EVENT_BEGIN_TRANSACTION, function () {
  Helpers.logInfo('Begin transaction.');
  Helpers.logInfo('Execute: insert into test_tran values(1)');
  CUBRIDClient.batchExecuteNoQuery('insert into test_tran values(1)');
});

CUBRIDClient.on(CUBRIDClient.EVENT_ROLLBACK_COMPLETED, function () {
  Helpers.logInfo('Transaction rollback completed.');
  Helpers.logInfo('Querying: select * from test_tran');
  CUBRIDClient.query('select * from test_tran');
});

CUBRIDClient.on(CUBRIDClient.EVENT_COMMIT_COMPLETED, function(){
  Helpers.logInfo('Transaction commit completed.');
  Helpers.logInfo('select count(*) from db_class where class_name = \'test_tran\'');
  CUBRIDClient.query('select count(*) from db_class where class_name = \'test_tran\'');
});

CUBRIDClient.on(CUBRIDClient.EVENT_QUERY_DATA_AVAILABLE, function (result, queryHandle) {
  Helpers.logInfo('Data received.');
  Helpers.logInfo('Returned active query handle: ' + queryHandle);
  global.savedQueryHandle = queryHandle; // save handle - needed for further fetch operations
  if (global.queryNo === 1) {
    assert(Result2Array.TotalRowsCount(result) === 1);
    CUBRIDClient.closeQuery(global.savedQueryHandle);
    global.queryNo++;
  } else {
    if (global.queryNo === 2) {
      assert(Result2Array.TotalRowsCount(result) === null);
      CUBRIDClient.closeQuery(global.savedQueryHandle);
    } else {
      assert(Result2Array.RowsArray(result)[0][0] === 0);
      CUBRIDClient.closeQuery(global.savedQueryHandle);
    }
  }
});

CUBRIDClient.on(CUBRIDClient.EVENT_QUERY_CLOSED, function () {
  Helpers.logInfo('Query closed.');
  global.savedQueryHandle = null;
  if (global.queryNo === 1) {
    Helpers.logInfo('Transaction do rollback.');
    CUBRIDClient.rollback();
    global.queryNo++;
  } else {
    if (global.queryNo === 2) {
      Helpers.logInfo('Execute: drop table test_tran');
      CUBRIDClient.batchExecuteNoQuery('drop table test_tran');
      global.queryNo++;
    } else {
      Helpers.logInfo('Closing connection...');
      CUBRIDClient.close();
    }
  }
});

CUBRIDClient.on(CUBRIDClient.EVENT_CONNECTION_CLOSED, function () {
  Helpers.logInfo('Connection closed.');
  Helpers.logInfo('Test passed.');
});

