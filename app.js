/* =========================
File: app.js
- モバイルナビ
- フッター年
- 概算見積（estimate.htmlのみ）
- グレード可視化（estimate.htmlのみ）
- 見積条件の保存（localStorage）
- contact.html の mailto に見積条件を自動添付（localStorageから）
========================= */
(() => {
    // ===== Utils =====
    const yen = (n) => {
        if (!Number.isFinite(n)) return "—";
        return "¥" + Math.round(n).toLocaleString("ja-JP");
    };

    const clampNonNeg = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, n);
    };

    const toDataUri = (svgText) => {
        return (
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText)
        );
    };

    const safeJsonParse = (s, fallback = null) => {
        try {
            return JSON.parse(s);
        } catch {
            return fallback;
        }
    };

    const LS_KEY = "tanimoto_estimate_v1";

    // ===== Header: mobile nav =====
    const navToggle = document.getElementById("navToggle");
    const nav = document.getElementById("nav");

    const setNavOpen = (open) => {
        if (!navToggle || !nav) return;
        nav.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        navToggle.setAttribute(
            "aria-label",
            open ? "メニューを閉じる" : "メニューを開く",
        );
    };

    if (navToggle && nav) {
        navToggle.addEventListener("click", () => {
            const open = !nav.classList.contains("is-open");
            setNavOpen(open);
        });

        nav.querySelectorAll("a").forEach((a) => {
            a.addEventListener("click", () => setNavOpen(false));
        });

        document.addEventListener("click", (e) => {
            const isInside =
                nav.contains(e.target) || navToggle.contains(e.target);
            if (!isInside) setNavOpen(false);
        });
    }

    // ===== Footer year =====
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // =========================
    // Estimate (estimate.html only)
    // =========================
    const form = document.getElementById("estimateForm");
    const resetBtn = document.getElementById("resetEstimate");

    const totalEl = document.getElementById("totalPrice");
    const baseEl = document.getElementById("basePrice");
    const otherEl = document.getElementById("otherPrice");
    const waterEl = document.getElementById("waterPrice");
    const optEl = document.getElementById("optPrice");

    const gradeMetaEl = document.getElementById("gradeMeta");
    const gradeImgEl = document.getElementById("gradeImage");
    const gradeCapEl = document.getElementById("gradeCaption");

    // 坪単価（万円/坪）: 構造 × 階数
    const tsuboUnit = {
        wood: { 1: 90, 2: 85 },
        steel: { 1: 140, 2: 150 },
        rc: { 1: 150, 2: 150 },
    };

    // 水回り（万円）
    const water = {
        bath: { C: 60, B: 120, A: 150 },
        toilet: { C: 10, B: 30, A: 60 },
        kitchen: { C: 60, B: 120, A: 150 },
        wash: { C: 5, B: 30, A: 50 },
    };

    // オプション（万円）
    const opt = {
        solarMan: 250,
        garage: { 0: 0, 1: 30, 2: 150, 3: 350 },
        exteriorUnitManPerM2: { 0: 0, C: 2, B: 8.5, A: 20 },
        camera: { 0: 0, C: 20, B: 35, A: 50 },

        built_in: { 0: 0, C: 30, B: 120, A: 150 },
        aircon: { 0: 0, C: 8, B: 15, A: 30 },
        floorheatUnitManPerM2: { 0: 0, B: 3, A: 6 },
    };

    const landFactor = {
        normal: 1.0,
        light: 1.25,
        heavy: 1.6,
    };

    const getFormData = (formEl) => {
        const fd = new FormData(formEl);
        const solar = fd.get("solar") ? 1 : 0;

        return {
            area: fd.get("area"),
            floors: fd.get("floors"),
            structure: fd.get("structure"),
            roof: fd.get("roof"),

            bath: fd.get("bath"),
            toilet: fd.get("toilet"),
            kitchen: fd.get("kitchen"),
            wash: fd.get("wash"),

            solar,
            garage: fd.get("garage"),
            exterior_grade: fd.get("exterior_grade"),
            exterior_m2: fd.get("exterior_m2"),
            camera: fd.get("camera"),

            built_in: fd.get("built_in"),
            aircon: fd.get("aircon"),
            floorheat_grade: fd.get("floorheat_grade"),
            floorheat_m2: fd.get("floorheat_m2"),

            land: fd.get("land"),
        };
    };

    const calcEstimate = (d) => {
        const area = clampNonNeg(d.area);
        const floors = String(d.floors || "1");
        const structure = d.structure;
        const land = d.land;

        const unitMan = tsuboUnit?.[structure]?.[floors];
        if (!Number.isFinite(unitMan) || area <= 0) return null;

        const baseMan = area * unitMan;
        const otherMan = baseMan * 0.15 * (landFactor[land] ?? 1.0);

        const bathMan = water.bath?.[d.bath] ?? 0;
        const toiletMan = water.toilet?.[d.toilet] ?? 0;
        const kitchenMan = water.kitchen?.[d.kitchen] ?? 0;
        const washMan = water.wash?.[d.wash] ?? 0;
        const waterMan = bathMan + toiletMan + kitchenMan + washMan;

        const solarMan = d.solar ? opt.solarMan : 0;

        const garageKey = String(d.garage ?? "0");
        const garageMan = opt.garage?.[garageKey] ?? 0;

        const exteriorGrade = d.exterior_grade ?? "0";
        const exteriorM2 = clampNonNeg(d.exterior_m2);
        const exteriorUnit = opt.exteriorUnitManPerM2?.[exteriorGrade] ?? 0;
        const exteriorMan = exteriorUnit * exteriorM2;

        const cameraGrade = d.camera ?? "0";
        const cameraMan = opt.camera?.[cameraGrade] ?? 0;

        const builtKey = d.built_in ?? "0";
        const builtMan = opt.built_in?.[builtKey] ?? 0;

        const airconKey = d.aircon ?? "0";
        const airconMan = opt.aircon?.[airconKey] ?? 0;

        const floorheatGrade = d.floorheat_grade ?? "0";
        const floorheatM2 = clampNonNeg(d.floorheat_m2);
        const floorheatUnit = opt.floorheatUnitManPerM2?.[floorheatGrade] ?? 0;
        const floorheatMan = floorheatUnit * floorheatM2;

        const optMan =
            solarMan +
            garageMan +
            exteriorMan +
            cameraMan +
            builtMan +
            airconMan +
            floorheatMan;

        const totalMan = baseMan + otherMan + waterMan + optMan;

        return {
            baseYen: baseMan * 10000,
            otherYen: otherMan * 10000,
            waterYen: waterMan * 10000,
            optYen: optMan * 10000,
            totalYen: totalMan * 10000,
        };
    };

    const renderEstimate = (r) => {
        if (!totalEl || !baseEl || !otherEl || !waterEl || !optEl) return;
        if (!r) {
            totalEl.textContent = "—";
            baseEl.textContent = "—";
            otherEl.textContent = "—";
            waterEl.textContent = "—";
            optEl.textContent = "—";
            return;
        }
        totalEl.textContent = yen(r.totalYen);
        baseEl.textContent = yen(r.baseYen);
        otherEl.textContent = yen(r.otherYen);
        waterEl.textContent = yen(r.waterYen);
        optEl.textContent = yen(r.optYen);
    };

    // Grade preview
    const gradeSvg = (grade, toneLabel) => {
        const title = grade === "0" ? "NONE" : `GRADE ${grade}`;
        const sub = toneLabel;

        const a = grade === "A";
        const b = grade === "B";
        const none = grade === "0";

        const c1 = none ? "#0c0f12" : a ? "#d6b56d" : b ? "#7aa7c7" : "#2b3a46";
        const c2 = none ? "#11161b" : a ? "#6d5530" : b ? "#1b2a36" : "#0f151b";

        return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${c2}" stop-opacity="0.95"/>
    </linearGradient>
    <radialGradient id="r" cx="70%" cy="20%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="600" fill="url(#g)"/>
  <rect width="1200" height="600" fill="url(#r)"/>

  <rect x="60" y="60" width="1080" height="480" rx="36" fill="rgba(0,0,0,0.18)" stroke="rgba(238,242,246,0.18)" stroke-width="2"/>
  <text x="100" y="160" fill="rgba(238,242,246,0.95)" font-size="54" font-family="system-ui, -apple-system, Segoe UI, Arial" font-weight="800" letter-spacing="4">
    ${title}
  </text>
  <text x="102" y="220" fill="rgba(238,242,246,0.75)" font-size="26" font-family="system-ui, -apple-system, Segoe UI, Arial" font-weight="700" letter-spacing="2">
    ${sub}
  </text>

  <g opacity="0.9">
    <rect x="100" y="280" width="260" height="180" rx="24" fill="rgba(238,242,246,0.08)" stroke="rgba(238,242,246,0.16)"/>
    <rect x="390" y="280" width="260" height="180" rx="24" fill="rgba(238,242,246,0.08)" stroke="rgba(238,242,246,0.16)"/>
    <rect x="680" y="280" width="360" height="180" rx="24" fill="rgba(238,242,246,0.08)" stroke="rgba(238,242,246,0.16)"/>
  </g>

  <text x="118" y="330" fill="rgba(238,242,246,0.75)" font-size="20" font-family="system-ui, -apple-system, Segoe UI, Arial" font-weight="700">質感</text>
  <text x="408" y="330" fill="rgba(238,242,246,0.75)" font-size="20" font-family="system-ui, -apple-system, Segoe UI, Arial" font-weight="700">設備</text>
  <text x="698" y="330" fill="rgba(238,242,246,0.75)" font-size="20" font-family="system-ui, -apple-system, Segoe UI, Arial" font-weight="700">体験</text>
</svg>`;
    };

    const gradeToneLabel = (grade) => {
        if (grade === "A") return "上質・素材感・満足度を重視";
        if (grade === "B") return "バランス重視・標準より少し良い";
        if (grade === "C") return "必要十分・コスパ重視";
        return "オプションなし / 標準";
    };

    const setGradePreview = (itemName, gradeValue) => {
        if (!gradeImgEl || !gradeCapEl || !gradeMetaEl) return;

        const g = String(gradeValue ?? "0");
        const label = g === "0" ? "なし" : `グレード${g}`;
        const tone = gradeToneLabel(g);

        gradeMetaEl.textContent = `対象：${itemName}`;
        gradeCapEl.textContent = `${itemName}：${label}（イメージ）`;

        const svg = gradeSvg(g, tone);
        gradeImgEl.src = toDataUri(svg);
    };

    const bindGradePreview = () => {
        const targets = document.querySelectorAll(
            'select[data-preview="grade"]',
        );
        targets.forEach((sel) => {
            sel.addEventListener("change", () => {
                const item =
                    sel.getAttribute("data-preview-item") || "グレード";
                setGradePreview(item, sel.value);
            });
        });

        const first = document.querySelector('select[data-preview="grade"]');
        if (first) {
            const item = first.getAttribute("data-preview-item") || "グレード";
            setGradePreview(item, first.value);
        } else {
            if (gradeMetaEl)
                gradeMetaEl.textContent = "右：グレードを選ぶと表示されます";
            if (gradeCapEl) gradeCapEl.textContent = "—";
        }
    };

    // Save estimate to localStorage (for contact mailto)
    const saveEstimateSnapshot = (data, result) => {
        const payload = {
            savedAt: new Date().toISOString(),
            data,
            result,
        };
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(payload));
        } catch {
            // ignore
        }
    };

    const loadEstimateSnapshot = () => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            return safeJsonParse(raw, null);
        } catch {
            return null;
        }
    };

    // Live update
    const updateLive = () => {
        if (!form) return;
        const d = getFormData(form);
        const r = calcEstimate(d);
        renderEstimate(r);
        saveEstimateSnapshot(d, r);
    };

    if (form) {
        // initial
        updateLive();

        form.addEventListener("input", updateLive);
        form.addEventListener("change", updateLive);

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            updateLive();
            const resultBox = document.getElementById("estimateResult");
            if (resultBox) {
                resultBox.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });
    }

    if (resetBtn && form) {
        resetBtn.addEventListener("click", () => {
            form.reset();

            const area = document.getElementById("area");
            if (area && !area.value) area.value = "30";

            const ext = document.getElementById("exterior_m2");
            if (ext && (ext.value === "" || ext.value == null))
                ext.value = "50";

            const fh = document.getElementById("floorheat_m2");
            if (fh && (fh.value === "" || fh.value == null)) fh.value = "0";

            updateLive();
            bindGradePreview();
        });
    }

    // Bind grade preview if on estimate page
    if (document.querySelector('select[data-preview="grade"]')) {
        bindGradePreview();
    }

    // =========================
    // Contact (mailto)
    // =========================
    const contactForm = document.getElementById("contactForm");

    const labelMaps = {
        floors: (v) => (String(v) === "1" ? "平屋" : "2階建て"),
        structure: (v) =>
            v === "wood"
                ? "木造"
                : v === "steel"
                  ? "鉄骨造"
                  : "鉄筋コンクリート造",
        roof: (v) =>
            v === "kawara"
                ? "瓦"
                : v === "bankin"
                  ? "板金"
                  : v === "colorbest"
                    ? "カラーベスト"
                    : "その他",
        land: (v) =>
            v === "normal"
                ? "標準（造成なし想定）"
                : v === "light"
                  ? "軽い造成あり"
                  : "造成・擁壁など大",
        garage: (v) =>
            String(v) === "1"
                ? "1台"
                : String(v) === "2"
                  ? "2台"
                  : String(v) === "3"
                    ? "3台"
                    : "なし",
        grade: (v) => (String(v) === "0" ? "なし" : `グレード${v}`),
        onoff: (v) => (v ? "有" : "無"),
    };

    const buildEstimateTextFromSnapshot = (snap) => {
        if (!snap || !snap.data) return "";
        const d = snap.data;
        const r = snap.result;

        const txt =
            "\n\n---\n【概算見積 条件】\n" +
            `延床面積：${d.area} 坪\n` +
            `階数：${labelMaps.floors(d.floors)}\n` +
            `構造：${labelMaps.structure(d.structure)}\n` +
            `屋根：${labelMaps.roof(d.roof)}\n` +
            `土地条件：${labelMaps.land(d.land)}\n\n` +
            `【水回り】\n` +
            `お風呂場：${labelMaps.grade(d.bath)}\n` +
            `トイレ：${labelMaps.grade(d.toilet)}\n` +
            `キッチン：${labelMaps.grade(d.kitchen)}\n` +
            `洗面台：${labelMaps.grade(d.wash)}\n\n` +
            `【屋外オプション】\n` +
            `太陽光：${labelMaps.onoff(d.solar)}\n` +
            `ガレージ：${labelMaps.garage(d.garage)}\n` +
            `外構：${labelMaps.grade(d.exterior_grade)} / ${d.exterior_m2} ㎡\n` +
            `監視カメラ：${labelMaps.grade(d.camera)}\n\n` +
            `【屋内オプション】\n` +
            `造作物：${labelMaps.grade(d.built_in)}\n` +
            `エアコン：${labelMaps.grade(d.aircon)}\n` +
            `床暖房：${labelMaps.grade(d.floorheat_grade)} / ${d.floorheat_m2} ㎡\n\n` +
            `概算総額（目安）：${r ? yen(r.totalYen) : "—"}\n`;

        return txt;
    };

    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("name")?.value?.trim() ?? "";
            const email = document.getElementById("email")?.value?.trim() ?? "";
            const category = document.getElementById("category")?.value ?? "";
            const message =
                document.getElementById("message")?.value?.trim() ?? "";

            // Pull estimate snapshot from localStorage (even if not on estimate page)
            const snap = loadEstimateSnapshot();
            const estimateText = buildEstimateTextFromSnapshot(snap);

            const subject = encodeURIComponent(
                `【たにもとのいえ】お問合せ（${category}）`,
            );
            const body = encodeURIComponent(
                `お名前：${name}\n` +
                    `メール：${email}\n` +
                    `内容：${category}\n\n` +
                    `メッセージ：\n${message}\n` +
                    estimateText,
            );

            const to = "tanimotonoie@gmail.com";
            window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        });
    }
})();
