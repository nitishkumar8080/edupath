const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(window.location.search);
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const allLectures = () => COURSE_DATA.flatMap(batch => batch.subjects.flatMap(subject =>
  subject.lectures.map(lecture => ({...lecture, batch, subject}))
));
const getBatch = id => COURSE_DATA.find(batch => batch.id === id);
const getSubject = (batch, id) => batch?.subjects.find(subject => subject.id === id);
const countLectures = batch => batch.subjects.reduce((sum, subject) => sum + subject.lectures.length, 0);
const setYear = () => { const year = $("#year"); if (year) year.textContent = new Date().getFullYear(); };

function renderHome() {
  const grid = $("#batch-grid");
  if (!grid) return;
  const draw = () => {
    const query = ($("#batch-search")?.value || "").trim().toLowerCase();
    const filtered = COURSE_DATA.filter(batch => `${batch.name} ${batch.category} ${batch.description}`.toLowerCase().includes(query));
    grid.innerHTML = filtered.map((batch, index) => `
      <a class="batch-card ${safe(batch.accent || "blue")}" href="batch.html?batch=${encodeURIComponent(batch.id)}">
        <div class="batch-card-top"><span class="category-tag">${safe(batch.category)}</span><span class="card-arrow">↗</span></div>
        <div class="batch-illustration"><div class="illustration-circle"></div><div class="illustration-book">▤</div><div class="illustration-spark">✳</div><div class="illustration-dot"></div></div>
        <div class="batch-card-content"><h3>${safe(batch.name)}</h3><p>${safe(batch.description)}</p>
          <div class="card-meta"><span>▦ &nbsp;${batch.subjects.length} subjects</span><span>▶ &nbsp;${countLectures(batch)} lectures</span></div>
        </div><div class="card-bottom"><span>Explore batch</span><span class="round-arrow">→</span></div>
      </a>`).join("");
    $("#empty-state").hidden = filtered.length > 0;
  };
  $("#batch-search")?.addEventListener("input", draw);
  draw();
}

function renderBatch() {
  const title = $("#batch-title");
  if (!title) return;
  const batch = getBatch(params.get("batch"));
  if (!batch) { title.textContent = "Batch not found"; $("#batch-description").textContent = "Return home and choose a batch."; return; }
  document.title = `${batch.name} — EduPath`;
  title.textContent = batch.name;
  $("#batch-description").textContent = batch.description;
  $("#subject-count").textContent = `${batch.subjects.length} subjects`;
  $("#lecture-count").textContent = `${countLectures(batch)} lectures`;
  $("#subject-grid").innerHTML = batch.subjects.map((subject, i) => `
    <a class="subject-card" href="subject.html?batch=${encodeURIComponent(batch.id)}&subject=${encodeURIComponent(subject.id)}">
      <div class="subject-card-top"><span class="subject-icon icon-${i % 4}">${safe(subject.icon || "▤")}</span><span class="card-arrow">↗</span></div>
      <h3>${safe(subject.name)}</h3><p>${safe(subject.description || "")}</p>
      <div class="subject-card-bottom"><span>${subject.lectures.length} lectures</span><span>Open subject →</span></div>
    </a>`).join("");
}

function renderSubject() {
  const title = $("#subject-title");
  if (!title) return;
  const batch = getBatch(params.get("batch"));
  const subject = getSubject(batch, params.get("subject"));
  if (!batch || !subject) { title.textContent = "Subject not found"; $("#subject-description").textContent = "Return home and choose a valid subject."; return; }
  document.title = `${subject.name} — EduPath`;
  title.textContent = subject.name;
  $("#subject-description").textContent = subject.description || `Lectures and resources in ${subject.name}.`;
  $("#lecture-count").textContent = `${subject.lectures.length} lectures`;
  $("#subject-breadcrumbs").innerHTML = `<a href="index.html">Home</a><span>/</span><a href="batch.html?batch=${encodeURIComponent(batch.id)}">${safe(batch.name)}</a><span>/</span><span>${safe(subject.name)}</span>`;
  const grid = $("#lecture-list");
  const draw = () => {
    const query = ($("#lecture-search")?.value || "").trim().toLowerCase();
    const filtered = subject.lectures.filter(lecture => `${lecture.title} ${lecture.description}`.toLowerCase().includes(query));
    grid.innerHTML = filtered.map((lecture, i) => `
      <a class="lecture-row" href="lecture.html?batch=${encodeURIComponent(batch.id)}&subject=${encodeURIComponent(subject.id)}&lecture=${encodeURIComponent(lecture.id)}">
        <span class="lecture-number">${String(i + 1).padStart(2, "0")}</span><span class="lecture-play">▶</span>
        <span class="lecture-info"><strong>${safe(lecture.title)}</strong><small>${safe(lecture.description || "Video lesson and study resources")}</small></span>
        <span class="lecture-duration">${safe(lecture.duration || "Lecture")}</span><span class="row-arrow">↗</span>
      </a>`).join("");
    $("#lecture-empty").hidden = filtered.length > 0;
  };
  $("#lecture-search")?.addEventListener("input", draw);
  draw();
}

function renderLecture() {
  const title = $("#lecture-title");
  if (!title) return;
  const batch = getBatch(params.get("batch"));
  const subject = getSubject(batch, params.get("subject"));
  const lecture = subject?.lectures.find(item => item.id === params.get("lecture"));
  if (!batch || !subject || !lecture) { title.textContent = "Lecture not found"; $("#lecture-description").textContent = "Return home and choose a valid lecture."; return; }
  document.title = `${lecture.title} — EduPath`;
  title.textContent = lecture.title;
  $("#lecture-description").textContent = lecture.description || "";
  $("#video-heading").textContent = lecture.title;
  $("#lecture-breadcrumbs").innerHTML = `<a href="index.html">Home</a><span>/</span><a href="batch.html?batch=${encodeURIComponent(batch.id)}">${safe(batch.name)}</a><span>/</span><a href="subject.html?batch=${encodeURIComponent(batch.id)}&subject=${encodeURIComponent(subject.id)}">${safe(subject.name)}</a><span>/</span><span>Lecture</span>`;
  const pdf = $("#pdf-link"), video = $("#video-link"), frame = $("#video-frame");
  if (lecture.pdfUrl) { pdf.href = lecture.pdfUrl; pdf.classList.remove("disabled-link"); pdf.setAttribute("aria-label", "Open lecture PDF notes"); }
  else { pdf.href = "#"; pdf.classList.add("disabled-link"); pdf.addEventListener("click", e => { e.preventDefault(); alert("PDF link not added yet. Add pdfUrl in data.js."); }); }

  if (lecture.videoUrl) {
    video.href = lecture.videoUrl;
    video.classList.remove("disabled-link");

    const match = lecture.videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );

    if (match) {
      frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(match[1])}" title="${safe(lecture.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;
    } else {
      frame.innerHTML = `<iframe src="${safe(lecture.videoUrl)}" title="${safe(lecture.title)}" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe>`;
    }
  } else {
    video.href = "#";
    video.classList.add("disabled-link");
    video.addEventListener("click", e => {
      e.preventDefault();
      alert("Video link not added yet. Add videoUrl in data.js.");
    });
  }
