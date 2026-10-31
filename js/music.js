/* =====================================================================
   music.js - NHẠC NỀN TỰ TẠO + NÚT BẬT/TẮT
   ---------------------------------------------------------------------
   Không dùng file mp3. Giai điệu được TẠO RA bằng Web Audio API
   (bộ tổng hợp âm thanh của trình duyệt): vừa không vướng bản quyền,
   vừa không phải tải file nặng.

   Nhạc gồm:
     - Giai điệu: 16 nốt thang âm ngũ cung giọng Rê trưởng, nghe êm, vui.
     - Hợp âm nền: 4 hợp âm D - Bm - G - A, mỗi hợp âm kéo dài 4 nhịp.
     - Nốt trầm: đánh theo gốc hợp âm.
   Trình duyệt chỉ cho phát âm thanh SAU khi người dùng bấm/chạm,
   nên nhạc bắt đầu khi khách mở phong bì (xem envelope.js).

   Muốn dùng file nhạc riêng: thay phần "engine" bằng thẻ <audio> hoặc
   new Audio("music/bai-hat.mp3") với loop = true.
   ===================================================================== */
(function () {
  "use strict";
  var $ = TetApp.utils.$;

  /* ---------------------------------------------------------------
     PHẦN 1: ENGINE - tạo âm thanh
     --------------------------------------------------------------- */
  var ctx = null;      // AudioContext: "mixer" của trình duyệt (tạo khi cần)
  var master = null;   // núm âm lượng tổng (GainNode)
  var timer = null;    // bộ hẹn giờ xếp lịch nốt
  var step = 0;        // đang ở nốt thứ mấy trong điệp khúc (0..15 rồi lặp)
  var nextTime = 0;    // thời điểm (giây, theo đồng hồ âm thanh) của nốt kế tiếp
  var playing = false; // đang phát?

  var BEAT = 0.62;     // độ dài một nhịp (giây). Tăng số này = nhạc chậm hơn.

  // Bảng tần số (Hz) của các nốt dùng trong bài.
  var NOTE = {
    B2: 123.47, D3: 146.83, E3: 164.81, "F#3": 185.00, G3: 196.00, A3: 220.00,
    B3: 246.94, D4: 293.66, "F#4": 369.99, A4: 440.00, B4: 493.88,
    D5: 587.33, E5: 659.25, "F#5": 739.99, A5: 880.00, B5: 987.77, D6: 1174.66
  };

  // Giai điệu 16 nốt (lặp lại mãi)
  var MELODY = ["A4", "D5", "F#5", "A5", "F#5", "D5", "E5", "F#5",
                "B4", "D5", "F#5", "B5", "A5", "F#5", "E5", "D5"];

  // 4 hợp âm nền, mỗi hợp âm gồm 3 nốt: [D] [Bm] [G] [A]
  var CHORDS = [["D3", "A3", "F#4"], ["B2", "F#3", "D4"], ["G3", "B3", "D4"], ["A3", "D4", "F#4"]];

  /**
   * Gảy một nốt kiểu đàn "pluck": âm to nhanh rồi tắt dần.
   * @param freq tần số Hz   @param t thời điểm bắt đầu   @param dur độ dài (giây)
   * @param vol  âm lượng đỉnh (0..1)
   */
  function pluck(freq, t, dur, vol) {
    var o1 = ctx.createOscillator();   // sóng tam giác: âm chính
    var o2 = ctx.createOscillator();   // sóng sin cao hơn 1 quãng tám: thêm độ sáng
    var g = ctx.createGain();          // điều khiển độ to theo thời gian
    o1.type = "triangle"; o2.type = "sine";
    o1.frequency.value = freq; o2.frequency.value = freq * 2;

    g.gain.setValueAtTime(0.0001, t);                        // bắt đầu gần như im
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);     // vút lên rất nhanh
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);    // tắt dần

    o1.connect(g); o2.connect(g); g.connect(master);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);        // dừng hẳn để giải phóng bộ nhớ
  }

  /** Âm nền (pad): các nốt sin kéo dài, vào chậm, ra chậm. */
  function chordPad(freqs, t, dur) {
    freqs.forEach(function (f) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.5);         // vào dần trong 0.5s
      g.gain.linearRampToValueAtTime(0.0001, t + dur);       // ra dần
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  /**
   * Xếp lịch các nốt sắp tới (nhìn trước ~0.8 giây).
   * Gọi liên tục mỗi 0.2 giây: cách này giúp nhạc đều nhịp, không bị giật
   * dù trình duyệt bận việc khác (khác với dùng setTimeout cho từng nốt).
   */
  function schedule() {
    while (nextTime < ctx.currentTime + 0.8) {
      var i = step % 16;                                   // vị trí trong giai điệu
      if (i % 4 === 0) chordPad(CHORDS[i / 4], nextTime, BEAT * 4.2); // đổi hợp âm mỗi 4 nốt
      pluck(NOTE[MELODY[i]], nextTime, BEAT * 1.6, 0.11);  // nốt giai điệu
      if (i % 2 === 0) {                                   // nốt trầm, cách một nốt
        pluck(NOTE[CHORDS[Math.floor(i / 4)][0]], nextTime, BEAT * 1.2, 0.07);
      }
      nextTime += BEAT;
      step++;
    }
  }

  /** Bắt đầu phát (có hiệu ứng nhỏ dần lên trong 1.2 giây). Trả về Promise<boolean>. */
  function start() {
    var AC = window.AudioContext || window.webkitAudioContext; // webkit: Safari cũ
    if (!AC) return Promise.resolve(false);                    // trình duyệt không hỗ trợ

    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);                         // nối ra loa
      nextTime = ctx.currentTime + 0.1;
    }

    // resume(): bỏ trạng thái "đang chờ" mà trình duyệt đặt cho âm thanh chưa được phép.
    return ctx.resume().then(function () {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.2); // âm lượng lên dần
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
      if (!timer) timer = setInterval(schedule, 200);
      schedule();
      playing = true;
      return true;
    }, function () { return false; });
  }

  /** Dừng phát (nhỏ dần trong 0.5 giây rồi tạm dừng AudioContext để tiết kiệm pin). */
  function stop() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    clearInterval(timer);
    timer = null;
    playing = false;
    setTimeout(function () { if (!playing && ctx) ctx.suspend(); }, 600);
  }

  /* ---------------------------------------------------------------
     PHẦN 2: NÚT BẤM NỔI Ở GÓC
     --------------------------------------------------------------- */
  var button = null;

  /** Cập nhật hình dạng nút theo trạng thái phát/tắt. */
  function syncButton() {
    button.classList.toggle("on", playing);                    // class "on" -> hiện thanh nhảy
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute("aria-label", playing ? "Tắt nhạc nền" : "Bật nhạc nền");
  }

  /** Gắn sự kiện cho nút (gọi một lần khi trang tải). */
  function init() {
    button = $("music");
    button.addEventListener("click", function () {
      if (playing) { stop(); syncButton(); }
      else { start().then(syncButton); }
    });
  }

  /** Hiện nút (ban đầu bị ẩn) - envelope.js gọi khi phong bì được mở. */
  function showButton() { button.hidden = false; }

  /** Bắt đầu phát rồi cập nhật nút - envelope.js gọi khi phong bì được mở. */
  function startAndSync() { return start().then(syncButton); }

  TetApp.music = { init: init, showButton: showButton, startAndSync: startAndSync };
})();
