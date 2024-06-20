const formEl = document.getElementById("searchForm");
const naverEl = document.getElementById("naverSearch");
const spinnerEl = document.getElementsByClassName("spinner")[0];
const favoriteEl = document.getElementsByName("favorite")[0];
// 네트워크 요청이 pending 상태일 때 abort하는 용도입니다.
// Promise를 reject해버리는 방식이라 실제로 요청을 취소하는 것은 아니고 응답이 와도 무시하게 되는 방식입니다.
const controller = new AbortController();
const signal = controller.signal;
const myfavorite = [];
const KEY = "favorite";
let fetchInstance;

/**
 * 매개변수를 사용해 table 엘리먼트를 동적으로 생성하는 함수입니다.
 * isNaver 플래그를 통해 네이버 API와 공공 데이터 포탈 API를 구분해서 행을 생성합니다.
 * @param {boolean} isNaver 
 * @returns {HTMLTableElement}
 */
const createTableEl = (publisher, pub_year, author, page, lib_name, book_type, isNaver, description, price) => {
    const bookTable = document.createElement("table");
    const defaultOptions = [
        { label: "페이지 수", value: page},
        { label: "위치", value: lib_name },
        { label: "종류", value: book_type }];
    const naverOptions = [
        { label: "정가", value: price },
        { label: "설명", value: description }
    ];

    [ 
        { label: "출판사", value: publisher },
        { label: "출판년도", value: pub_year },
        { label: "작가", value: author },
        
    ].concat(isNaver ? naverOptions : defaultOptions)
    .forEach(row => {
        const { label, value } = row;
        const tr = document.createElement("tr");
        const tdLabel = document.createElement("td");
        const tdValue = document.createElement("td");
        tdLabel.style.textWrap = "pretty";
        tdValue.style.textWrap = "pretty";

        tdLabel.append(document.createTextNode(label));
        tdValue.append(document.createTextNode(value));
        tr.append(tdLabel);
        tr.append(tdValue);

        bookTable.append(tr);
    });

    return bookTable;
};

/**
 * 책의 디테일을 표시하는 div 엘리먼트를 동적으로 생성하는 함수입니다. 
 * @param {boolean} isNaver 
 * @returns {HTMLDivElement}
 */
const createBookDetail = (image, publisher, pub_year, author, page, lib_name, book_type, isNaver, description, price, link, title_info) => {
    const bookDetail = document.createElement("div");
    const bookImage = document.createElement("img");
    const BookImageWrap = document.createElement("div");

    const addToMyFavorite = (e) => {
        e.preventDefault();
        const common = { image, publisher, pub_year, author, title_info };
        if (!confirm("즐겨찾기에 추가하시겠습니까?")) {
            return;
        }
        if (isNaver) {
            myfavorite.push({ ...common, isNaver, price, description, link });
        } else {
            myfavorite.push({...common, page, isNaver, lib_name, book_type});
        }
        localStorage.setItem(KEY, JSON.stringify(myfavorite));
    }

    bookDetail.classList.add("book-card__detail");
    bookImage.src = image;
    bookImage.setAttribute("height", "250px");
    BookImageWrap.append(bookImage);
    BookImageWrap.addEventListener("click", addToMyFavorite);
    bookDetail.append(BookImageWrap);
    bookDetail.append(createTableEl(publisher, pub_year, author, page, lib_name, book_type, isNaver, description, price));

    return bookDetail;
};

/**
 * 각 점들의 기능은 없고 스타일링 용도입니다.
 * @returns {HTMLDivElement}
 */
const createBookTools = () => {
    const tools = document.createElement("div");
    tools.classList.add("tools");
    ["red", "yellow", "green"].forEach(color => {
        const circle = document.createElement("div");
        const dot = document.createElement("span");
        circle.classList.add("circle");
        dot.classList.add("box");
        dot.classList.add(color);

        circle.append(dot);
        tools.append(circle);
    });
    return tools;
};

/**
 * 책을 표시하는 카드의 제목을 반환하는 함수입니다.
 * @param {boolean} isNaver 
 * @param {string} link 
 * @returns 
 */
const createBookTitle = (isNaver, link) => {
    if (isNaver) {
        const anchor = document.createElement("a");
        anchor.setAttribute("href", link);
        anchor.setAttribute("tooltip", "link to naver");
        anchor.setAttribute("target", "_blank");
        return  anchor;
    }
    return document.createElement("h3");
}

/**
 * fetch를 통해 받아온 데이터를 보기 좋게 카드의 형식으로 가시화 하는 엘리먼트를 반환하는 함수입니다.
 * @param {*} item 
 * @returns {HTMLDivElement}
 */
