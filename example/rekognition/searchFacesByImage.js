const AWS = require('aws-sdk');
const fs = require('fs');

var rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

const source = fs.readFileSync(`${__dirname}/assets/tetsu-01.jpg`);
// const target = fs.readFileSync(`${__dirname}/assets/tetsu-02.jpg`);

const collectionId = 'tetsuphotos';
const sources = [
    fs.readFileSync(`${__dirname}/assets/tetsu-01.jpg`),
    fs.readFileSync(`${__dirname}/assets/tetsu-02.jpg`),
    fs.readFileSync(`${__dirname}/assets/tetsu-03.jpg`),
    fs.readFileSync(`${__dirname}/assets/tetsu-04.jpg`),
    fs.readFileSync(`${__dirname}/assets/tetsu-05.jpg`),
    fs.readFileSync(`${__dirname}/assets/tetsu-06.jpg`)
];
rekognition.createCollection(
    {
        CollectionId: collectionId
    },
    async (err, data) => {
        if (err) {
            if (err.code !== 'ResourceAlreadyExistsException') {
                console.error(err);

                return;
            }
        }

        // faceをコレクションに登録
        const source = fs.readFileSync(`${__dirname}/assets/tetsu-03.jpg`);
        await new Promise((resolve, reject) => {
            rekognition.indexFaces({
                CollectionId: collectionId, /* required */
                Image: { /* required */
                    Bytes: source
                },
                DetectionAttributes: ['ALL'],
                // ExternalImageId: 'STRING_VALUE'
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('face indexed.');
                    resolve();
                }
            });
        });

        await new Promise((resolve, reject) => {
            rekognition.listFaces(
                {
                    CollectionId: collectionId, /* required */
                    // MaxResults: 0,
                    // NextToken: 'STRING_VALUE'
                },
                (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(data);
                        resolve();
                    }
                });
        });

        await new Promise((resolve, reject) => {
            rekognition.searchFacesByImage(
                {
                    CollectionId: collectionId, /* required */
                    FaceMatchThreshold: 95,
                    MaxFaces: 5,
                    Image: { /* required */
                        Bytes: fs.readFileSync(`${__dirname}/assets/tetsu-04.jpg`)
                    }
                },
                (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(data);
                        resolve();
                    }
                });
        });
    });