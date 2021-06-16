const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});

const ddb = new AWS.DynamoDB();

const params = {
    TableName: 'reportList',
    Item: {
        date: {
            S: '2021-06-09'
        },
        stockName: {
            S: 'SAMPLE'
        },
        stockId: {
            S: '999999'
        },
        reportName: {
            S: 'THIS IS A SAMPLE ITEM'
        },
        priceGoal: {
            S: '999999'
        },
        analyst: {
            S: 'LOREM'
        },
        firm: {
            S: 'IPSUM'
        },
        reportIdx: {
            S: '999999'
        }
    }
};

ddb.putItem(params, function(err, data) {
    if (err) {
        console.log("Error", err);
    } else {
        console.log("Success", data);
    }
});
