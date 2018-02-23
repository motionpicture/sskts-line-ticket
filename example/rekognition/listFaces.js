const AWS = require('aws-sdk');

var rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

const collectionId = 'sskts-line-ticket-12345';
rekognition.listFaces(
    {
        CollectionId: collectionId, /* required */
        // MaxResults: 0,
        // NextToken: 'STRING_VALUE'
    },
    (err, data) => {
        if (err) {
            console.error(err);
        } else {
            console.log(data);
        }
    });
