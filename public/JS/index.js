// For The Animation
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("unhide");
    }
  });
});
const hiddenElements = document.querySelectorAll(".hide");
hiddenElements.forEach((el) => observer.observe(el));


// For the Second video
function playVideo() {
  document.getElementById('playButton').classList.add('hidden');
  
  let video = document.getElementById('videoPlayer');
  video.autoplay = true;
}