const createBookCard = (item) => {
    const { 
        title_info, publisher, pub_year, author, image, // 공통 되는 데이터
        page, lib_name, book_type, // 공공 데이터 포탈 API만 제공하는 데이터
        isNaver, description, price, link // naver API만 제공하는 데이터
    } = item;
    const bookCard = document.createElement("div");
    const bookTitle = createBookTitle(isNaver, link);
    const bookDetail = createBookDetail(image, publisher, pub_year, author, page, lib_name, book_type, isNaver, description, price, link, title_info);
    bookCard.classList.add("book-card");
    bookTitle.append(document.createTextNode(title_info));

    bookCard.append(createBookTools());
    bookCard.append(bookTitle);
    bookCard.append(bookDetail);
    return bookCard;
}

/**
 * fetch를 통해 공공 데이터 포탈 API에서 책 내용을 검색하고 가져오기 위한 function instance를 생성하는 함수입니다.
 * @returns 
 */
const createPublicDataFetch = () => {
    // 내부 변수들은 createFetch의 실행이 끝나도 내부 함수에 의해 참조되기 때문에 메모리에서 사라지지 않습니다. (Closure)
    const APIKey = "공공데이터_APIKEY";
    const endPoint = "공공데이터_ENDPOINT";
    const numOfRows = 10;
    let pageNo = 1;
    let isFetching = false; // 중복 요청을 방지합니다.

    return (title, date, author, lib) => {
        if (isFetching) {
            return;
        }
        isFetching = true;
        spinnerEl.style.opacity = "1";
        
        const scrollPosition = window.scrollY;
        const url = `${endPoint}/getNewBookList?ServiceKey=${APIKey}&resultType=json&numOfRows=${numOfRows}&pageNo=${pageNo}`;
        const requestParams = (title ? "&title_info=" + title : "") 
            + (date ? "&shelf_date=" + date.replace(/-/g, '/') : "") //날짜포맷 변경
            + (author ? "&author=" + author : "")
            + (lib ? "&lib_name=" + lib : "");

        fetch(url + requestParams, { signal })
            .then(res => res.json())
            .then(data => {
                const books = data.getBookNewList.body.items.item;
                const resultEl = document.getElementById("result");
                const clone = resultEl.cloneNode(true);
                
                books
                .map(book => createBookCard(book))
                .forEach(item => clone.appendChild(item));
            
                resultEl.replaceWith(clone);
                spinnerEl.style.opacity = "0";
                pageNo += numOfRows;
                window.scrollTo(0, scrollPosition);
            })
            .catch(err => console.error(err))
            .finally(() => isFetching = false);
    };
};

/**
 * fetch를 통해 naver API에서 책 내용을 검색하고 가져오기 위한 function instance를 생성하는 함수입니다.
 * @returns 
 */
const createNaverFetch = () => {
    // 내부 변수들은 createFetch의 실행이 끝나도 내부 함수에 의해 참조되기 때문에 메모리에서 사라지지 않습니다. (Closure)
    const display = 10;
    let pageNo = 1;
    let isFetching = false; // 중복 요청을 방지합니다.

    return (query) => {
        if (isFetching) {
            return;
        }
        isFetching = true;
        spinnerEl.style.opacity = "1";

        const scrollPosition = window.scrollY;
        // 네이버는 CORS에러 때문에 직접 요청할 수 없어 proxy 서버를 통해 요청을 보냅니다.
        const url = `http://localhost:3001/proxy?query=${query}&display=${display}&start=${pageNo}`;
        pageNo += display;

        fetch(url, {
            method: "GET"
        })
        .then(res => res.json())
        .then(data => {
            const books = data.items;
            const resultEl = document.getElementById("result");
            const clone = resultEl.cloneNode(true);

            books
                .map(book => createBookCard({
                    isNaver: true,
                    title_info: book.title,
                    publisher: book.publisher,
                    pub_year: book.pubdate.slice(0, 4),
                    author: book.author,
                    image: book.image,
                    description: book.description.slice(0, Math.min(50, book.description.length)) + "...",
                    price: book.discount,
                    link: book.link
                }))
                .forEach(item => clone.append(item));

            isFetching = false;
            resultEl.replaceWith(clone);
            spinnerEl.style.opacity = "0";
            window.scrollTo(0, scrollPosition);
        })
        .catch(err => console.error(err));
    };
};

/**
 * 너무 잦은 함수 호출을 방지합니다.
 * @param {function} callback 
 * @returns {function}
 */
