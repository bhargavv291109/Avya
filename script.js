const canvas=document.getElementById("hero-canvas");
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);camera.position.z=8;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const group=new THREE.Group();scene.add(group);
const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(2.15,2),new THREE.MeshStandardMaterial({color:0x111414,metalness:.88,roughness:.2}));group.add(orb);
const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(2.3,2),new THREE.MeshBasicMaterial({color:0xb8ff4d,wireframe:true,transparent:true,opacity:.17}));group.add(wire);
const particles=new THREE.BufferGeometry(),count=900,pos=new Float32Array(count*3);
for(let i=0;i<count*3;i++)pos[i]=(Math.random()-.5)*18;
particles.setAttribute("position",new THREE.BufferAttribute(pos,3));
scene.add(new THREE.Points(particles,new THREE.PointsMaterial({color:0xb8ff4d,size:.018,transparent:true,opacity:.5})));
scene.add(new THREE.AmbientLight(0xffffff,.35));
const l1=new THREE.PointLight(0xb8ff4d,18,20);l1.position.set(4,3,5);scene.add(l1);
const l2=new THREE.PointLight(0x6688ff,10,15);l2.position.set(-5,-3,3);scene.add(l2);
let mx=0,my=0;addEventListener("pointermove",e=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2});
function animate(){requestAnimationFrame(animate);group.rotation.y+=.0025;group.rotation.x+=.001;wire.rotation.y-=.003;group.position.x+=((mx*.55)-group.position.x)*.025;group.position.y+=((-my*.35)-group.position.y)*.025;renderer.render(scene,camera)}animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener("load",()=>setTimeout(()=>{document.getElementById("loader").style.opacity="0";setTimeout(()=>document.getElementById("loader").remove(),700)},700));

document.querySelector(".menu").addEventListener("click",()=>{const n=document.querySelector(".nav nav"),open=n.style.display==="flex";n.style.display=open?"none":"flex";if(!open){n.style.position="absolute";n.style.top="82px";n.style.left="0";n.style.right="0";n.style.padding="25px 7vw";n.style.background="#0a0a0b";n.style.flexDirection="column";n.style.gap="20px"}});
document.querySelectorAll(".select-card").forEach(c=>c.addEventListener("mouseenter",()=>{document.body.style.cursor="crosshair"}));
document.querySelectorAll(".select-card").forEach(c=>c.addEventListener("mouseleave",()=>{document.body.style.cursor="default"}));

const counters=document.querySelectorAll("[data-count]");let counted=false;
const io=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!counted){counted=true;counters.forEach(el=>{const target=+el.dataset.count;let n=0;const step=Math.max(1,Math.ceil(target/35));const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t)}el.textContent=n+"+"},35)})}},{threshold:.4});
if(counters.length)io.observe(document.querySelector(".stats-strip"));

// Review form: prepare an honest review for AVYA to verify through WhatsApp.
// This front-end-only site does not store, fabricate, or auto-publish testimonials.


// AVYA REVIEW SYSTEM — real backend submission + public approved reviews
const reviewForm = document.getElementById("review-form");
const reviewStatus = document.getElementById("review-status");
const reviewList = document.getElementById("approved-review-list");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function stars(rating) {
  const n = Number(rating);
  return "★".repeat(n) + "☆".repeat(5 - n);
}

async function loadApprovedReviews() {
  if (!reviewList) return;
  try {
    const res = await fetch("/api/reviews");
    const reviews = await res.json();
    if (!reviews.length) {
      reviewList.innerHTML = `
        <article class="empty-review">
          <h4>No approved reviews yet.</h4>
          <p>Be one of the first real AVYA clients to share your experience.</p>
        </article>`;
      return;
    }
    reviewList.innerHTML = reviews.map(r => `
      <article class="quote-card ${r.featured ? "featured-review" : ""}">
        <div class="quote-stars" aria-label="${r.rating} out of 5">${stars(r.rating)}</div>
        <p>“${escapeHTML(r.review)}”</p>
        <div class="quote-meta">
          <strong>${escapeHTML(r.name)}</strong>
          <span>${escapeHTML(r.service)}</span>
        </div>
      </article>
    `).join("");
  } catch {
    reviewList.innerHTML = `
      <article class="empty-review">
        <h4>Reviews are temporarily unavailable.</h4>
        <p>Please try again shortly.</p>
      </article>`;
  }
}

if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("review-name").value.trim();
    const service = document.getElementById("review-service").value;
    const rating = Number(document.getElementById("review-rating").value);
    const review = document.getElementById("review-text").value.trim();
    const consent = document.getElementById("review-consent").checked;

    if (!consent) return;
    reviewStatus.textContent = "Submitting your review…";
    reviewStatus.className = "review-status";

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name, service, rating, review, consent})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit review.");
      reviewStatus.textContent = "✓ Submitted! Your review is pending AVYA approval.";
      reviewStatus.className = "review-status success";
      reviewForm.reset();
    } catch (err) {
      reviewStatus.textContent = "✕ " + err.message;
      reviewStatus.className = "review-status error";
    }
  });
}

loadApprovedReviews();
