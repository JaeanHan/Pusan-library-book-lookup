/*
실제 해당 서버를 실행하기 위해선 NPM괴 node js가 필요합니다.
제가 사용한 node의 버전은 아래와 같습니다.
node : 18.18.0

위의 prequisition를 만족한다면, 무리 없이 해당 서버를 사용할 수 있습니다.

How to Start.
1. cd proxy
3. node server.js
*/

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 3001;

const clientId = "CLIENT_ID";
const clientSecret = "CLIENT_SECRETE";

// CORS 설정
app.use(cors());

//요청을 실제 네이버 api 대신 받아서 네이버 api에게 전달하고
//응답을 localhost 대신 받아서 locahost에게 전달합니다
app.get('/proxy', async (req, res) => {
    const apiUrl = 'https://openapi.naver.com/v1/search/book.json';
    const query = req.query.query;
    const display = req.query.display;
    const start = req.query.start;

    try {
        // 요청에 Naver API 사용에 필수요소인 X-Naver-Client-Id와 X-Naver-Client-Secret 헤더를 추가합니다.
        const response = await axios.get(apiUrl, {
            params: { query, display, start },
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error occurred' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
