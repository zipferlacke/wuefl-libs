//====================================================================
// Pop-up Notification
//====================================================================
let interval = "";
/**
 * 
 * @param {string} content 
 * @param {"info"|"success"|"warning"|"error"} type 
 * @param {*} duration 
 */
export function showBanner(content, type, duration=5000){
    if (!type in ["info","succes","warning","error"]) {
        throw 'showAlert(): type must be: "info"|"succes"|"warning"|"error';
    }

    if (!document.querySelector("#notification_wrapper")) {
        var popup = document.createElement("div");
        popup.setAttribute("id", "notification_wrapper");
        document.body.appendChild(popup);
        //document.body.innerHTML += `<div id="notification_wrapper"></div>`;
    }
    const notification_wrapper = document.querySelector("#notification_wrapper"); 

    let icon = `<svg></svg>`;
    if(type == "error"){
        icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
    }else if(type == "warning"){
        icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Zm0-100Z"/></svg>`;
    }else if(type == "success"){
        icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m382-354 339-339q12-12 28.5-12t28.5 12q12 12 12 28.5T778-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z"/></svg>`;
    }
    

    let closeButton = `<button onclick="closeBannerManuell(this)" class="notification_close button" data-shape="square nobackground"><svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"><path d="M480-438 270-228q-9 9-21 9t-21-9q-9-9-9-21t9-21l210-210-210-210q-9-9-9-21t9-21q9-9 21-9t21 9l210 210 210-210q9-9 21-9t21 9q9 9 9 21t-9 21L522-480l210 210q9 9 9 21t-9 21q-9 9-21 9t-21-9L480-438Z"/></svg></button>`;
    notification_wrapper.innerHTML = `
    <div class="notification" time="${Date.now() + duration}" type="${type}"> 
        ${icon}
        <p class="notification_msg">${content}</p> 
        ${closeButton}
    </div>` + notification_wrapper.innerHTML;

    let interval = startCheckingNotifications();
}


function startCheckingNotifications(){
    return setInterval(checkNotifications, 500);
}


function checkNotifications() {
    // Alle Mitteilungen finden
    const notification_wrapper = document.querySelector("#notification_wrapper"); 
    const notifications = notification_wrapper.querySelectorAll(".notification");

    // Die Funktion stoppen, wenn keine Mitteilungen mehr vorhanden sind
    if (notifications.length === 0) {
        clearInterval(interval);
    }

    // Alle Mitteilungen schließen, deren Zeit abgelaufen ist
    for (var i = 0; i < notifications.length; i++) {
        if (Date.now() - notifications[i].getAttribute("time") > 0) {
            notifications[i].remove();
        }
    }
}

function closeBannerManuell(e) {
    e.parentElement.remove();
}

window.closeBannerManuell = closeBannerManuell