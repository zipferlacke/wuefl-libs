function createArticleOverview(path, uuid, title, summary, author, categorie, cover="", mainArticle="", articleMarker="", path2="articles/"){
    if(cover != ""){
        var thubnail = cover["file"].split(".");
        var imgExt = thubnail.pop();
        var imgsrc = thubnail.join(".")+"-thumbnail."+imgExt;
        cover = `<div class="article_cover_box copyright_box">
            <img class="img article_img" src="${path}uploads/${uuid}/${imgsrc}" loading="lazy">
            <p class="copyright">${cover["copyright"]}</p>
        </div>`
    }
    
    let href = "";
    if(uuid != "none"){
        href=`href="${path}${path2}${uuid}.html"`;
    }else{
        cover = "";
        href = `onclick="cconfirm('Zugriff verweigert','Sie müssen sich anmelden, um auf den Artikel zugreifen zukönnen.', 'Verstanden', 'error');"`
        articleMarker = `<span class="msr">lock</span>` + articleMarker;
        mainArticle += " no-select";
    }

    let article = `
    ${path2 =="articles/" ? `<a ${href} class="${mainArticle}" normal>` : `<a href="${path}${path2}?article_uuid=${uuid}" class="${mainArticle}" normal>`}
        <article class="vertical card | bg-white">
            ${cover}
            <div class="article_data">
                <h3 class="heading-3">${categorie}</h3>
                <h1 class="heading-1 text-hover">${articleMarker}${title}</h1>
                <p class="heading-4">Von ${author}</p>
                <p class="paragraph">${summary}</p>
            </div>
        </article>
    </a>`;
    console.log(article)
    return article;
}

function createSlide(path, uuid, cover, author, title, articleMarker, link = true, linkPath="", qrcode=false, summary=""){
    let baseUrl = document.location.href.split('/').slice(0, 3).join('/');
    if(baseUrl == "https://app.wuefl.de") baseUrl +="/wnews";

    if(qrcode){
        qrcode = `<div class="qrcode slide_qrcode" url="${baseUrl}/articles/${uuid}.html" imgUrl="../defaults/icons/favicon.svg"></div>`;}
    else{qrcode = "";}
    if(!qrcode && uuid=="none"){return ""}
    if(summary != ""){summary = "<p>"+summary+"</p>";}

    
    let thubnail = cover["file"].split(".");
    let imgExt = thubnail.pop();
    let imgsrc = thubnail.join(".")+"-slideshow."+imgExt;
    
    
    let className = "slide";
    let tag = "article"
    if(link) {
        tag = "a";
        className += `" href="${path}articles/${uuid}.html`
    };
    let slide = `
    <${tag} class="${className}">
        <img class="img slide_img" src="${path}uploads/${uuid}/${imgsrc}" loading="lazy">
        <div class="slide_content">
            <p class="heading-4">Von ${author}</p>
            <p class="heading-1">${articleMarker}${title}</p>
            ${summary}
            <p class="copyright slide_copyright">${cover["copyright"]}</p>
        </div>
        ${qrcode}
        
    </${tag}>
    `
    return slide;
}

function createImgSlide(path, uuid, cover, author){
    let thubnail = cover.split(".");
    let imgExt = thubnail.pop();
    let imgsrc = thubnail.join(".")+"-thumbnail."+imgExt;
    let slide = `
    <article class="slide">
        <img class="img slide_img" src="${path}uploads/${uuid}/${imgsrc}" loading="lazy">
        <div class="slide_text">
            <p class="clr-primary-900">${author}</p>
        </div>
    </article>`
    
    return slide;
}
