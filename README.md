### 프로젝트 설명
부산광역시 도서관 도서 조회 서비스입니다. <br/>
키워드를 통한 검색과 스크롤링을 통한 추가 아이템 로드가 가능합니다. <br/>
실제 사용을 위해선 [공공데이터포털](https://www.data.go.kr/data/15088659/openapi.do#/layer-api-guide) 과 [네이버 오픈 API](https://developers.naver.com/docs/common/openapiguide/apilist.md#%EB%B9%84%EB%A1%9C%EA%B7%B8%EC%9D%B8-%EB%B0%A9%EC%8B%9D-%EC%98%A4%ED%94%88-api) 의 api key 및 client id, secret이 필요합니다. <br/> 
네이버 검색을 사용하기 위해선 proxy server를 실행해야 합니다.

### How to Start Proxy Server
```
cd proxy
npm i
node server.js
```
### How to Start App
```
double-click index.html
```
<br/>

### 실행결과

![image](https://github.com/JaeanHan/Pusan-library-book-lookup/assets/65104605/9614039b-1b47-4e12-9a58-2ee7a600a671)
