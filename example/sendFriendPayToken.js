const request = require('request-promise-native');

request.post(
    'http://localhost:8080/webhook',
    {
        json: true,
        body: {
            events: [
                {
                    message: {
                        text: 'FriendPayToken.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cmFuc2FjdGlvbklkIjoiNWFiNGI1OTgyNjIzMjIxM2Q0NzVhY2U0IiwidXNlcklkIjoiVTI4ZmJhODRiNDAwOGQ2MDI5MWZjODYxZTI1NjJiMzRmIiwicHJpY2UiOjEwMDAsImlhdCI6MTUyMTc5MjQxM30.wYPdfyrI5yjQyIaCfAZpr7bFmiA_A5h1VbhzpEsFFVE',
                        type: 'text'
                    },
                    replyToken: '26d0dd0923a94583871ecd7e6efec8e2',
                    source: {
                        type: 'user',
                        userId: 'U28fba84b4008d60291fc861e2562b34f'
                    },
                    timestamp: 1487085535998,
                    type: 'message'
                }
            ]
        }
    }
).then(console.log);