const throttle = (callback) => {
    let block = false;
    return () => {
        if (block) {
            return;
        }
        block = true;
        callback();
        setTimeout(() => {
            block = false;
        }, 100);
    };
};


/**
 * 스크롤 이벤트 핸들러들을 보기 쉽게 묶어놨습니다.
 * 
 * @returns 
 */
const fetchInstanceController = () => {
    // 스크롤의 제한이 없고 소위 무한 스크롤을 할 수 있는데 특정 스크롤이 특정 위치에 다다르면
    // 요청을 보내 새로운 데이터를 미리 가져오는 방식입니다.
    // 로컬에서 테스트를 했을 때, 약 8000개까지는 이상이 없었습니다.
    // 그러나 8000개가 넘어가니까 브라우저가 그냥 종료되는 현상이 발생했습니다.
    // 추후 실제 DOM TREE에 반영되는 요소들의 개수를 제한해 windowing 기법을 적용하면
    // 진짜 무리 없는 무한 스크롤을 구현할 수 있을 것 같습니다.
    const defaultFetch = throttle(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const [title, date, author, lib] = getInputValuesFromForm(formEl);
            fetchInstance(title, date, author, lib);
        }
    });
    const naverFetch = throttle(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const [query] = getInputValuesFromForm(naverEl);
            fetchInstance(query);
        }
    });

    const switchToNaver = () => {
        fetchInstance = createNaverFetch();
        window.removeEventListener("scroll", defaultFetch);
        window.addEventListener("scroll", naverFetch);
    };
    const switchToDefault = () => {
        fetchInstance = createPublicDataFetch();
        window.removeEventListener("scroll", naverFetch);
        window.addEventListener("scroll", defaultFetch);
    };

    const removeEventListenerAll = () => {
        window.removeEventListener("scroll", naverFetch);
        window.removeEventListener("scroll", defaultFetch);
    }

    return {
        switchToNaver,
        switchToDefault,
        removeEventListenerAll,
    }
}

const { switchToDefault, switchToNaver, removeEventListenerAll } = fetchInstanceController();

/**
 * form 엘리먼트를 매개변수로 받아와 내부 input의 value들을 하나의 array로 묶어 반환합니다.
 * @param {HTMLFormElement} formEl 
 * @returns {Array}
 */
const getInputValuesFromForm = (formEl) => {
    return Array.from(formEl).map(el => {
        if (el.value) {
            return el.value;
        }
    });
};

/**
 * 공공 데이터 포탈 API의 폼에서 submit 이벤트가 발생했을 시 실행되는 이벤트 핸들러입니다.
 * @param {MouseEvent} e 
 */
const onSubmit = (e) => {
    e.preventDefault();
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = "";
    switchToDefault();

    const formEl = e.target;
    const [title, date, author, lib] = getInputValuesFromForm(formEl);
    fetchInstance(title, date, author, lib);
};

/**
 * Naver API의 폼에서 submit 이벤트가 발생했을 시 실행되는 이벤트 핸들러입니다.
 * @param {MouseEvent} e 
 */
const onNaverSubmit = (e) => {
    e.preventDefault();
    // 공공 데이터 포탈 API의 응답 속도가 느려 공공 데이터 포탈 API요청을 보낸 후 Naver로 새로운 요청을 보내는 경우를 대비해
    // 공공 데이터 포탈 API의 요청을 보냈다면 취소하는 용도입니다.
    controller.abort("switch to naver on pending");
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = "";

    switchToNaver();

    const formEl = e.target;
    const [query] = getInputValuesFromForm(formEl);
    fetchInstance(query);
};

/**
 * 즐겨찾기 버튼을 클릭했을 때 실행되는 이벤트 핸들러입니다.
 * @param {MouseEvent} e 
 */
const onClickFavorite = (e) => {
    e.preventDefault();
    // 혹시 공공 데이터 포탈 API에 요청을 보냈을 경우를 고려해 요청을 취소합니다.
    controller.abort("switch to favorite on pending");
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = "";
    const clone = resultEl.cloneNode();
    const items = JSON.parse(localStorage.getItem(KEY)) ?? []; 

    items.map(item => createBookCard(item)).forEach(card => clone.append(card));
    resultEl.replaceWith(clone);

    removeEventListenerAll();
};

favoriteEl.onclick = onClickFavorite;
naverEl.onsubmit = onNaverSubmit;
formEl.onsubmit = onSubmit;

//load 이벤트 발생시 실행되는 이벤트 핸들러입니다.
window.onload = () => {
    switchToDefault();
    fetchInstance();
    (JSON.parse(localStorage.getItem(KEY)) ?? []).forEach(item => myfavorite.push(item));
};