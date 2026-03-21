import Gestures from '../js/gestures.js';
/*
Slideshow JS
Copyright: Florian Wüllner 2023

Inspieriet von: https://www.youtube.com/watch?v=uo91S2tdHHY
*/

//---
// Inistialisierung der HTML-Objekte
//---
export default function Slideshows(document, durationPerSlide=4000){
    var slideshows = document.querySelectorAll(".slideshow");
    //var durationPerSlide = 4000;
    let lastChange = new Date().getTime();
    let currentSlide=0;

    slideshows.forEach(function(slideshow){
        const slides = slideshow.querySelectorAll(".slide");
        if(slideshow.querySelector(".slideshow_navi_dots")) slideshow.querySelector(".slideshow_navi_dots").remove();
        if(slideshow.querySelector(".slideshow_navi_left")) slideshow.querySelector(".slideshow_navi_left").remove();
        if(slideshow.querySelector(".slideshow_navi_right")) slideshow.querySelector(".slideshow_navi_right").remove();
        


        if(slides.length > 0){          
            for (let i = 0; i < slides.length; i++) {
                slides[i].setAttribute("index", i);
                slides[i].setAttribute("close", "");
            }
            slides[0].removeAttribute("close");

            //Punkte werden gesetzt
            slideshow.innerHTML += `<div class="slideshow_navi_dots"></div>`;
            const dotWrapper = slideshow.querySelector(".slideshow_navi_dots");

            for (let i = 0; i < slides.length; i++) {
                dotWrapper.innerHTML += `<p class="slideshow_navi_dots__dot msr" index="${i}" close>remove</p>`;
            }
            let firstDot =  slideshow.querySelector(".slideshow_navi_dots__dot");
            firstDot.removeAttribute("close");
        }
    });
    

    this.runManuell = function (){
        slideshows.forEach(function(slideshow){
            navigationArrows(slideshow);
            navigationDots(slideshow);
            navigationGestures(slideshow);
        });
    }

    this.runAutomatic = function(){
        slideshows.forEach(function(slideshow){
            if(new Date().getTime() - lastChange >durationPerSlide){
                slideSwitch(1, slideshow, 0);
            }
        });
    }

    //Punktnavigation wird erstellt
    function navigationDots(slideshow){
        var slideshow_navi_dots = slideshow.querySelectorAll(".slideshow_navi_dots__dot");
        slideshow_navi_dots.forEach(function(slideshow_navi_dots__dot){
            slideshow_navi_dots__dot.addEventListener("click", function(e){
                let currentSlide = parseInt(slideshow.querySelector(".slideshow_navi_dots__dot:not([close])").getAttribute("index"));

                slideSwitch((currentSlide-parseInt(e.currentTarget.getAttribute("index")))*-1, slideshow);
            });
        });
    }

    //Gestennavigation wird erstellt
    function navigationGestures(slideshow){
        let gestures = new Gestures(slideshow);
        gestures.onLeft(function(){
            slideSwitch(-1, slideshow);
        }); 

        gestures.onRight(function(){
            slideSwitch(1, slideshow);
        });
    }

    function navigationArrows(slideshow){
        slideshow.innerHTML += `<p class="slideshow_navi_arrow slideshow_navi_left msr">keyboard_arrow_left</p>`;
        slideshow.innerHTML += `<p class="slideshow_navi_arrow slideshow_navi_right msr">keyboard_arrow_right</p>`;
        let arrowLeft = slideshow.querySelector(".slideshow_navi_left");
        let arrowRight = slideshow.querySelector(".slideshow_navi_right");
        arrowLeft.addEventListener("click", function(){
            slideSwitch(-1, slideshow);
        });

        arrowRight.addEventListener("click", function(){
            slideSwitch(1, slideshow);
        });
    }

    function slideSwitch(change, slideshow, extraTime=2000){
        //Für automatische weiterschaltung 
        lastChange = new Date();
        lastChange = lastChange.getTime() + extraTime;

        const dots = slideshow.querySelectorAll(".slideshow_navi_dots__dot");
        const slides = slideshow.querySelectorAll(".slide");

        currentSlide = parseInt(slideshow.querySelector(".slideshow_navi_dots__dot:not([close])").getAttribute("index"));
        slides[currentSlide].setAttribute("close", "");
        dots[currentSlide].setAttribute("close", "");
        currentSlide += change;

        if(currentSlide < 0){
            currentSlide = slides.length-1;
        }else if(currentSlide > slides.length-1){
            currentSlide = 0;
        }

        slides[currentSlide].removeAttribute("close");
        dots[currentSlide].removeAttribute("close");
        console.log(dots[currentSlide].scrollWidth > dots[currentSlide].offsetWidth);
    }
}

function injectCss(){
    const cssUrl = new URL('./slideshow.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return; 
    const cssLink = `<link rel="stylesheet" href="${cssUrl.href}">`;
    document.head.insertAdjacentHTML("beforeend", cssLink);
}
