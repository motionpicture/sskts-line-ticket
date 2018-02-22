const AWS = require('aws-sdk');
const fs = require('fs');

var rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

// const source = fs.readFileSync(`${__dirname}/assets/tetsu-03.jpg`);
// const target = fs.readFileSync(`${__dirname}/assets/tetsu-04.jpg`);
const source = new Buffer(fs.readFileSync(`${__dirname}/assets/content`));
const target = fs.readFileSync(`${__dirname}/assets/tetsu-01.jpg`);
const params = {
    SourceImage: { /* required */
        Bytes: source /* Strings will be Base-64 encoded on your behalf */,
        // Bytes: new Buffer('...') || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
        // S3Object: {
        //     Bucket: 'STRING_VALUE',
        //     Name: 'STRING_VALUE',
        //     Version: 'STRING_VALUE'
        // }
    },
    TargetImage: { /* required */
        Bytes: target /* Strings will be Base-64 encoded on your behalf */,
        // Bytes: new Buffer('...') || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
        // S3Object: {
        //     Bucket: 'STRING_VALUE',
        //     Name: 'STRING_VALUE',
        //     Version: 'STRING_VALUE'
        // }
    },
    SimilarityThreshold: 0.0
};
rekognition.compareFaces(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data);           // successful response
});
